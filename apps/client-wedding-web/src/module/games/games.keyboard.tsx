const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
export const tileFeedback = {
  correct: "bg-tile-correct border-tile-correct text-paper",
  present: "bg-tile-present border-tile-present text-paper",
  absent: "bg-tile-absent border-tile-absent text-paper",
};

export const GamesKeyboard = ({ guesses, disabled, canSubmit, onKey }: {
  guesses: readonly { readonly word: string; readonly tiles: readonly (keyof typeof tileFeedback)[] }[];
  disabled: boolean;
  canSubmit: boolean;
  onKey: (key: string) => void;
}) => {
  const keys: Record<string, keyof typeof tileFeedback> = {};
  const strength = { absent: 0, present: 1, correct: 2 };
  for (const row of guesses) row.tiles.forEach((tile, index) => {
    const letter = row.word[index].toUpperCase();
    if (keys[letter] === undefined || strength[tile] > strength[keys[letter]]) keys[letter] = tile;
  });
  return <div role="group" aria-label="Wordle keyboard" className="grid gap-1.5">{rows.map((row, index) => <div key={row} className="flex justify-center gap-1">{(index === 2 ? ["Enter", ...row, "Backspace"] : [...row]).map(key => <button key={key} type="button" aria-label={key === "Backspace" ? "Delete last letter" : keys[key] ? `${key}: ${keys[key]}` : key} disabled={disabled || (key === "Enter" && !canSubmit)} onClick={() => onKey(key)} className={`min-h-12 min-w-0 flex-1 rounded-none border px-0.5 font-sans text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${keys[key] ? tileFeedback[keys[key]] : "border-border bg-game-hover text-foreground hover:bg-secondary"} ${key.length > 1 ? "grow-[1.5]" : ""}`}>{key === "Backspace" ? "⌫" : key}</button>)}</div>)}</div>;
};
