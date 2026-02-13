# Phase 4: Interactions and Action Pipeline (Web)

> **Depends on:** `docs/web-implementation/PHASE_03_5_ISOMETRIC_TIMECUBE.md`
> **Enables:** Phase 5 (detection and failure states beyond `Won`)
> **Design References:** `docs/web-design/GAME_STATE.md`, `docs/web-design/CORE_DATA.md`, `docs/web-design/MATH_MODEL.md`

---

## Goal

Introduce gameplay interactions on top of the current movement/rift/object foundation:
- push
- pull
- deterministic action pipeline (`validate -> apply -> propagate -> check`)
- action history and structured outcomes

Phase 4 keeps detection and paradox systems out of scope.
Phase 4 must also establish an extensible interaction architecture so future actions can be added with minimal reducer churn.

---

## Status

- `Status`: Planned

---

## Locked Rules

1. Truth boundaries remain unchanged:
- player truth: `WorldLineState`
- object truth: `TimeCube` occupancy
2. Each successful action increments turn `n` by exactly `1`.
3. Interactions are normal-time actions: `t -> t + 1` (no same-slice edits).
4. Reducer behavior must remain deterministic and pure.
5. All interaction validity must be represented by typed error/result shapes.

---

## Scope

### In Scope

- Push/pull action definitions and validation
- Chain resolution for movable objects
- Object relocation and forward propagation baseline
- Structured action outcomes for UI/debug/history
- Input wiring and sidebar status updates
- Extensible interaction-handler registry and module boundaries

### Out of Scope

- Detection (`Detected`) logic
- Grandfather paradox checks (`Paradox`) beyond current self-intersection
- Advanced enemy AI behavior
- Full level/data loader redesign

---

## Extensibility Architecture (Required)

New interactions in future phases (for example, tool use, tunnel activation, scripted triggers) must be added as isolated handlers.

### Handler-first model

Each action kind is implemented as a handler module:
- `validate(context, action) -> Result<ValidatedPlan, InteractionError>`
- `apply(context, validatedPlan) -> AppliedMutation`
- `propagate(context, appliedMutation) -> PropagationResult`
- `check(context, appliedMutation) -> PostCheckResult`

### Registry-first dispatch

Reducer pipeline dispatches through a registry keyed by `action.kind`.
Adding a new interaction should require:
1. Add action type variant.
2. Add one handler module.
3. Register handler in registry map.

No ad hoc branching explosion in the reducer.

### Suggested folder layout

`frontend/src/game/interactions/`
- `types.ts` (shared handler contracts)
- `registry.ts` (action kind -> handler)
- `move.ts`
- `wait.ts`
- `rift.ts`
- `push.ts`
- `pull.ts`
- future: `useTool.ts`, `activateTunnel.ts`, `trigger.ts`

### Design rule

Common pipeline and shared validation helpers live in shared modules.
Action-specific rules stay inside handler modules.

---

## Interaction Semantics (Phase 4 Baseline)

## Push (`Push(direction)`)

Given player at `P(t)`:
1. Compute `nextPlayer = adjacent(P, direction)` at `t+1`.
2. If `nextPlayer` is empty: treat as normal move (no push needed).
3. If occupied by pushable chain:
- collect contiguous pushable objects along `direction`
- require chain length `<= maxPushChain`
- require first free target cell after chain
- shift chain by one cell along `direction` at `t+1`
- move player into `nextPlayer` at `t+1`

## Pull (`Pull(direction)`)

Given player at `P(t)`:
1. Compute `nextPlayer = adjacent(P, direction)` at `t+1`.
2. Require `nextPlayer` empty for player movement.
3. Compute `behind = adjacent(P, opposite(direction))` at `t`.
4. Require pullable object at `behind`.
5. Move that object into player's previous cell `P` at `t+1`.
6. Move player into `nextPlayer` at `t+1`.

Notes:
- If conditions fail, action is rejected with typed interaction error.
- Objects without `Pushable`/`Pullable` are not movable by these actions.

---

## Interface-First Contracts

### Core Interaction Types (`frontend/src/core/`)

Suggested module: `frontend/src/core/interactions.ts`

