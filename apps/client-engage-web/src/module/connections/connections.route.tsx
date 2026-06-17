import { Link, useNavigate } from "@tanstack/react-router";
import { Button, buttonVariants } from "@/components/ui/button.tsx";
import { markConnectionsSolved } from "@/module/levels/progress.ts";
import { useMemo, useState } from "react";

const panelClassName =
  "grid min-h-[calc(100svh-1.3rem)] gap-[clamp(0.65rem,2.4vh,1rem)] rounded-[clamp(22px,6vw,32px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_42%)] bg-[color-mix(in_oklch,var(--card),transparent_8%)] p-[clamp(0.9rem,3.6vw,1.5rem)] shadow-[0_28px_90px_color-mix(in_oklch,var(--purple-11),transparent_86%)]";

type ConnectionsGroup = {
  readonly id: string;
  readonly title: string;
  readonly words: readonly string[];
};

const groups: readonly ConnectionsGroup[] = [
  { id: "purple", title: "Shades of purple", words: ["LAVENDER", "VIOLET", "LILAC", "AMETHYST"] },
  { id: "wedding", title: "Wedding details", words: ["RING", "VOW", "BOUQUET", "TOAST"] },
  { id: "coffee", title: "Coffee orders", words: ["LATTE", "MOCHA", "ESPRESSO", "CORTADO"] },
  { id: "keys", title: "Things with keys", words: ["PIANO", "LOCK", "KEYBOARD", "MAP"] },
] as const;

const startingWords: readonly string[] = [
  "LATTE",
  "RING",
  "VIOLET",
  "PIANO",
  "TOAST",
  "AMETHYST",
  "MAP",
  "MOCHA",
  "LAVENDER",
  "LOCK",
  "VOW",
  "ESPRESSO",
  "KEYBOARD",
  "LILAC",
  "CORTADO",
  "BOUQUET",
] as const;

const maxMistakes = 4;

const getGroupForSelection = (selection: readonly string[]) => {
  const normalized = [...selection].sort().join("|");

  return groups.find((group) => [...group.words].sort().join("|") === normalized);
};

const isOneAway = (selection: readonly string[]) =>
  groups.some((group) => selection.filter((word) => group.words.includes(word)).length === 3);

const shuffleWords = (words: readonly string[]) =>
  [...words]
    .map((word) => ({ word, sort: crypto.getRandomValues(new Uint32Array(1))[0] }))
    .sort((left, right) => left.sort - right.sort)
    .map(({ word }) => word);

