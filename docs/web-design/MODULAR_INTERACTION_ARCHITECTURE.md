# Modular Interaction Architecture (Web)

> **Purpose:** Define the modular interaction principle so future gameplay actions can be added without reducer rewrites.
> **Scope:** `frontend/src/game/`, `frontend/src/core/`

---

## Principle

Interactions are handler-driven and registry-dispatched.

Adding a new interaction must be a bounded change:
1. Add action type variant.
2. Add one handler module.
3. Register handler in the interaction registry.
4. Add tests for handler + integration.

The reducer pipeline must not grow via large action-specific branching.

---

## Architectural Rules

1. Keep one shared pipeline:
- `validate -> apply -> propagate -> check`

2. Keep action-specific logic in per-action handlers:
- `move.ts`
- `wait.ts`
- `rift.ts`
- `push.ts`
- `pull.ts`
- future: `useTool.ts`, `activateTunnel.ts`, `trigger.ts`

3. Keep shared contracts centralized:
- action types
- outcome/error types
- handler interface
- context shape

4. Keep `WorldLineState` and `TimeCube` truth boundaries unchanged:
- player mutations via world-line operations
- object mutations via occupancy operations

5. Keep handlers pure and deterministic:
- no side effects
- no hidden global state

---

## Suggested Module Layout

`frontend/src/game/interactions/`
- `types.ts` (shared contracts)
- `registry.ts` (kind -> handler map)
- `pipeline.ts` (shared pipeline orchestration)
- `move.ts`
- `wait.ts`
- `rift.ts`
- `push.ts`
- `pull.ts`

Optional shared helpers:
- `frontend/src/core/interactions.ts`
- `frontend/src/core/pushPull.ts`

---

## Handler Contract (Reference)

```ts
type InteractionHandler<K extends InteractionAction['kind']> = {
  kind: K;
  validate: (
    ctx: InteractionContext,
    action: Extract<InteractionAction, { kind: K }>,
  ) => Result<unknown, InteractionError>;
  apply: (ctx: InteractionContext, validated: unknown) => Result<unknown, InteractionError>;
  propagate: (ctx: InteractionContext, applied: unknown) => Result<unknown, InteractionError>;
  check: (ctx: InteractionContext, applied: unknown) => Result<InteractionOutcome, InteractionError>;
};
```

Registry contract:

```ts
type InteractionRegistry = {
  [K in InteractionAction['kind']]: InteractionHandler<K>;
};
```

---

## Testing Rule

Every new interaction requires:
1. Handler unit tests (`validate/apply/propagate/check`)
2. Registry dispatch coverage
3. Reducer integration tests
4. Regression checks for existing interactions

---

## Exit Condition for Any New Interaction

A new interaction is considered modular only if:
1. No reducer pipeline rewrite was required.
2. Existing handler modules were not modified outside shared contracts.
3. Existing interaction tests still pass.

