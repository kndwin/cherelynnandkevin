// Immutable wedding puzzle v1. Never change content under this ID.
export const PUZZLE_ID = "wedding-v1";
export const ANSWER = "VOWED";
export const GROUPS = [
  { id: "wedding", title: "Wedding details", words: ["RING", "VOW", "BOUQUET", "TOAST"] },
  { id: "purple", title: "Shades of purple", words: ["LAVENDER", "VIOLET", "LILAC", "AMETHYST"] },
  { id: "coffee", title: "Coffee orders", words: ["LATTE", "MOCHA", "ESPRESSO", "CORTADO"] },
  { id: "keys", title: "Things with keys", words: ["PIANO", "LOCK", "KEYBOARD", "MAP"] },
] as const;
// pausedAt marks a player who left mid-game; pausedMs is the total time spent away.
export interface GameTiming { startedAt: number; finishedAt: number | null; pausedAt?: number | null; pausedMs?: number }
export interface Attempt { guesses: string[]; selections: string[][]; timing?: Partial<Record<"wordle" | "connections", GameTiming>> }
export const emptyAttempt = (): Attempt => ({ guesses: [], selections: [] });
export const scoreGuess = (word: string, answer = ANSWER) => {
  const remaining = answer.split("");
  const tiles: ("correct" | "present" | "absent")[] = Array(5).fill("absent");
  for (let i = 0; i < 5; i++) if (word[i] === remaining[i]) { tiles[i] = "correct"; remaining[i] = ""; }
  for (let i = 0; i < 5; i++) if (tiles[i] !== "correct") { const at = remaining.indexOf(word[i]); if (at >= 0) { tiles[i] = "present"; remaining[at] = ""; } }
  return tiles;
};
export const selectionKey = (words: readonly string[]) => [...words].sort().join("|");
export const pauseClock = (clock: GameTiming | undefined, now: number) => { if (clock && clock.finishedAt === null && clock.pausedAt == null) clock.pausedAt = now; };
export const resumeClock = (clock: GameTiming | undefined, now: number) => { if (clock && clock.pausedAt != null) { clock.pausedMs = (clock.pausedMs ?? 0) + Math.max(0, now - clock.pausedAt); clock.pausedAt = null; } };
export const summarize = (attempt: Attempt, now = Date.now()) => {
  const won = attempt.guesses.includes(ANSWER);
  const wordleDone = won || attempt.guesses.length >= 6;
  const solved = GROUPS.filter(g => attempt.selections.some(s => selectionKey(s) === selectionKey(g.words)));
  const mistakes = attempt.selections.length - solved.length;
  const connectionsDone = solved.length === 4 || mistakes >= 4;
  const status = (started: boolean, done: boolean): "not-started" | "in-progress" | "completed" => done ? "completed" : started ? "in-progress" : "not-started";
  const timing = (game: "wordle" | "connections") => {
    const clock = attempt.timing?.[game];
    return { elapsedMs: clock ? Math.max(0, (clock.finishedAt ?? clock.pausedAt ?? now) - clock.startedAt - (clock.pausedMs ?? 0)) : null, paused: !!clock && clock.finishedAt === null && clock.pausedAt != null };
  };
  return {
    wordle: { ...timing("wordle"), status: status(attempt.guesses.length > 0 || !!attempt.timing?.wordle, wordleDone), score: won ? 7 - attempt.guesses.length : 0, guesses: attempt.guesses.map(word => ({ word, tiles: scoreGuess(word) })), answer: wordleDone ? ANSWER : null },
    connections: { ...timing("connections"), status: status(attempt.selections.length > 0 || !!attempt.timing?.connections, connectionsDone), score: solved.length + (solved.length === 4 ? mistakes === 0 ? 2 : mistakes === 1 ? 1 : 0 : 0), mistakes, solved, words: connectionsDone ? [] : ["LATTE", "RING", "VIOLET", "PIANO", "TOAST", "AMETHYST", "MAP", "MOCHA", "LAVENDER", "LOCK", "VOW", "ESPRESSO", "KEYBOARD", "LILAC", "CORTADO", "BOUQUET"].filter(w => !solved.some(g => (g.words as readonly string[]).includes(w))), reveal: connectionsDone ? GROUPS.filter(g => !solved.includes(g)) : [] },
  };
};
// Players appear on the leaderboard only once both games are finished.
export const rankPlayers = (players: { name: string; attempt: Attempt }[]) => {
  const rows = players.filter(p => { const s = summarize(p.attempt); return s.wordle.status === "completed" && s.connections.status === "completed"; }).map(p => {
    const s = summarize(p.attempt);
    const completed = s.wordle.status === "completed" && s.connections.status === "completed";
    const elapsedMs = completed && p.attempt.timing?.wordle?.finishedAt != null && p.attempt.timing?.connections?.finishedAt != null ? s.wordle.elapsedMs! + s.connections.elapsedMs! : null;
    return { name: p.name, wordle: s.wordle.score, connections: s.connections.score, total: s.wordle.score + s.connections.score, elapsedMs, status: (completed ? "completed" : s.wordle.status === "not-started" && s.connections.status === "not-started" ? "not-started" : "in-progress") as "completed" | "in-progress" | "not-started" };
  }).sort((a,b) => b.total - a.total || (a.elapsedMs ?? Infinity) - (b.elapsedMs ?? Infinity) || a.name.localeCompare(b.name));
  let rank = 0;
  return rows.map((row, i) => { if (i === 0 || row.total !== rows[i-1].total || row.elapsedMs !== rows[i-1].elapsedMs) rank = i + 1; return { ...row, rank }; });
};
