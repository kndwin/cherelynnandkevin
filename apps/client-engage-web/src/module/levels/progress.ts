export const levelProgressKey = "cherelynnandkevin:level-progress";

type LevelProgress = {
  readonly wordleSolved: boolean;
  readonly connectionsSolved: boolean;
  readonly scrollsFinished: boolean;
};

const defaultProgress: LevelProgress = {
  wordleSolved: false,
  connectionsSolved: false,
  scrollsFinished: false,
};

export const getLevelProgress = (): LevelProgress => {
  const stored = globalThis.localStorage?.getItem(levelProgressKey);

  if (stored === null || stored === undefined) {
    return defaultProgress;
  }

  try {
    const parsed = JSON.parse(stored) as Partial<LevelProgress>;

    return {
      wordleSolved: parsed.wordleSolved === true,
      connectionsSolved: parsed.connectionsSolved === true,
      scrollsFinished: parsed.scrollsFinished === true,
    };
  } catch {
    return defaultProgress;
  }
};

export const markWordleSolved = () => {
  const progress = getLevelProgress();

  globalThis.localStorage?.setItem(levelProgressKey, JSON.stringify({ ...progress, wordleSolved: true } satisfies LevelProgress));
};

export const markConnectionsSolved = () => {
  const progress = getLevelProgress();

  globalThis.localStorage?.setItem(
    levelProgressKey,
    JSON.stringify({ ...progress, connectionsSolved: true } satisfies LevelProgress),
  );
};

export const markScrollsFinished = () => {
  const progress = getLevelProgress();

  globalThis.localStorage?.setItem(levelProgressKey, JSON.stringify({ ...progress, scrollsFinished: true } satisfies LevelProgress));
};

export const hasLevelOverride = (level: number) => {
  if (typeof globalThis.location === "undefined") {
    return false;
  }

  return new URLSearchParams(globalThis.location.search).get("level") === String(level);
};
