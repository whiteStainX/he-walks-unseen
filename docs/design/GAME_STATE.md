# Game State Design

> **Module:** `src/game/`
> **Status:** Implemented (Phase 3)

This document describes the game logic layer: state management, action processing, validation, and propagation integration.

---

## Conceptual Model

### Clone-Before-Mutate State

All actions operate on a cloned `GameState`. The original state is never mutated.

```
apply_action(state, action):
    new_state = state.clone()
    mutate new_state
    return new_state
```

This guarantees determinism and makes replay/debugging straightforward.

### Player Source of Truth

The player's authoritative position is the **WorldLine**:
- `GameState::player_position()` reads `world_line.current()`
- The player entity in the `TimeCube` is updated to match on each action
- Player is **not** time-persistent

---

## Type Hierarchy

```
GameState
    ├── TimeCube         ← full space-time world
    ├── WorldLine        ← player path (turn-ordered)
    ├── GamePhase        ← Playing / Won / Detected / Paradox / Restarted
    ├── GameConfig       ← light speed, push chain, metadata
    ├── history          ← action log for replay/debugging
    └── turn             ← current turn counter

Action
    ├── Move(Direction)
    ├── Wait
    ├── UseRift
    ├── Push(Direction)
    ├── Pull(Direction)
    └── Restart

ActionResult
    ├── ActionOutcome
    ├── moved_entities
    └── propagation (optional)
```

---

## GameState Anatomy

### Fields

```rust
GameState {
    cube: TimeCube,
    world_line: WorldLine,
    player_id: EntityId,
    phase: GamePhase,
    turn: usize,
    history: Vec<Action>,
    config: GameConfig,
    initial_cube: TimeCube,
    initial_world_line: WorldLine,
}
```

**Notes:**
- `initial_cube` / `initial_world_line` are snapshots for **Restart**.
- `history` is **replay/debug only** in Phase 3 (Undo deferred).

### GamePhase Meaning

| Phase | Meaning |
|-------|---------|
| `Playing` | Active play, actions allowed |
| `Won` | Player reached exit |
| `Detected` | Enemy detected player (Phase 5) |
| `Paradox` | Paradox created (Phase 7) |
| `Restarted` | Restart was invoked |

### GameConfig Fields

| Field | Purpose |
|-------|---------|
| `light_speed` | Vision cone speed (Phase 5) |
| `max_push_chain` | Max push chain length |
| `level_name` | Display name |
| `level_id` | Progression identifier |
| `allow_undo` | Reserved for Phase 6 |

---

## Critical Design Decisions

### 1. Immutable-by-Convention GameState

**Chosen:** Clone-before-mutate for all actions.

**Rationale:**
- Deterministic: same input state + action = same output
- Debugging: inspect old states
- Replay: reconstruct from action history

**Trade-off:** Extra cloning; acceptable for turn-based gameplay.

### 2. Turn-Ordered WorldLine

The WorldLine is turn-ordered (not time-ordered), allowing rifts to travel into the past.

```
Turn 0: (5,5,0)
Turn 1: (6,5,1)
Turn 2: (3,3,0)  // rift to past
```

Self-intersection is forbidden: `(x,y,t)` may appear at most once.

### 3. Two-Layer Error Model

Errors are separated by scope:

```
MoveError   → positional validation
ActionError → action-level validation (wraps MoveError)
```

This keeps position checks reusable across actions.

### 4. Propagation: Replace & Wrap

Propagation uses an **authoritative module** (`core/propagation.rs`).
Phase 2 `TimeCube::propagate_*` methods are wrappers that call the new engine.

---

## Invariants

1. `GameState::player_position()` **always** equals `world_line.current()`.
2. Only the **current slice** contains the player entity.
3. `turn` equals `world_line.current_turn()` when non-empty.
4. `history.len()` equals the number of applied actions since start/reset.

---

## Action Pipeline

Every action follows the same steps:

```
1. VALIDATE  → is the action allowed?
2. PREVIEW   → what would happen? (UI)
3. APPLY     → mutate cloned GameState
4. PROPAGATE → update time slices if needed
5. CHECK     → win/lose conditions
```

---

## Time Slice Semantics

- Validation uses **current slice** (`t = current_time`)
- Application updates **next slice** (`t + 1`)
- Rifts are exception: target may jump to any `t`

---

## Validation Rules