```ts
type InteractionAction =
  | { kind: 'Move'; direction: Direction2D }
  | { kind: 'Wait' }
  | { kind: 'ApplyRift'; instruction?: RiftInstruction }
  | { kind: 'Push'; direction: Direction2D }
  | { kind: 'Pull'; direction: Direction2D };

type InteractionConfig = {
  maxPushChain: number;
  allowPull: boolean;
};

type InteractionOutcome =
  | { kind: 'Moved'; to: Position3D }
  | { kind: 'Rifted'; to: Position3D; mode: RiftInstruction['kind'] }
  | { kind: 'Pushed'; to: Position3D; movedObjectIds: string[] }
  | { kind: 'Pulled'; to: Position3D; movedObjectIds: string[] }
  | { kind: 'Blocked'; reason: InteractionError };

type InteractionError =
  | { kind: 'OutOfBounds' }
  | { kind: 'TimeBoundary' }
  | { kind: 'BlockedByObject'; objectId?: string }
  | { kind: 'NotPushable' }
  | { kind: 'NotPullable' }
  | { kind: 'PushChainTooLong'; length: number; max: number }
  | { kind: 'NoSpaceToPush' }
  | { kind: 'NothingToPull' }
  | { kind: 'SelfIntersection' }
  | { kind: 'InvalidRiftTarget' }
  | { kind: 'Internal'; message: string };
```

### Game Interaction Contracts (`frontend/src/game/interactions/`)

```ts
type InteractionContext = {
  state: GameState;
};

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

type InteractionRegistry = {
  [K in InteractionAction['kind']]: InteractionHandler<K>;
};
```

### TimeCube Helpers (`frontend/src/core/timeCube.ts`)

Add helper APIs for interaction planning:
- query adjacent occupancy by direction
- collect contiguous push chain
- simulate/validate relocation set before commit
- commit relocation set at target time slice

### Game State (`frontend/src/game/gameSlice.ts`)

Add state fields:
- `history: Array<{ turn: number; action: InteractionAction; outcome: InteractionOutcome }>`
- `interactionConfig: InteractionConfig`

`phase` remains at least:
- `Playing | Won` in Phase 4

---

## Action Pipeline Contract

Implement a single reducer pipeline for all active actions:

1. **Validate**
- bounds
- time boundary
- occupancy / component constraints
- world-line constraints

2. **Apply**
- update world line and player position
- apply object relocations for push/pull
- apply rift resolution when needed

3. **Propagate**
- baseline forward propagation for moved object occupancy from `t+1` onward
- deterministic, no randomness

4. **Check**
- win condition (`hasExit`)
- write status string + typed outcome
- append history entry

---

## Implementation Plan

1. Add interaction contracts and helper resolvers in `core`:
- `interactions.ts`
- (optional split) `pushPull.ts`

2. Add handler-first interaction framework in `game/interactions/`:
- shared handler contracts
- registry-based dispatch
- migrate existing move/wait/rift through handlers (before push/pull)

3. Extend `timeCube.ts` with relocation planning/commit helpers for moved objects.

4. Refactor `gameSlice.ts` to use unified action pipeline for:
- move
- wait
- rift
- push
- pull

5. Add reducer actions:
- `push(direction)`
- `pull(direction)`
- `setInteractionConfig(partial)`

6. Update keyboard wiring in `GameShell`:
- propose defaults:
  - `Shift+WASD` = push
  - `Alt+WASD` or dedicated keys for pull

7. Update sidebar status:
- last action type
- outcome summary
- history length

8. Keep render style unchanged; only reflect moved objects from updated occupancy.

---

## Test Requirements

1. Core interaction tests
- push chain resolve success/failure
- pull success/failure
- chain length limit
- blocked target behavior

2. Reducer tests
- push updates player + object positions at `t+1`
- pull updates player + object positions at `t+1`
- invalid push/pull do not mutate turn/worldline/cube
- history records action and outcome

3. Handler contract tests
- every registered handler has validate/apply/propagate/check coverage
- registry dispatch resolves every action kind deterministically

4. Regression tests
- existing move/wait/rift tests continue to pass
- win condition still works with interaction paths

---

## Acceptance Criteria

1. Push and pull actions are available and deterministic.
2. Interaction validity uses typed errors and clear status outcomes.
3. Successful interactions mutate both player world line and object occupancy correctly.
4. History records actions and outcomes per turn.
5. Adding a new interaction requires handler+registry changes, not reducer rewrite.
6. Existing Phase 2/3/3.5 behaviors are not regressed.
7. `npm run lint` and `npm run test` pass.

---

## Risks and Mitigations

1. Ambiguous push/pull semantics
- Mitigation: lock exact movement rules above before coding

2. Occupancy propagation bugs after interaction
- Mitigation: add planner + commit helpers and property-style test scenarios

3. Reducer complexity growth
- Mitigation: centralize pipeline in pure helper functions and keep reducer thin
