import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Effect } from "effect";
import type { GameState } from "@cherelynnandkevin/client-api-contract/games/http";
import { AppHttpClient, baseUrl } from "@/platform/http.client.ts";
import { cn } from "@/lib/utils";
import {
  CardHeading,
  PolaroidCard,
  SectionHeading,
} from "../wedding/presentation";
import { GamesKeyboard, tileFeedback } from "./games.keyboard.tsx";

const button =
  "min-h-11 rounded-xl border border-border px-4 py-2 font-sans text-sm transition hover:bg-game-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:opacity-50 disabled:cursor-not-allowed";
const actionButton = cn(
  button,
  "rounded-none px-4 py-3 font-bold uppercase tracking-[0.12em] text-xs",
);
const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
function GameIcon({ game }: { game: "wordle" | "connections" }) {
  const rows =
    game === "wordle"
      ? [
          ["#77796d", "#a8842c", "#77796d", "#56651f", "#77796d"],
          ["#56651f", "#a8842c", "#56651f", "#56651f", "#77796d"],
          Array(5).fill("#56651f"),
          Array(5).fill("#e9ecd9"),
          Array(5).fill("#e9ecd9"),
        ]
      : ["#d8bf72", "#9eaf7a", "#8fa9bc", "#aa96b6"].map((color) =>
          Array(4).fill(color),
        );
  const step = game === "wordle" ? 9 : 11.5;
  return (
    <svg
      className="block h-12 w-12"
      width="48"
      height="48"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      {rows.flatMap((row, y) =>
        row.map((fill, x) => (
          <rect
            key={`${y}-${x}`}
            x={2 + x * step}
            y={2 + y * step}
            width={step - 2}
            height={step - 2}
            fill={fill}
          />
        )),
      )}
    </svg>
  );
}
function GameClock({
  elapsedMs,
  running,
  receivedAt,
}: {
  elapsedMs: number | null;
  running: boolean;
  receivedAt: number;
}) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    setNow(performance.now());
    if (!running || elapsedMs === null) return;
    const timer = window.setInterval(() => setNow(performance.now()), 1000);
    return () => window.clearInterval(timer);
  }, [elapsedMs, running, receivedAt]);
  const extra = running ? Math.max(0, now - receivedAt) : 0;
  return (
    <p className="font-sans text-xs tabular-nums">
      {elapsedMs === null
        ? "Time unavailable for this earlier attempt"
        : `Time · ${formatTime(elapsedMs + extra)}${running ? "" : " · paused"}`}
    </p>
  );
}
const GamesContext = createContext<ReactNode>(null);
export const GamesPanel = () =>
  useContext(GamesContext) ?? (
    <main className="min-h-screen bg-background p-6">
      <Link to="/" hash="wedding-games">
        ← Back to games
      </Link>
      <p className="mt-6">Sign in to play. Games are unavailable in preview.</p>
    </main>
  );
