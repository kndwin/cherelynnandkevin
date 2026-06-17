import { WORDLE_ALLOWED_WORD_SET } from "./wordle.allowed-words.ts";

export const WORDLE_ANSWER = "AROSE";
export const WORDLE_GUESS_LENGTH = WORDLE_ANSWER.length;
export const WORDLE_MAX_GUESSES = 6;

export type TileStatus = "empty" | "filled" | "correct" | "present" | "absent";

export type ScoredLetter = {
  readonly letter: string;
  readonly status: Exclude<TileStatus, "empty" | "filled">;
};

export const normalizeGuess = (value: string): string => value.replace(/[^a-z]/gi, "").toUpperCase();

export const isAllowedWord = (value: string): boolean => {
  const guess = normalizeGuess(value);

  return guess.length === WORDLE_GUESS_LENGTH && WORDLE_ALLOWED_WORD_SET.has(guess);
};

export const scoreGuess = (guessValue: string, answerValue = WORDLE_ANSWER): readonly ScoredLetter[] => {
  const guess = normalizeGuess(guessValue).slice(0, WORDLE_GUESS_LENGTH).split("");
  const answer = normalizeGuess(answerValue).slice(0, WORDLE_GUESS_LENGTH).split("");
  const statuses: Array<ScoredLetter["status"]> = Array.from({ length: WORDLE_GUESS_LENGTH }, () => "absent");
  const remaining = new Map<string, number>();

  for (let index = 0; index < WORDLE_GUESS_LENGTH; index += 1) {
    if (guess[index] === answer[index]) {
      statuses[index] = "correct";
      continue;
    }

    remaining.set(answer[index], (remaining.get(answer[index]) ?? 0) + 1);
  }

  for (let index = 0; index < WORDLE_GUESS_LENGTH; index += 1) {
    if (statuses[index] === "correct") {
      continue;
    }

    const letter = guess[index];
    const count = remaining.get(letter) ?? 0;

    if (count > 0) {
      statuses[index] = "present";
      remaining.set(letter, count - 1);
    }
  }

  return guess.map((letter, index) => ({ letter, status: statuses[index] }));
};
