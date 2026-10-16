import { useEffect, useRef, useState } from "react";
import { Effect } from "effect";
import type { GameState } from "@cherelynnandkevin/client-api-contract/games/http";
import { AppHttpClient } from "@/platform/http.client.ts";
import { GamesKeyboard, tileFeedback } from "./games.keyboard.tsx";

const button = "min-h-11 rounded-xl border border-[#aeb89a] px-4 py-2 font-sans text-sm transition hover:bg-[#e9ecd9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#56651f] disabled:opacity-50 disabled:cursor-not-allowed";
const formatTime = (ms: number) => { const seconds = Math.floor(ms / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; };
function GameClock({ elapsedMs, running }: { elapsedMs: number | null; running: boolean }) {
  const [extra, setExtra] = useState(0);
  useEffect(() => {
    setExtra(0);
    if (!running || elapsedMs === null) return;
    const start = Date.now();
    const timer = window.setInterval(() => setExtra(Date.now() - start), 1000);
    return () => window.clearInterval(timer);
  }, [elapsedMs, running]);
  return <p className="mb-4 font-sans text-xs tabular-nums">{elapsedMs === null ? "Time unavailable for this earlier attempt" : `Time · ${formatTime(elapsedMs + extra)}${running ? " · continues if you leave" : ""}`}</p>;
}
export const GamesPanel = ({ firstName, lastName }: { firstName: string; lastName: string }) => {
  const [state, setState] = useState<GameState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [guess, setGuess] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<"wordle" | "connections" | null>(null);
  const [wordOrder, setWordOrder] = useState<string[]>([]);
  const gameHeading = useRef<HTMLHeadingElement>(null);
  const pending = useRef(false);
  const generation = useRef(0);
  const request = async (action: "state" | "join" | "start" | "submit", game?: "wordle" | "connections", words: string[] = []) => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    const token = generation.current;
    try {
      const result = await Effect.runPromise(Effect.gen(function* () {
        const client = yield* AppHttpClient;
        const payload = { firstName, lastName };
        if (action === "state") return yield* client.games.state({ payload });
        if (action === "join") return yield* client.games.join({ payload });
        if (action === "start") return yield* client.games.start({ payload: { ...payload, expectedRevision: state?.revision ?? 0, game: game!, words: [] } });
        return yield* client.games.submit({ payload: { ...payload, expectedRevision: state?.revision ?? 0, game: game!, words } });
      }).pipe(Effect.provide(AppHttpClient.layer)));
      if (token !== generation.current) return;
      if (action === "submit" && game === "connections") setNotice(result.revision === state?.revision ? "You already tried that group. It hasn't used another mistake." : result.connections.mistakes > (state?.connections.mistakes ?? 0) ? "Not a connection. Try a different group." : "Connection found!");
      setState(result); setGuess(""); setSelected([]);
      if (action === "start" && game) setActive(game);
    } catch {
      if (token === generation.current) setError("Couldn't save or load your game. Retry to sync your progress. Wordle guesses must be valid words.");
    } finally { if (token === generation.current) { pending.current = false; setBusy(false); } }
  };
  useEffect(() => { void request("state"); return () => { generation.current++; pending.current = false; }; }, [firstName, lastName]);
  const wordleDone = state?.wordle.status === "completed";
  const connectionsDone = state?.connections.status === "completed";
  useEffect(() => { if (active) gameHeading.current?.focus(); }, [active]);
  const typeKey = (key: string) => {
    if (busy || wordleDone || !state?.joined) return;
    if (key === "Backspace") setGuess(current => current.slice(0, -1));
    else if (key === "Enter") { if (guess.length === 5) void request("submit", "wordle", [guess]); }
    else if (/^[a-z]$/i.test(key)) setGuess(current => (current + key.toUpperCase()).slice(0, 5));
  };
  const connectionWords = state ? [...wordOrder.filter(word => state.connections.words.includes(word)), ...state.connections.words.filter(word => !wordOrder.includes(word))] : [];
  return <section aria-labelledby="wedding-games-title" className="border-b border-[#aeb89a]/25 bg-[#fffef9] text-[#37430f]">
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mb-8 text-center"><p className="font-script text-2xl text-[#7c8459]">a little friendly competition</p><h2 id="wedding-games-title" className="mt-2 font-serif text-2xl font-light uppercase tracking-[0.16em]">Wedding games</h2></header>
      {(error || (state && !state.joined)) && <div className="mb-5 flex flex-wrap justify-center gap-3">{error && <button className={button} disabled={busy} onClick={() => void request("state")}>Retry</button>}{state && !state.joined && <button className={`${button} bg-[#56651f] text-white`} disabled={busy} onClick={() => void request("join")}>Join the games</button>}</div>}
      <p role="status" aria-live="polite" className={busy || error || (state && !state.joined) ? "mb-4 text-center text-sm" : "sr-only"}>{busy ? "Loading…" : error || (state && !state.joined ? "Join to appear on the leaderboard." : "")}</p>
      <p role="status" aria-live="polite" className={notice ? "mb-3 text-center text-sm font-bold" : "sr-only"}>{notice}</p>
      {state && !active && <div className="grid gap-4 sm:grid-cols-2">{(["wordle", "connections"] as const).map(game => <button key={game} className={`${button} rounded-3xl bg-[#f8f6f0] p-6 text-left sm:p-8`} disabled={!state.joined || busy} onClick={() => void request("start", game)}><span className="mb-5 block text-2xl tracking-widest" aria-hidden="true">{game === "wordle" ? "▧ ▧ ▧ ▧ ▧" : "▦ ▦ ▦ ▦"}</span><span className="block font-serif text-2xl">{game === "wordle" ? "Wordle" : "Connections"}</span><span className="my-3 block leading-relaxed">{game === "wordle" ? "Five letters. Six guesses." : "Find four groups of four."}</span><span className="block font-bold">{state[game].status === "completed" ? "View results" : state[game].status === "not-started" ? "Start timed game" : "Resume game"} · {state[game].score}/6 points</span></button>)}</div>}
      {state?.joined && active && <div className="rounded-3xl border border-[#aeb89a]/40 bg-[#f8f6f0] p-3 shadow-sm sm:p-8">
        <button className={`${button} mb-6`} onClick={() => setActive(null)}>← All games & leaderboard</button>
        <GameClock key={active} elapsedMs={state[active].elapsedMs} running={state[active].status === "in-progress"} />
        {active === "wordle" ? <div className="mx-auto max-w-lg" onKeyDown={event => {
          if (event.target instanceof HTMLElement && (event.target.closest("input, textarea, select, [contenteditable=true]") || event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing)) return;
          if (/^[a-z]$/i.test(event.key) || event.key === "Backspace") { event.preventDefault(); typeKey(event.key); }
          else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) { event.preventDefault(); typeKey(event.key); }
        }}>
          <h3 ref={gameHeading} tabIndex={-1} className="font-serif text-3xl">Wordle</h3><p className="my-3 text-sm leading-relaxed">Find the five-letter word in six guesses. A win earns 7 minus the guesses used; otherwise 0 points.</p>
          <div className="mx-auto grid max-w-[20rem] gap-1.5 sm:gap-2" aria-label="Wordle guesses">{Array.from({ length: 6 }, (_, i) => { const row = state.wordle.guesses[i]; return <div key={i} role="group" className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label={row ? `${row.word}: ${row.tiles.join(", ")}` : `Guess ${i + 1}, ${i === state.wordle.guesses.length ? guess || "empty" : "empty"}`}>{Array.from({ length: 5 }, (_, j) => <span key={j} aria-hidden="true" className={`flex aspect-square items-center justify-center rounded-lg border font-sans text-2xl font-bold uppercase sm:text-3xl ${row ? tileFeedback[row.tiles[j]] : "border-[#aeb89a] bg-[#fffef9]"}`}>{row?.word[j] ?? (i === state.wordle.guesses.length ? guess[j] : "")}</span>)}</div>; })}</div>
          <p className="my-3 text-xs">Green: correct position · Gold: elsewhere in the word · Grey: not in the word (or no copies left).</p>
          {wordleDone ? <p role="status" className="font-bold">{state.wordle.score > 0 ? "You found it!" : "All six guesses used."} The word was {state.wordle.answer}. Final score: {state.wordle.score}/6.</p> : <form onSubmit={e => { e.preventDefault(); void request("submit", "wordle", [guess]); }} className="grid gap-3"><label htmlFor="wedding-wordle" className="text-sm font-bold">Your next five-letter guess ({state.wordle.guesses.length + 1}/6)</label><input id="wedding-wordle" value={guess} onChange={e => setGuess(e.target.value.replace(/[^a-z]/gi, "").toUpperCase().slice(0,5))} maxLength={5} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy} className="min-h-11 rounded-xl border border-[#aeb89a] bg-white px-4 text-lg tracking-widest" /><button className={button} disabled={busy || guess.length !== 5}>Submit guess</button></form>}
          <GamesKeyboard guesses={state.wordle.guesses} disabled={busy || wordleDone} canSubmit={guess.length === 5} onKey={typeKey} />
        </div> : <div className="mx-auto max-w-2xl">
          <h3 ref={gameHeading} tabIndex={-1} className="font-serif text-3xl">Connections</h3><p className="my-3 text-sm leading-relaxed">Make four groups of four. Four mistakes end the game. Earn one point per group, plus 2 for a perfect finish or 1 for finishing with one mistake.</p>
          <div className="mb-4 flex items-center justify-center gap-2" aria-label={`${4 - state.connections.mistakes} mistakes remaining`}><span className="mr-2 text-sm">Mistakes remaining</span>{Array.from({ length: 4 }, (_, i) => <span key={i} aria-hidden="true" className={`h-3 w-3 rounded-full ${i < 4 - state.connections.mistakes ? "bg-[#56651f]" : "bg-[#d8dbc9]"}`} />)}</div>
          <p className="mb-4 font-bold" role="status">{connectionsDone ? `Finished · ${state.connections.score}/6 points` : `${4 - state.connections.mistakes} mistakes remaining · ${selected.length}/4 selected`}</p>
          <div className="grid gap-3">{state.connections.solved.map(g => <div key={g.id} className="rounded-xl bg-[#e5e9d5] p-4 text-center"><strong>{g.title}</strong><p className="mt-1 text-sm">{g.words.join(" · ")}</p></div>)}</div>
          {!connectionsDone && <><div className="my-4 grid grid-cols-4 gap-1.5 sm:gap-2">{connectionWords.map(word => <button key={word} className={`${button} min-h-20 min-w-0 [overflow-wrap:anywhere] px-1 text-[clamp(0.6rem,2.5vw,0.875rem)] font-bold sm:min-h-24 ${selected.includes(word) ? "border-[#56651f] bg-[#56651f] text-white hover:bg-[#46531a]" : "bg-[#fffef9]"}`} aria-pressed={selected.includes(word)} disabled={busy || (!selected.includes(word) && selected.length >= 4)} onClick={() => setSelected(current => current.includes(word) ? current.filter(w => w !== word) : [...current, word])}>{word}</button>)}</div><div className="flex flex-wrap justify-center gap-3"><button className={button} disabled={busy} onClick={() => {
            const shuffled = [...connectionWords];
            for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
            setWordOrder(shuffled);
          }}>Shuffle</button><button className={button} disabled={busy || !selected.length} onClick={() => setSelected([])}>Deselect all</button><button className={`${button} bg-[#56651f] text-white hover:bg-[#46531a]`} disabled={busy || selected.length !== 4} onClick={() => void request("submit", "connections", selected)}>Submit group</button></div></>}
          {state.connections.reveal.map(g => <div key={g.id} className="mt-3 rounded-xl border border-[#aeb89a] p-4"><strong>Revealed: {g.title}</strong><p className="text-sm">{g.words.join(" · ")}</p></div>)}
        </div>}
      </div>}
      {!active && <>
      {state && <div className="mt-8"><h3 className="mb-3 font-serif text-xl">Guest leaderboard</h3>{state.leaderboard.length === 0 ? <p className="text-sm">No players yet. Be the first to join!</p> : <ol className="grid gap-3">{state.leaderboard.map((p,i) => <li key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#aeb89a]/40 p-4"><div><strong>#{p.rank} · {p.name}</strong><p className="mt-1 text-xs">{p.status === "completed" ? "Completed both games" : "In progress"} · Wordle {p.wordle}/6 · Connections {p.connections}/6</p><p className="mt-1 text-xs tabular-nums">{p.elapsedMs !== null ? `Total time · ${formatTime(p.elapsedMs)}` : p.status === "completed" ? "Time unavailable" : "Total time after both games"}</p></div><strong>{p.total}/12</strong></li>)}</ol>}</div>}
      </>}
    </div>
  </section>;
};