### Move / Wait
- Target must be in bounds (`0 <= x < width`, `0 <= y < height`, `0 <= t < time_depth`)
- Target must not be blocked by `BlocksMovement`
- Target must not self-intersect world line
- Time must advance by 1 (except rift)

### Rift
- Player must stand on a rift in current slice
- Target must be in bounds
- Target must not self-intersect
- Grandfather paradox not checked in Phase 3

### Push
- Adjacent `Pushable` entity in direction
- Push chain length ≤ `max_push_chain`
- All targets in chain are in bounds and not blocked
- Player moves to `t + 1`; pushed entities placed at `t + 1`

### Pull
- Adjacent `Pullable` entity opposite direction
- Player can move to target at `t + 1`
- Pulled entity moves into player's old position at `t + 1`

---

## Propagation Integration

Propagation is applied after any action that changes entity positions:

| Action | Propagation |
|--------|-------------|
| Move / Wait | None |
| UseRift | None |
| Push | Propagate pushed entities forward |
| Pull | Propagate pulled entity forward |

The `ActionResult` contains optional propagation details:

```rust
ActionResult {
  propagation: Option<PropagationResult>,
}
```

---

## Restart Behavior

`Action::Restart` resets the game to initial snapshots:
- `cube = initial_cube.clone()`
- `world_line = initial_world_line.clone()`
- `phase = Playing`
- `turn = 0`
- `history` cleared

Note: `ActionOutcome::Restarted` is returned for UI feedback, but the game
phase is set to `Playing` to allow immediate play.

---

## ActionResult Semantics

```rust
ActionResult {
    state: GameState,
    outcome: ActionOutcome,
    moved_entities: Vec<(EntityId, Position, Position)>,
    propagation: Option<PropagationResult>,
}
```

- `moved_entities` includes the player and any pushed/pulled entities.
- `propagation` is present only for push/pull (or other propagation-triggering actions).

---

## Error Types

```rust
enum MoveError {
    OutOfBounds { x, y, t },
    Blocked { x, y, t, entity_id, entity_type },
    SelfIntersection { x, y, t },
    InvalidDirection,
    TimeOverflow { t, max_t },
}

enum ActionError {
    GameNotActive { phase },
    MoveBlocked(MoveError),
    NoRiftHere,
    InvalidRiftTarget { target, reason },
    NothingToPush { direction },
    PushBlocked { blocked_at },
    PushChainTooLong { chain_length, max },
    NothingToPull { direction },
    NotPullable { entity_id },
    Internal(String),
}
```

---

## Action Outcomes

```rust
enum ActionOutcome {
    Moved { from, to },
    Waited { at },
    Rifted { from, to },
    Pushed { player_to, pushed },
    Pulled { player_to, pulled_id, pulled_to },
    Restarted,
    Won { at },
    Detected { by, seen_at },
}
```

---

## Public API Surface

```rust
apply_action(state, action) -> ActionResult
preview_action(state, action) -> ActionOutcome
validate_action(state, action) -> Result<(), ActionError>
```

---

## Propagation Details

Propagation results may include warnings:

```rust
PropagationWarning {
    EntityCollision { entity_a, entity_b, at },
    OutOfBounds { entity_id, attempted },
}
```

Default propagation **does not** skip collisions unless `skip_collisions` is enabled.

---

## History and Undo

- `history` is kept for replay/debugging in Phase 3.
- Undo is **deferred** to Phase 6.
- `allow_undo` in config is reserved for Phase 6.

---

## Deferred Features

| Feature | Phase | Notes |
|---------|-------|-------|
| Enemy detection (light cones) | Phase 5 | Sets `GamePhase::Detected` |
| Grandfather paradox detection | Phase 7 | Sets `GamePhase::Paradox` |
| Undo | Phase 6 | Requires state snapshots or replay |

---

## Usage Example

```rust
use he_walks_unseen::core::*;
use he_walks_unseen::game::*;

let mut cube = TimeCube::new(10, 10, 20);
cube.spawn(Entity::player(Position::new(1, 1, 0)))?;
cube.spawn_and_propagate(Entity::exit(Position::new(8, 8, 0)))?;

let state = GameState::from_cube(cube)?;
let result = apply_action(&state, Action::Move(Direction::East))?;

assert_eq!(result.state.player_position(), Position::new(2, 1, 1));
```

---

## Related Documents

- [Core Data Design](CORE_DATA.md)
- [Phase 3 Implementation Plan](../implementation/PHASE_03_GAME_STATE.md)
