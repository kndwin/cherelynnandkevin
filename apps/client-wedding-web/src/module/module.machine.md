# Module Machines

Applies to: `module/**/*.machine.ts`
Enforced by: `./module.machine.lint.ts`

`*.machine.ts` files define XState machines and typed machine contracts.

## Rules

- Keep machine files React-free and JSX-free.
- Keep machine files UI-free; do not import `*.ui.tsx` or DOM helpers.
- Use `@typeonce/effect-xstate` for Effect-backed async actors.
- Export named machine values and event/context types used by callers.
- Let machines own user-flow state and async status transitions.
