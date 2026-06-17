const machineFilePatterns = ["*.machine.ts"] as const;

const machineRules = ["xstate-only", "no-react", "no-jsx", "no-ui-imports", "effect-xstate-actors"] as const;

export { machineFilePatterns, machineRules };
