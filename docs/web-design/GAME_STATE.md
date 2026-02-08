# Game State Design (Web)

> **Module target:** `frontend/src/game/`
> **Status:** Web rewrite

This document defines the game state container, action pipeline, and validation rules for the web app.

---

## Conceptual Model

### Immutable-By-Convention State
All actions operate on a cloned state. The previous state is preserved for replay/debugging.

```
applyAction(state, action): GameState
```

### Player as Source of Truth
- Player position is derived from `WorldLineState` (`currentPosition(worldLine)`).
- Reducer-level move/rift validity is evaluated through world-line extension helpers.
- `TimeCube` evolves into occupancy truth for non-player objects (Phase 3+).

Truth boundaries:
1. Never derive player history from `TimeCube`.
2. Never validate object blocking from `WorldLineState`.
3. Rendering at slice `t` reads both sources:
   - player selves from `positionsAtTime(t)` on `WorldLineState`
   - objects from `TimeCube` occupancy at `t`
4. Reducer conflict rules decide outcomes when player/object share `(x, y, t)` (for example, blocked or win).

---

## Type Hierarchy (Web)

```
GameState
  - cube: TimeCube
  - worldLine: WorldLineState
  - currentTime: number
  - timeDepth: number
  - riftSettings: RiftSettings
  - riftResources: RiftResources
  - phase: GamePhase
  - turn: number
  - history: Action[]
  - config: GameConfig
  - initialCube: TimeCube
  - initialWorldLine: WorldLineState

Action
  - Move(direction)
  - Wait
  - ApplyRift(instruction?)
  - ConfigureRiftSettings(partial)
  - Push(direction)
  - Pull(direction)
  - Restart

ActionResult
  - state
  - outcome
  - movedEntities
  - propagation?
```

---

## GamePhase

| Phase | Meaning |
|-------|---------|
| `Playing` | Active play |
| `Won` | Exit reached |
| `Detected` | Player seen |
| `Paradox` | Paradox triggered |
| `Restarted` | Restart action applied |

---

## Action Pipeline

1. **Validate** action
2. **Preview** (optional UI)
3. **Apply** (clone and mutate)
4. **Propagate** (if needed)
5. **Check** win/lose

---

## Validation Rules

### Move / Wait
- In bounds
- Not blocked
- No self-intersection
- `t` advances by 1
- Implemented via `extendNormal(...)` on `WorldLineState`

### Rift
- Resolve target through reusable core primitive (`resolveRift`)
- Validate in order:
  - target time/space bounds
  - resource/cost constraints (if enabled)
  - world-line self-intersection
- Extend world line with `extendViaRift`
- Advance turn `n` after successful extension

### Push / Pull
- Adjacent entity exists
- Chain length ≤ max
- Targets in bounds and unblocked
- Propagate moved entities forward

---

## Error Model

```ts
type MoveError =
  | { kind: 'OutOfBounds'; x: number; y: number; t: number }
  | { kind: 'Blocked'; x: number; y: number; t: number; entityId: string }
  | { kind: 'SelfIntersection'; x: number; y: number; t: number }
  | { kind: 'TimeOverflow'; t: number; maxT: number };

type ActionError =
  | { kind: 'GameNotActive'; phase: GamePhase }
  | { kind: 'MoveBlocked'; reason: MoveError }
  | { kind: 'NoRiftHere' }
  | { kind: 'InvalidRiftTarget' }
  | { kind: 'NothingToPush' }
  | { kind: 'PushBlocked' }
  | { kind: 'PushChainTooLong'; length: number; max: number }
  | { kind: 'NothingToPull' }
  | { kind: 'NotPullable'; entityId: string }
  | { kind: 'Internal'; message: string };
```

---

## State Management in React

Recommended approach:
- Keep core logic in pure functions
- UI uses Redux Toolkit store + typed hooks

Example:
```
const store = configureStore({ reducer: { game: gameReducer } })
```

The reducer should call pure core helpers (`extendNormal`, `extendViaRift`, `resolveRift`) and return a deterministic next `GameState`.

---

## Related Documents
- `CORE_DATA.md`
- `MATH_MODEL.md`