export const ConnectionsRoute = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState<readonly string[]>(startingWords);
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [solvedGroupIds, setSolvedGroupIds] = useState<readonly string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState("Find four words that share a connection.");

  const solvedGroups = useMemo(
    () => groups.filter((group) => solvedGroupIds.includes(group.id)),
    [solvedGroupIds],
  );
  const unsolvedWords = words.filter((word) => !solvedGroups.some((group) => group.words.includes(word)));
  const isComplete = solvedGroupIds.length === groups.length;
  const isFailed = mistakes >= maxMistakes && !isComplete;

  const toggleWord = (word: string) => {
    if (isComplete || isFailed) {
      return;
    }

    setSelected((current) => {
      if (current.includes(word)) {
        setMessage("Find four words that share a connection.");
        return current.filter((item) => item !== word);
      }

      if (current.length >= 4) {
        setMessage("Only four words per guess.");
        return current;
      }

      setMessage("Find four words that share a connection.");
      return [...current, word];
    });
  };

  const submitSelection = () => {
    if (selected.length !== 4) {
      setMessage("Pick exactly four words.");
      return;
    }

    const group = getGroupForSelection(selected);

    if (group === undefined) {
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setSelected([]);
      setMessage(
        nextMistakes >= maxMistakes
          ? "Out of mistakes. Try again?"
          : isOneAway(selected)
            ? "One away..."
            : "Not quite. Try another connection.",
      );
      return;
    }

    const nextSolvedGroupIds = [...solvedGroupIds, group.id];

    setSolvedGroupIds(nextSolvedGroupIds);
    setSelected([]);
    setMessage(nextSolvedGroupIds.length === groups.length ? "All connections found." : group.title);

    if (nextSolvedGroupIds.length === groups.length) {
      markConnectionsSolved();

      globalThis.setTimeout(() => {
        void navigate({ to: "/scrolls" });
      }, 1100);
    }
  };

  const reset = () => {
    setWords(startingWords);
    setSelected([]);
    setSolvedGroupIds([]);
    setMistakes(0);
    setMessage("Find four words that share a connection.");
  };

  return (
    <section className={panelClassName}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="m-0 mb-1 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--purple-11)]">Level 2</p>
          <h2 className="m-0 font-heading text-[clamp(2.25rem,10vw,4rem)] leading-[0.92] tracking-tight">Connections</h2>
        </div>
        <Link className="rounded-full bg-[color-mix(in_oklch,var(--purple-3),white_18%)] px-3 py-2 text-sm text-[var(--purple-11)] no-underline" to="/">
          Levels
        </Link>
      </div>

      <p className="m-0 leading-snug text-muted-foreground">Example puzzle for now. Make four groups of four.</p>

      <div className="grid gap-2" aria-label="Solved groups">
        {solvedGroups.map((group) => (
          <div
            className="grid gap-1 rounded-2xl border border-[color-mix(in_oklch,var(--purple-10),transparent_42%)] bg-[color-mix(in_oklch,var(--purple-8),white_40%)] p-3 text-center text-[var(--purple-12)]"
            key={group.id}
          >
            <strong className="text-sm uppercase">{group.title}</strong>
            <span className="text-xs font-extrabold">{group.words.join(", ")}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-[clamp(0.35rem,1.4vw,0.55rem)]" aria-label="Connections words">
        {unsolvedWords.map((word) => (
          <button
            aria-pressed={selected.includes(word)}
            className={`flex aspect-[1.18] min-w-0 cursor-pointer items-center justify-center rounded-[clamp(12px,3vw,16px)] border border-[color-mix(in_oklch,var(--purple-7),transparent_28%)] px-1 text-center text-[clamp(0.57rem,2.45vw,0.84rem)] font-black leading-none tracking-[-0.02em] text-[var(--purple-12)] transition disabled:cursor-not-allowed disabled:opacity-75 ${selected.includes(word) ? "-translate-y-px border-[var(--purple-11)] bg-[var(--purple-10)] text-white" : "bg-[color-mix(in_oklch,var(--purple-3),white_28%)]"}`}
            disabled={isComplete || isFailed}
            key={word}
            type="button"
            onClick={() => toggleWord(word)}
          >
            {word}
          </button>
        ))}
      </div>

      <p className="m-0 min-h-5 text-center font-extrabold text-[var(--purple-12)]" role="status" aria-live="polite">
        {message}
      </p>

      <p className="m-0 text-center text-sm font-extrabold text-[var(--purple-11)]">Mistakes remaining: {Math.max(0, maxMistakes - mistakes)}</p>

      <div className="grid grid-cols-3 gap-2 [&_button]:min-w-0">
        <Button type="button" variant="secondary" onClick={() => setSelected([])} disabled={selected.length === 0}>
          Deselect
        </Button>
        <Button type="button" variant="secondary" onClick={() => setWords(shuffleWords(unsolvedWords))} disabled={isComplete || isFailed}>
          Shuffle
        </Button>
        <Button type="button" onClick={submitSelection} disabled={selected.length !== 4 || isComplete || isFailed}>
          Submit
        </Button>
        {(isComplete || isFailed) ? (
          <Button type="button" variant="secondary" onClick={reset}>
            Try again
          </Button>
        ) : null}
      </div>

      <Link className={buttonVariants({ variant: "ghost" })} to="/wordle">
        Back to Level 1
      </Link>
    </section>
  );
};
