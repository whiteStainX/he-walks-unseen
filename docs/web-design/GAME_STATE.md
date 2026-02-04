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
- Player position is `worldLine.current()`
- The cube contains a player entity only for rendering convenience

---

## Type Hierarchy (Web)

```
GameState
  - cube: TimeCube
  - worldLine: WorldLine
  - phase: GamePhase
  - turn: number
  - history: Action[]
  - config: GameConfig
  - initialCube: TimeCube
  - initialWorldLine: WorldLine

Action
  - Move(direction)
  - Wait
  - UseRift
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

### Rift
- Rift at current position
- Target in bounds
- No self-intersection

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
- UI uses `useReducer` or a lightweight store

Example:
```
const [state, dispatch] = useReducer(gameReducer, initialState)
```

The reducer should call pure `applyAction()` and return a new `GameState`.

---

## Related Documents
- `CORE_DATA.md`
- `MATH_MODEL.md`
