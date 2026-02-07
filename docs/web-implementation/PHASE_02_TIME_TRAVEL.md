# Phase 2: Time Axis + Rift Travel (Web)

> **Depends on:** `docs/web-implementation/PHASE_01_MINIMAL_BOARD.md`
> **Enables:** Phase 3 (objects and propagation)
> **Design Reference:** `docs/web-design/MATH_MODEL.md` (Sections 9 and 10)

---

## Goal

Introduce cube-time (`t`) and rift-based time travel while preserving the Phase 1 control/render foundation.

Phase 2 adds temporal state and world-line constraints, but still avoids object complexity (walls/enemies/pushable entities).

---

## Locked Rules

1. Distinguish **turn time** (`n`) from **cube time** (`t`).
2. Use committed-prefix semantics:
   - `P_n`: world-line prefix committed at turn `n`
   - `S_n(t)`: realized slice at cube-time `t` under `P_n`
3. Self-intersection is forbidden at coordinate level: `(x, y, t)` cannot repeat.
4. Strict observation-consistency mode is deferred.

---

## Scope

### In Scope
- Introduce 3D position type with `t`
- Add world-line data structure and prefix semantics
- Add reusable rift action path and validation
- Add `currentTime` and `turn` display in UI
- Render current time slice only
- Show multiple selves on same `t` when they exist (current + past-turn)

### Out of Scope
- Walls, enemies, exits, and boxes
- Push/pull interactions
- Detection model
- Grandfather paradox checks

---

## Interface-First Contracts

### Core Types (`frontend/src/core/`)

1. `Position3D`
   - `{ x: number; y: number; t: number }`
2. `WorldLine`
   - `path: Position3D[]`
   - `visited: Set<string>` where key is `x,y,t`
3. Key methods
   - `wouldIntersect(position: Position3D): boolean`
   - `extendNormal(next: Position3D): Result<void, WorldLineError>`
   - `extendViaRift(next: Position3D): Result<void, WorldLineError>`
   - `positionsAtTime(t: number): Array<{ position: Position3D; turn: number }>`
4. `Rift` resolver module
   - `RiftInstruction`: `default | delta | tunnel`
   - `resolveRift(input): Result<RiftResolution, RiftResolveError>`
   - supports configurable delta and explicit space-time tunnel targets

### Game State (`frontend/src/game/`)

1. `GameState` additions
   - `timeDepth: number`
   - `currentTime: number`
   - `worldLine: WorldLineState`
2. Actions
   - `movePlayer2D(direction)`
   - `waitTurn()`
   - `ApplyRift(instruction?)` via reducer action `applyRift(...)`
   - `ConfigureRiftSettings(partial)` via reducer action `configureRiftSettings(...)`
3. Validations
   - Bounds on `(x, y, t)`
   - Self-intersection via `worldLine.visited`
   - Normal move requires `t + 1`
   - Rift move can set arbitrary valid `(x, y, t)` through tunnel instructions

### Render (`frontend/src/render/`)

1. Board still renders one `t` slice.
2. When multiple world-line points share current `t`:
   - latest turn index = current self (dark fill)
   - earlier turns = past-turn selves (gray fill)

---

## Implementation Plan

1. Add new types and world-line module in `core`.
2. Refactor reducer state from 2D player position to world-line driven position.
3. Add reusable rift resolver integration for Phase 2:
   - `Space` triggers default `ApplyRift`
   - `[` and `]` adjust `defaultDelta` through `ConfigureRiftSettings`
   - tunnel instruction path can target explicit `(x, y, t)` when needed
4. Update sidebar:
   - show `turn`, `t`, world-line length, and default rift delta.
5. Update canvas renderer to draw same-slice multiple selves.
6. Keep styling and layout unchanged from Phase 1.

---

## Test Requirements

1. `core/worldLine` unit tests:
   - normal extension success/failure
   - rift extension success/failure
   - self-intersection rejection
   - `positionsAtTime` ordering by turn
2. `game` reducer tests:
   - move increments `n` and `t`
   - rift increments `n`, changes `t` non-monotonically
   - configurable default delta affects `ApplyRift` behavior
   - invalid rift rejected with status/error
3. Render sanity checks:
   - current self and past-turn self use distinct fills

---

## Exit Criteria

1. Player can move in space with automatic `t + 1` progression.
2. Player can rift to valid past/future `(x, y, t)` according to Phase 2 constraints.
3. Self-intersection at `(x, y, t)` is always blocked.
4. Sidebar reflects `n` and `t` separately, plus default rift delta.
5. Lint passes and Phase 2 tests pass.
