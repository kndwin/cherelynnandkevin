import { useMachine } from "@xstate/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button.tsx";
import { markWordleSolved } from "@/module/levels/progress.ts";
import { useEffect } from "react";
import { WORDLE_GUESS_LENGTH, WORDLE_MAX_GUESSES, type TileStatus } from "./wordle.logic.ts";
import { wordleMachine } from "./wordle.machine.ts";

const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] as const;

const tileClassNames: Record<TileStatus, string> = {
  empty: "bg-[color-mix(in_oklch,var(--purple-2),white_36%)] border-[color-mix(in_oklch,var(--purple-6),transparent_25%)]",
  filled:
    "bg-[color-mix(in_oklch,var(--purple-2),white_36%)] border-[var(--purple-8)] shadow-[inset_0_1px_0_color-mix(in_oklch,white,transparent_20%),0_0_0_3px_color-mix(in_oklch,var(--purple-7),transparent_72%)]",
  correct: "border-[#30744f] bg-[#3f8f62] text-white",
  present: "border-[#a97c23] bg-[#c89a35] text-white",
  absent: "border-[color-mix(in_oklch,var(--purple-12),white_8%)] bg-[color-mix(in_oklch,var(--purple-12),white_18%)] text-white",
};

const keyClassNames: Partial<Record<TileStatus, string>> = {
  correct: "border-[#30744f] bg-[#3f8f62] text-white",
  present: "border-[#a97c23] bg-[#c89a35] text-white",
  absent: "border-[color-mix(in_oklch,var(--purple-12),white_8%)] bg-[color-mix(in_oklch,var(--purple-12),white_18%)] text-white",
};

type Tile = {
  readonly letter: string;
  readonly status: TileStatus;
};

const getBoard = (
  guesses: readonly { readonly letters: string; readonly score: readonly { readonly letter: string; readonly status: TileStatus }[] }[],
  currentGuess: string,
): readonly (readonly Tile[])[] =>
  Array.from({ length: WORDLE_MAX_GUESSES }, (_, rowIndex) => {
    const completed = guesses[rowIndex];

    if (completed !== undefined) {
      return completed.score;
    }

    const isCurrentRow = rowIndex === guesses.length;

    return Array.from({ length: WORDLE_GUESS_LENGTH }, (_, columnIndex) => {
      const letter = isCurrentRow ? (currentGuess[columnIndex] ?? "") : "";

      return {
        letter,
        status: letter.length > 0 ? "filled" : "empty",
      };
    });
  });

