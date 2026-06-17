import { assign, setup } from "xstate";
import {
  WORDLE_ANSWER,
  WORDLE_GUESS_LENGTH,
  WORDLE_MAX_GUESSES,
  isAllowedWord,
  normalizeGuess,
  scoreGuess,
} from "./wordle.logic.ts";

export type Guess = {
  readonly letters: string;
  readonly score: ReturnType<typeof scoreGuess>;
};

export type KeyboardLetterStatus = "correct" | "present" | "absent";

type Context = {
  readonly answer: string;
  readonly currentGuess: string;
  readonly guesses: readonly Guess[];
  readonly message: string;
  readonly keyboard: Readonly<Record<string, KeyboardLetterStatus>>;
};

type Events =
  | { readonly type: "letter"; readonly letter: string }
  | { readonly type: "delete" }
  | { readonly type: "submit" }
  | { readonly type: "reset" };

const keyboardRank: Record<KeyboardLetterStatus, number> = {
  absent: 0,
  present: 1,
  correct: 2,
};

const mergeKeyboard = (
  keyboard: Context["keyboard"],
  score: Guess["score"],
): Context["keyboard"] => {
  const next = { ...keyboard };

  for (const item of score) {
    const current = next[item.letter];

    if (current === undefined || keyboardRank[item.status] > keyboardRank[current]) {
      next[item.letter] = item.status;
    }
  }

  return next;
};

const initialContext = (): Context => ({
  answer: WORDLE_ANSWER,
  currentGuess: "",
  guesses: [],
  message: "Guess the five-letter word.",
  keyboard: {},
});

export const wordleMachine = setup({
  types: {
    context: {} as Context,
    events: {} as Events,
  },
  guards: {
    isIncomplete: ({ context }) => context.currentGuess.length !== WORDLE_GUESS_LENGTH,
    isUnknownWord: ({ context }) => !isAllowedWord(context.currentGuess),
    isWinningGuess: ({ context }) => context.currentGuess === context.answer,
    isLastGuess: ({ context }) => context.guesses.length + 1 >= WORDLE_MAX_GUESSES,
  },
  actions: {
    addLetter: assign(({ context, event }) => {
      if (event.type !== "letter" || context.currentGuess.length >= WORDLE_GUESS_LENGTH) {
        return {};
      }

      const [letter] = normalizeGuess(event.letter);

      return letter === undefined
        ? {}
        : {
            currentGuess: `${context.currentGuess}${letter}`,
            message: "",
          };
    }),
    deleteLetter: assign(({ context }) => ({
      currentGuess: context.currentGuess.slice(0, -1),
      message: "",
    })),
    rejectIncomplete: assign(() => ({ message: `Enter ${WORDLE_GUESS_LENGTH} letters.` })),
    rejectUnknownWord: assign(() => ({ message: "Not a real word." })),
    submitGuess: assign(({ context }) => {
      const score = scoreGuess(context.currentGuess, context.answer);
      const nextGuess = { letters: context.currentGuess, score };

      return {
        currentGuess: "",
        guesses: [...context.guesses, nextGuess],
        keyboard: mergeKeyboard(context.keyboard, score),
        message: "",
      };
    }),
    setWinMessage: assign(() => ({ message: "You found AROSE." })),
    setLossMessage: assign(({ context }) => ({ message: `The word was ${context.answer}.` })),
    resetGame: assign(() => initialContext()),
  },
}).createMachine({
  id: "Wordle",
  context: initialContext(),
  initial: "Playing",
  states: {
    Playing: {
      on: {
        letter: { actions: "addLetter" },
        delete: { actions: "deleteLetter" },
        submit: [
          {
            actions: "rejectIncomplete",
            guard: "isIncomplete",
          },
          {
            actions: "rejectUnknownWord",
            guard: "isUnknownWord",
          },
          {
            actions: "submitGuess",
            target: "Won",
            guard: "isWinningGuess",
          },
          {
            actions: "submitGuess",
            target: "Lost",
            guard: "isLastGuess",
          },
          { actions: "submitGuess" },
        ],
        reset: { actions: "resetGame" },
      },
    },
    Won: {
      entry: "setWinMessage",
      on: {
        reset: { target: "Playing", actions: "resetGame" },
      },
    },
    Lost: {
      entry: "setLossMessage",
      on: {
        reset: { target: "Playing", actions: "resetGame" },
      },
    },
  },
});
