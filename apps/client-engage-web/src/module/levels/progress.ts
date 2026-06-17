export const levelProgressKey = "cherelynnandkevin:level-progress";

type LevelProgress = {
  readonly wordleSolved: boolean;
  readonly connectionsSolved: boolean;
};

const defaultProgress: LevelProgress = {
  wordleSolved: false,
  connectionsSolved: false,
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

export const hasLevelOverride = (level: number) => {
  if (typeof globalThis.location === "undefined") {
    return false;
  }

  return new URLSearchParams(globalThis.location.search).get("level") === String(level);
};