export const WordleRoute = () => {
  const [snapshot, send] = useMachine(wordleMachine);
  const navigate = useNavigate();
  const board = getBoard(snapshot.context.guesses, snapshot.context.currentGuess);
  const isFinished = snapshot.matches("Won") || snapshot.matches("Lost");

  useEffect(() => {
    if (!snapshot.matches("Won")) {
      return;
    }

    markWordleSolved();
    const timer = globalThis.setTimeout(() => {
      void navigate({ to: "/connections" });
    }, 1200);

    return () => globalThis.clearTimeout(timer);
  }, [navigate, snapshot]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        send({ type: "letter", letter: event.key });
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        send({ type: "delete" });
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        send({ type: "submit" });
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [send]);

  return (
    <section className="grid min-h-[calc(100svh-1.3rem)] gap-[clamp(0.38rem,1.55vh,0.85rem)] rounded-[clamp(22px,6vw,32px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_42%)] bg-[color-mix(in_oklch,var(--card),transparent_8%)] p-[clamp(0.9rem,3.6vw,1.5rem)] shadow-[0_28px_90px_color-mix(in_oklch,var(--purple-11),transparent_86%)]">
      <div className="flex items-center justify-between gap-4 max-sm:flex-row">
        <div>
          <p className="m-0 mb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--purple-11)]">Level 1</p>
          <h2 className="m-0 font-heading text-[clamp(1.8rem,8vw,3.5rem)] leading-none tracking-tight">Wordle</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link className="rounded-full bg-[color-mix(in_oklch,var(--purple-3),white_18%)] px-3 py-2 text-sm text-[var(--purple-11)] no-underline" to="/">
            Levels
          </Link>
          <Button type="button" variant="secondary" size="sm" onClick={() => send({ type: "reset" })}>
            New game
          </Button>
        </div>
      </div>

      <p className="m-0 text-[clamp(0.86rem,3.4vw,1rem)] leading-snug text-muted-foreground max-sm:hidden">
        Six tries. Five letters. The placeholder answer is AROSE.
      </p>

      <div className="mx-auto grid w-[min(100%,18rem)] justify-center gap-[clamp(0.26rem,1.1vw,0.45rem)]" aria-label="Wordle board">
        {board.map((row, rowIndex) => (
          <div
            className="grid w-[min(calc(100vw-4.8rem),18rem)] grid-cols-5 gap-[clamp(0.26rem,1.1vw,0.45rem)]"
            key={rowIndex}
            aria-label={`Guess ${rowIndex + 1}`}
          >
            {row.map((tile, columnIndex) => (
              <span
                className={`flex aspect-square items-center justify-center rounded-[clamp(10px,3vw,16px)] border text-[clamp(1.18rem,6.6vw,1.9rem)] font-black uppercase tracking-[0.04em] shadow-[inset_0_1px_0_color-mix(in_oklch,white,transparent_25%)] ${tileClassNames[tile.status]}`}
                key={`${rowIndex}-${columnIndex}`}
              >
                {tile.letter}
              </span>
            ))}
          </div>
        ))}
      </div>

      <p className="m-0 min-h-5 text-center font-extrabold leading-snug text-[var(--purple-12)]" role="status" aria-live="polite">
        {snapshot.context.message || (isFinished ? "Game complete." : "Type or tap letters to play.")}
      </p>

      <div className="mx-auto grid w-full max-w-3xl gap-[clamp(0.24rem,1vw,0.4rem)]" aria-label="Wordle keyboard">
        {keyboardRows.map((row, rowIndex) => (
          <div className="flex justify-center gap-[clamp(0.18rem,0.85vw,0.36rem)]" key={row}>
            {rowIndex === 2 ? (
              <button
                className="min-h-[clamp(2.28rem,9.5vw,3rem)] min-w-0 flex-[1.5_1_0] cursor-pointer rounded-[clamp(8px,2.3vw,13px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_20%)] bg-[color-mix(in_oklch,var(--purple-4),white_18%)] px-1 text-[clamp(0.58rem,2.45vw,0.76rem)] font-black uppercase text-[var(--purple-12)] transition hover:bg-[var(--purple-5)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                type="button"
                onClick={() => send({ type: "submit" })}
              >
                Enter
              </button>
            ) : null}
            {row.split("").map((letter) => (
              <button
                className={`min-h-[clamp(2.28rem,9.5vw,3rem)] min-w-0 flex-1 cursor-pointer rounded-[clamp(8px,2.3vw,13px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_20%)] bg-[color-mix(in_oklch,var(--purple-4),white_18%)] px-1 font-black uppercase text-[var(--purple-12)] transition hover:bg-[var(--purple-5)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70 ${keyClassNames[snapshot.context.keyboard[letter]] ?? ""}`}
                key={letter}
                type="button"
                disabled={isFinished}
                onClick={() => send({ type: "letter", letter })}
              >
                {letter}
              </button>
            ))}
            {rowIndex === 2 ? (
              <button
                className="min-h-[clamp(2.28rem,9.5vw,3rem)] min-w-0 flex-[1.5_1_0] cursor-pointer rounded-[clamp(8px,2.3vw,13px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_20%)] bg-[color-mix(in_oklch,var(--purple-4),white_18%)] px-1 text-[clamp(0.58rem,2.45vw,0.76rem)] font-black uppercase text-[var(--purple-12)] transition hover:bg-[var(--purple-5)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
                type="button"
                onClick={() => send({ type: "delete" })}
              >
                Delete
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
};