export const GamesProvider = ({
  firstName,
  lastName,
  children,
}: {
  firstName: string;
  lastName: string;
  children: ReactNode;
}) => {
  const pathname = useLocation({ select: (location) => location.pathname });
  const active =
    pathname === "/games/wordle"
      ? "wordle"
      : pathname === "/games/connections"
        ? "connections"
        : null;
  const [state, setState] = useState<GameState | null>(null);
  // This anchor belongs to the snapshot, not the mounted route/clock.
  const [receivedAt, setReceivedAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{
    pathname: string;
    message: string;
  } | null>(null);
  const error = failure?.pathname === pathname ? failure.message : "";
  const [notice, setNotice] = useState("");
  const [guess, setGuess] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [wordOrder, setWordOrder] = useState<string[]>([]);
  const gameHeading = useRef<HTMLHeadingElement>(null);
  const pending = useRef(false);
  const generation = useRef(0);
  const request = async (
    action: "state" | "start" | "submit",
    game?: "wordle" | "connections",
    words: string[] = [],
  ) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setFailure(null);
    setNotice("");
    const token = generation.current;
    try {
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const client = yield* AppHttpClient;
          const payload = { firstName, lastName };
          if (action === "state") {
            const current = yield* client.games.state({ payload });
            // Older servers still require enrollment. Join once, without opening a game.
            return current.joined
              ? current
              : yield* client.games.join({ payload });
          }
          if (action === "start")
            return yield* client.games.start({
              payload: {
                ...payload,
                expectedRevision: state?.revision ?? 0,
                game: game!,
                words: [],
              },
            });
          return yield* client.games.submit({
            payload: {
              ...payload,
              expectedRevision: state?.revision ?? 0,
              game: game!,
              words,
            },
          });
        }).pipe(Effect.provide(AppHttpClient.layer)),
      );
      if (token !== generation.current) return;
      if (action === "submit" && game === "connections")
        setNotice(
          result.revision === state?.revision
            ? "You already tried that group. It hasn't used another mistake."
            : result.connections.mistakes > (state?.connections.mistakes ?? 0)
              ? "Not a connection. Try a different group."
              : "Connection found!",
        );
      setReceivedAt(performance.now());
      setState(result);
      setGuess("");
      setSelected([]);
    } catch {
      if (token === generation.current)
        setFailure({
          pathname,
          message:
            "Couldn't save or load your game. Retry to sync your progress. Wordle guesses must be valid words.",
        });
    } finally {
      if (token === generation.current) {
        pending.current = false;
        setBusy(false);
      }
    }
  };
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (stopTimer.current !== null) clearTimeout(stopTimer.current);
    void request("state");
    return () => {
      stopTimer.current = setTimeout(() => {
        generation.current++;
        pending.current = false;
      }, 0);
    };
  }, [firstName, lastName]);
  // A failure blocks retries only on that visit. Late failures from another
  // route remain scoped to their initiating pathname and cannot block this one.
  useEffect(() => {
    setFailure(null);
  }, [pathname]);
  const [visible, setVisible] = useState(
    () => document.visibilityState === "visible",
  );
  // Leaving the game page, hiding the tab or closing it pauses the clock.
  // keepalive lets the pause reach the server while the page unloads.
  useEffect(() => {
    if (!active) return;
    const pause = () => {
      void fetch(`${baseUrl}/games/pause`, {
        method: "POST",
        keepalive: true,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          expectedRevision: 0,
          game: active,
          words: [],
        }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((paused: GameState | null) => {
          if (!paused) return;
          setReceivedAt(performance.now());
          setState((current) =>
            !current || paused.revision >= current.revision ? paused : current,
          );
        })
        .catch(() => {});
    };
    const onVisibility = () => {
      const isVisible = document.visibilityState === "visible";
      setVisible(isVisible);
      if (isVisible) void request("state");
      else pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", pause);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", pause);
      pause();
    };
  }, [active, firstName, lastName]);
  // Only a committed, visible route opens or resumes a game; preload and the
  // home cards never start clocks.
  useEffect(() => {
    if (
      active &&
      visible &&
      state?.joined &&
      (state[active].status === "not-started" || state[active].paused) &&
      !busy &&
      !error
    )
      void request("start", active);
  }, [active, visible, state, busy, error]);
  const wordleDone = state?.wordle.status === "completed";
  const connectionsDone = state?.connections.status === "completed";
  useEffect(() => {
    if (active && state) gameHeading.current?.focus();
  }, [active, state !== null]);
  const typeKey = (key: string) => {
    if (busy || wordleDone || !state?.joined) return;
    if (key === "Backspace") setGuess((current) => current.slice(0, -1));
    else if (key === "Enter") {
      if (guess.length === 5) void request("submit", "wordle", [guess]);
    } else if (/^[a-z]$/i.test(key))
      setGuess((current) => (current + key.toUpperCase()).slice(0, 5));
  };
  const connectionWords = state
    ? [
        ...wordOrder.filter((word) => state.connections.words.includes(word)),
        ...state.connections.words.filter((word) => !wordOrder.includes(word)),
      ]
    : [];
  const view = (
    <section
      id={active ? undefined : "wedding-games"}
      aria-labelledby={active ? "active-game-title" : "wedding-games-title"}
      className="bg-background text-foreground"
    >
      <div
        onKeyDown={(event) => {
          if (
            active !== "wordle" ||
            busy ||
            wordleDone ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.nativeEvent.isComposing
          )
            return;
          if (
            event.target instanceof HTMLElement &&
            event.target.closest(
              "button, a, input, textarea, select, [contenteditable], [role=button]",
            )
          )
            return;
          if (
            /^[a-z]$/i.test(event.key) ||
            event.key === "Backspace" ||
            event.key === "Enter"
          ) {
            event.preventDefault();
            typeKey(event.key);
          }
        }}
        className={
          active
            ? "mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-2 py-2 sm:px-4"
            : "mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16"
        }
      >
        {active ? (
          <header className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <Link
              to="/"
              hash="wedding-games"
              className={cn(actionButton, "inline-flex items-center px-3")}
            >
              ← Back to games
            </Link>
            <h1
              id="active-game-title"
              ref={gameHeading}
              tabIndex={-1}
              className="font-serif text-2xl"
            >
              {active === "wordle" ? "Wordle" : "Connections"}
            </h1>
            {state?.joined && (
              <div className="w-full text-right">
                <GameClock
                  key={active}
                  elapsedMs={state[active].elapsedMs}
                  running={
                    state[active].status === "in-progress" &&
                    !state[active].paused
                  }
                  receivedAt={receivedAt}
                />
              </div>
            )}
          </header>
        ) : (
          <header className="mb-8 text-center">
            <SectionHeading id="wedding-games-title">
              A little friendly competition
            </SectionHeading>
            <p className="mx-auto mt-4 max-w-lg font-sans text-sm leading-relaxed text-olive-soft">
              We take on Wordle and Connections every day.
              <br />
              Think you can beat us?
            </p>
          </header>
        )}
        {error && (
          <div className="mb-5 flex flex-wrap justify-center gap-3">
            <button
              className={actionButton}
              disabled={busy}
              onClick={() => void request("state")}
            >
              Retry
            </button>
          </div>
        )}
        <p
          role="status"
          aria-live="polite"
          className={busy || error ? "mb-4 text-center text-sm" : "sr-only"}
        >
          {busy ? "Loading…" : error}
        </p>
        <p
          role="status"
          aria-live="polite"
          className={notice ? "mb-3 text-center text-sm font-bold" : "sr-only"}
        >
          {notice}
        </p>
        {state && !active && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["wordle", "connections"] as const).map((game) => (
              <Link
                key={game}
                to={game === "wordle" ? "/games/wordle" : "/games/connections"}
                className={cn(
                  button,
                  "flex flex-col items-center rounded-none border-paper-edge bg-paper p-6 text-center shadow-md sm:p-8",
                )}
              >
                <CardHeading as="span" icon={<GameIcon game={game} />}>
                  {game === "wordle" ? "Wordle" : "Connections"}
                </CardHeading>
                <span className="my-3 block leading-relaxed">
                  {game === "wordle"
                    ? "Five letters. Six guesses."
                    : "Find four groups of four."}
                </span>
                <span className="block font-bold">
                  {state[game].status === "completed"
                    ? "View results"
                    : state[game].status === "not-started"
                      ? "Start timed game"
                      : "Resume game"}{" "}
                  · {state[game].score}/6 points
                </span>
              </Link>
            ))}
          </div>
        )}
        {state?.joined && active && (
          <PolaroidCard as="div" className="flex flex-1 flex-col p-2 sm:p-4">
            {active === "wordle" ? (
              <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
                <p
                  id="wordle-instructions"
                  className="mb-3 text-center text-sm leading-relaxed"
                >
                  Guess the five-letter word in six tries. <br /> The fewer
                  guesses you need, the more points you earn.
                </p>
                <div
                  role="group"
                  tabIndex={0}
                  aria-describedby="wordle-instructions"
                  className="mx-auto grid w-full max-w-[min(20rem,max(12rem,42dvh))] shrink-0 gap-1.5 focus-visible:outline-2 focus-visible:outline-olive"
                  aria-label="Wordle guesses"
                >
                  {Array.from({ length: 6 }, (_, i) => {
                    const row = state.wordle.guesses[i];
                    return (
                      <div
                        key={i}
                        role="group"
                        className="grid grid-cols-5 gap-1.5"
                        aria-label={
                          row
                            ? `${row.word}: ${row.tiles.join(", ")}`
                            : `Guess ${i + 1}, ${i === state.wordle.guesses.length ? guess || "empty" : "empty"}`
                        }
                      >
                        {Array.from({ length: 5 }, (_, j) => (
                          <span
                            key={j}
                            aria-hidden="true"
                            className={`flex aspect-square items-center justify-center rounded-none border font-sans text-2xl font-bold uppercase sm:text-3xl ${row ? tileFeedback[row.tiles[j]] : "border-border bg-paper"}`}
                          >
                            {row?.word[j] ??
                              (i === state.wordle.guesses.length
                                ? guess[j]
                                : "")}
                          </span>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {wordleDone ? (
                  <p role="status" className="mt-3 font-bold">
                    {state.wordle.score > 0
                      ? "You found it!"
                      : "All six guesses used."}{" "}
                    The word was {state.wordle.answer}. Final score:{" "}
                    {state.wordle.score}/6.
                  </p>
                ) : (
                  <>
                    <p role="status" aria-live="polite" className="sr-only">
                      Guess {state.wordle.guesses.length + 1} of 6:{" "}
                      {guess || "empty"}.{" "}
                      {state.wordle.guesses.at(-1)?.tiles.join(", ")}
                    </p>
                    <div className="mt-auto pt-2 pb-[env(safe-area-inset-bottom)]">
                      <GamesKeyboard
                        guesses={state.wordle.guesses}
                        disabled={busy}
                        canSubmit={guess.length === 5}
                        onKey={typeKey}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
                <p className="mb-3 text-center text-sm leading-relaxed">
                  Sort the words into four groups of four. <br /> Four mistakes
                  end the game, so choose carefully.
                </p>
                <div
                  className="mb-4 flex items-center justify-center gap-2"
                  aria-label={`${4 - state.connections.mistakes} mistakes remaining`}
                >
                  <span className="mr-2 text-sm">Mistakes remaining</span>
                  {Array.from({ length: 4 }, (_, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className={`h-3 w-3 rounded-full ${i < 4 - state.connections.mistakes ? "bg-[#56651f]" : "bg-[#d8dbc9]"}`}
                    />
                  ))}
                </div>
                <p className="mb-4 font-bold" role="status">
                  {connectionsDone
                    ? `Finished · ${state.connections.score}/6 points`
                    : `${4 - state.connections.mistakes} mistakes remaining · ${selected.length}/4 selected`}
                </p>
                <div className="grid gap-3">
                  {state.connections.solved.map((g) => (
                    <div
                      key={g.id}
                      className="rounded-none bg-olive p-4 text-center text-paper"
                    >
                      <strong>{g.title}</strong>
                      <p className="mt-1 text-sm">{g.words.join(" · ")}</p>
                    </div>
                  ))}
                </div>
                {!connectionsDone && (
                  <>
                    <div className="my-3 grid grid-cols-4 gap-1.5 sm:gap-2">
                      {connectionWords.map((word) => (
                        <button
                          key={word}
                          className={`${button} rounded-none min-h-20 min-w-0 [overflow-wrap:anywhere] px-1 text-[clamp(0.6rem,2.5vw,0.875rem)] font-bold sm:min-h-24 ${selected.includes(word) ? "border-[#56651f] bg-[#56651f] text-white hover:bg-[#46531a]" : "bg-[#fffef9]"}`}
                          aria-pressed={selected.includes(word)}
                          disabled={
                            busy ||
                            (!selected.includes(word) && selected.length >= 4)
                          }
                          onClick={() =>
                            setSelected((current) =>
                              current.includes(word)
                                ? current.filter((w) => w !== word)
                                : [...current, word],
                            )
                          }
                        >
                          {word}
                        </button>
                      ))}
                    </div>
                    <div className="mt-auto flex flex-wrap justify-center gap-2 pt-2">
                      <button
                        className={actionButton}
                        disabled={busy}
                        onClick={() => {
                          const shuffled = [...connectionWords];
                          for (let i = shuffled.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [shuffled[i], shuffled[j]] = [
                              shuffled[j],
                              shuffled[i],
                            ];
                          }
                          setWordOrder(shuffled);
                        }}
                      >
                        Shuffle
                      </button>
                      <button
                        className={actionButton}
                        disabled={busy || !selected.length}
                        onClick={() => setSelected([])}
                      >
                        Deselect all
                      </button>
                      <button
                        className={`${actionButton} bg-[#56651f] text-[#fffef9] hover:bg-[#46531a]`}
                        disabled={busy || selected.length !== 4}
                        onClick={() =>
                          void request("submit", "connections", selected)
                        }
                      >
                        Submit group
                      </button>
                    </div>
                  </>
                )}
                {state.connections.reveal.map((g) => (
                  <div
                    key={g.id}
                    className="mt-3 rounded-xl border border-[#aeb89a] p-4"
                  >
                    <strong>Revealed: {g.title}</strong>
                    <p className="text-sm">{g.words.join(" · ")}</p>
                  </div>
                ))}
              </div>
            )}
          </PolaroidCard>
        )}
        {!active && (
          <>
            {state && (
              <div className="mt-8">
                <h3 className="mb-3 text-center font-serif text-2xl font-light uppercase tracking-[0.16em]">
                  Guest leaderboard
                </h3>
                <PolaroidCard as="div" className="px-5 py-2 sm:px-7">
                  {state.leaderboard.length === 0 ? (
                    <p className="py-3 text-sm">
                      No one has finished both games yet.
                    </p>
                  ) : (
                    <ol className="divide-y divide-border/25">
                      {state.leaderboard.slice(0, 5).map((p, i) => (
                        <li
                          key={i}
                          className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                          <div>
                            <strong>
                              #{p.rank} · {p.name}
                            </strong>
                            <p className="mt-1 text-xs">
                              Wordle {p.wordle}/6 · Connections {p.connections}
                              /6
                            </p>
                            <p className="mt-1 text-xs tabular-nums">
                              {p.elapsedMs !== null
                                ? `Total time · ${formatTime(p.elapsedMs)}`
                                : "Time unavailable"}
                            </p>
                          </div>
                          <strong>{p.total}/12</strong>
                        </li>
                      ))}
                    </ol>
                  )}
                </PolaroidCard>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
  return <GamesContext.Provider value={view}>{children}</GamesContext.Provider>;
};
