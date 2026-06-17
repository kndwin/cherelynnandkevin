const uiFilePatterns = ["*.ui.tsx"] as const;

const uiRules = ["presentational-only", "props-in-jsx-out", "no-effect-client-imports", "no-xstate-imports"] as const;

export { uiFilePatterns, uiRules };
