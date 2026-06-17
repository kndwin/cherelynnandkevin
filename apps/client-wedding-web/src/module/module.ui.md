# Module UI

Applies to: `module/**/*.ui.tsx`
Enforced by: `./module.ui.lint.ts`

`*.ui.tsx` files define pure presentational React UI.

## Rules

- Render from props only.
- Keep data fetching, Effect programs, XState actors, navigation, and mutations outside UI files.
- Prefer event callback props over importing clients or machines.
- Local display-only helpers are allowed.
- Export named components and named prop types.
