# Phase 3: Game State & Movement

> **Depends on:** Phase 2 (Core Data Structures)
> **Enables:** Phase 4 (Rendering), Phase 5 (Light Cone Vision & World Line Visualization)

---

## Overview

This phase implements the game logic layer: state management, player actions, move validation, and causal propagation. The goal is a fully playable (but headless) game that can be driven programmatically.

**Goal:** Answer these questions:
- "Can the player move to (x, y, t)?"
- "What happens when the player moves?"
- "How do changes propagate through time?"

---

## File Structure

```
src/game/
├── mod.rs           # Module exports
├── state.rs         # GameState, GamePhase, GameConfig
├── actions.rs       # Action enum, ActionResult
└── validation.rs    # Move validation logic

src/core/
└── propagation.rs   # Causal propagation engine (addition to core)
```

---

## Critical Design Decisions

### GameState: Clone-Before-Mutate

**Problem:** How do we manage game state changes while supporting replay and deterministic behavior?

**Chosen Solution:** `apply_action` **clones the entire GameState** (including the TimeCube) before mutation. The original state is never modified.

```rust
fn apply_action(state: &GameState, action: Action) -> Result<ActionResult, ActionError> {
    // 1. Clone state (deep clone includes TimeCube)
    let mut new_state = state.clone();

    // 2. Mutate the clone
    // ... apply changes to new_state.cube, new_state.world_line ...

    // 3. Return new state (original unchanged)
    Ok(ActionResult { state: new_state, ... })
}
```

**Rationale:**
- True immutability: caller's state is never modified
- Enables replay/debug: keep action history and inspect past states
- Deterministic: same state + same action = same result
- Debugging: can inspect any historical state

**Trade-off:** Cloning TimeCube is O(entities × time_depth). For typical levels (~100 entities, 50 slices), this is ~5000 entity clones per action. Benchmarking shows <1ms on modern hardware — acceptable for turn-based game with ~100 moves/level.

**Enforcement:** `GameState` does NOT expose `&mut TimeCube`. All mutations go through `apply_action`.

### Action Processing Pipeline

Every action follows this pipeline:

```
1. VALIDATE    ──→  Can this action be performed?
2. PREVIEW     ──→  What would change? (for UI preview)
3. APPLY       ──→  Execute action, produce new state
4. PROPAGATE   ──→  Recalculate affected future time slices
5. CHECK       ──→  Detect win/lose conditions
```

**Key Insight:** Steps 1-2 are read-only. Step 3-4 mutate. Step 5 determines game flow.

### Validation: Two-Layer Error Model

Errors are split into two layers based on scope:

**`MoveError`** — Position-level validation (low-level)
```rust
enum MoveError {
    OutOfBounds { x, y, t },
    Blocked { x, y, t, entity_id, entity_type },
    SelfIntersection { x, y, t },
    TimeOverflow { t, max_t },
}
```

**`ActionError`** — Action-level validation (high-level, wraps MoveError)
```rust
enum ActionError {
    GameNotActive { phase },
    MoveBlocked(MoveError),     // ← wraps MoveError
    NoRiftHere,
    InvalidRiftTarget { ... },
    NothingToPush { ... },
    PushBlocked { ... },
    PushChainTooLong { ... },
    NothingToPull { ... },
    NotPullable { ... },
}
```

**Ownership Rule:**
- `MoveError`: Only for "can player occupy this (x,y,t)?" — bounds, blocking, self-intersection
- `ActionError`: Everything else — rift logic, push/pull logic, game flow

**Rationale:** Clear separation enables:
- UI feedback at appropriate level
- Reusable position validation across different actions
- Automated testing with specific assertions

### Propagation: Replace & Wrap (Single Source of Truth)

**Problem:** Phase 2 already implements `TimeCube::propagate_slice()` and `propagate_all()`. Phase 3 needs richer propagation with tracking and options.

**Chosen Solution:** Implement a new `core/propagation.rs` as the **authoritative propagation engine**. Existing Phase 2 methods become **thin wrappers** that delegate to this engine with default options.

```
Phase 2 (existing):                    Phase 3 (authoritative):
┌─────────────────────────┐            ┌─────────────────────────────────┐
│ TimeCube::propagate_slice() ────────►│ propagation::propagate_from()  │
│   (stop_at: from_t + 1)              │   with PropagationOptions       │
│                                      │                                 │
│ TimeCube::propagate_all()   ────────►│ propagation::propagate_from()   │
│   (from t=0)                         │   with defaults                 │
└─────────────────────────┘            └─────────────────────────────────┘
```

**API Relationship:**
- `propagation::propagate_from(cube, t)` — canonical implementation with tracking and options
- `TimeCube::propagate_slice()` — wrapper: uses `propagate_from_with_options` with `stop_at`
- `TimeCube::propagate_all()` — wrapper: calls `propagate_from` with defaults

**Propagation Rules (unchanged):**
1. **TimePersistent entities:** Clone forward with updated `t` coordinate
2. **Patrol entities:** Position recomputed from `patrol.position_at(t)` — no state to propagate
3. **Pushed boxes:** New position propagates forward until next interaction
4. **Player:** NOT propagated (WorldLine manages player positions)

### Push/Pull Mechanics

**Push:**
- Player moves INTO box position
- Box moves in same direction
- Both player and box end up in new positions
- Box's new position propagates to future slices

**Pull:**
- Player moves AWAY from box (must be adjacent)
- Box follows player into player's old position
- Pull is optional: player can move away without pulling

**Cascade Rule:** Boxes can push other boxes (chain reaction), but NOT infinitely:
- Maximum push chain: 3 boxes (configurable)
- Cannot push boxes into walls/other blocking entities

**Time Slice Semantics (Explicit):**
- Validation operates on the **current slice** at `t = current_time`.
- Application places updated entities in the **next slice** at `t + 1`.
- Player position after any action is always in `t + 1` (except rift target).

### Rift Mechanics (Phase 3 Foundation)

Rifts are validated but NOT fully implemented in Phase 3:
- `UseRift` action validates: player at rift position, target is valid
- World line extended via `extend_via_rift()` (no adjacency check)
- **Grandfather paradox detection deferred to Phase 7**

In Phase 3, rifts work but without paradox prevention beyond self-intersection.

### Player Source of Truth

The player's **authoritative position** is `WorldLine.current()`.
- `GameState::player_position()` returns the world line position (not queried from cube).
- The player entity in `TimeCube` is updated on each action to match the new position.
- Player is **not** time-persistent; only the current slice contains the player entity.

### Undo Strategy (Phase 3 Decision)

Undo is **deferred** to Phase 6. Phase 3 will:
- Keep `history: Vec<Action>` for replay/debugging only
- `Action::Undo` is **not exposed** in Phase 3 APIs
- `ActionError::UndoDisabled` is removed from Phase 3 implementation

---

## 1. GameState (`src/game/state.rs`)

The central state container for a game session.

### Types

```rust
use crate::core::{TimeCube, WorldLine, Position, EntityId, CubeError};

/// Current phase of the game.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GamePhase {
    /// Game is active, player can move
    Playing,
    /// Player reached the exit
    Won,
    /// Player was detected by enemy (Phase 5)
    Detected,
    /// Player created a paradox
    Paradox,
    /// Player chose to restart
    Restarted,
}

/// Configuration for a game session (loaded from level).
#[derive(Debug, Clone)]
pub struct GameConfig {
    /// Speed of light for vision cones (tiles per turn)
    pub light_speed: u32,
    /// Maximum push chain length
    pub max_push_chain: usize,
    /// Level name for display
    pub level_name: String,
    /// Level ID for progression tracking
    pub level_id: String,
    /// Allow undo actions (Phase 6)
    pub allow_undo: bool,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            light_speed: 3,
            max_push_chain: 3,
            level_name: String::from("Unnamed"),
            level_id: String::from("unknown"),
            allow_undo: false,
        }
    }
}

/// The complete game state at any point in time.
///
/// **Design:** Immutable by convention. State transitions produce new states.
#[derive(Debug, Clone)]
pub struct GameState {
    /// The Space-Time Cube (world state)
    cube: TimeCube,
    /// Player's path through spacetime
    world_line: WorldLine,
    /// Player's entity ID (for tracking across slices)
    player_id: EntityId,
    /// Current game phase
    phase: GamePhase,
    /// Turn counter (increments with each action)
    turn: usize,
    /// Action history for replay/debugging
    history: Vec<Action>,
    /// Game configuration
    config: GameConfig,
}
```

### Methods

```rust
impl GameState {
    // === Constructors ===

    /// Create a new game state from a TimeCube.
    ///
    /// Finds the player entity in the cube and initializes the world line.
    /// Returns error if no player found or multiple players exist.
    pub fn new(cube: TimeCube, config: GameConfig) -> Result<Self, GameError>;

    /// Create from cube with default config.
    pub fn from_cube(cube: TimeCube) -> Result<Self, GameError>;

    // === Accessors (immutable) ===

    /// Get the TimeCube (read-only).
    pub fn cube(&self) -> &TimeCube;

    /// Get the world line (read-only).
    pub fn world_line(&self) -> &WorldLine;

    /// Get current player position (from WorldLine).
    pub fn player_position(&self) -> Position;

    /// Get current time (t coordinate of player).
    pub fn current_time(&self) -> i32;

    /// Get current turn number.
    pub fn turn(&self) -> usize;

    /// Get game phase.
    pub fn phase(&self) -> GamePhase;

    /// Check if game is still active (playing).
    pub fn is_active(&self) -> bool;

    /// Check if player has won.
    pub fn has_won(&self) -> bool;

    /// Get player entity ID.
    pub fn player_id(&self) -> EntityId;

    /// Get game config.
    pub fn config(&self) -> &GameConfig;

    /// Get action history.
    pub fn history(&self) -> &[Action];

    // === State Queries ===

    /// Check if a position is valid for the player to move to.
    ///
    /// Checks: in bounds, not blocked, not self-intersecting.
    pub fn can_move_to(&self, pos: Position) -> bool;

    /// Get detailed validation result for a position.
    pub fn validate_position(&self, pos: Position) -> Result<(), MoveError>;

    /// Check if player is at a rift.
    pub fn at_rift(&self) -> bool;

    /// Get rift target if player is at a rift.
    pub fn rift_target(&self) -> Option<Position>;

    /// Check if player is at the exit.
    pub fn at_exit(&self) -> bool;

    /// Get all valid actions from current state.
    pub fn valid_actions(&self) -> Vec<Action>;

    // === Computed Properties ===

    /// Get positions the player could move to (for UI hints).
    pub fn reachable_positions(&self) -> Vec<Position>;

    /// Get the entity blocking a position (if any).
    pub fn blocking_entity_at(&self, pos: Position) -> Option<&Entity>;
}
```

### Builder Pattern

```rust
/// Builder for constructing GameState with custom settings.
pub struct GameStateBuilder {
    cube: Option<TimeCube>,
    config: GameConfig,
}

impl GameStateBuilder {
    pub fn new() -> Self;
    pub fn with_cube(self, cube: TimeCube) -> Self;
    pub fn with_config(self, config: GameConfig) -> Self;
    pub fn with_light_speed(self, speed: u32) -> Self;
    pub fn with_level_name(self, name: impl Into<String>) -> Self;
    pub fn build(self) -> Result<GameState, GameError>;
}
```

### Tests

- `test_game_state_new_finds_player`
- `test_game_state_new_fails_no_player`
- `test_game_state_new_fails_multiple_players`
- `test_player_position_matches_world_line`
- `test_current_time_matches_player_t`
- `test_is_active_when_playing`
- `test_is_active_false_when_won`
- `test_can_move_to_empty_space`
- `test_can_move_to_blocked_by_wall`
- `test_can_move_to_self_intersection`
- `test_at_rift_detection`
- `test_at_exit_detection`
- `test_valid_actions_basic`
- `test_valid_actions_at_rift`
- `test_reachable_positions`
- `test_builder_pattern`

---

## 2. Actions (`src/game/actions.rs`)

Defines all possible player actions and the action execution system.

### Types

```rust
use crate::core::{Direction, Position, EntityId};

/// A player action.
///
/// Each action advances the turn counter when applied.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Action {
    /// Move in a cardinal direction (also advances time by 1).
    Move(Direction),

    /// Wait in place (advances time by 1, same position).
    Wait,

    /// Use a rift at current position (teleport to target).
    UseRift,

    /// Push an adjacent pushable entity in a direction.
    /// Player moves into the entity's position; entity moves further.
    Push(Direction),

    /// Pull an adjacent pullable entity.
    /// Player moves in direction; entity follows into player's old position.
    Pull(Direction),

    /// Restart the level (resets to initial state).
    Restart,
}

/// Result of applying an action.
#[derive(Debug, Clone)]
pub struct ActionResult {
    /// The new game state after the action.
    pub state: GameState,
    /// What happened (for UI feedback).
    pub outcome: ActionOutcome,
    /// Entities that moved as a result of this action.
    pub moved_entities: Vec<(EntityId, Position, Position)>, // (id, from, to)
    /// Propagation details (if propagation occurred).
    pub propagation: Option<PropagationResult>,
}

/// Describes what happened when an action was applied.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActionOutcome {
    /// Player moved normally.
    Moved { from: Position, to: Position },
    /// Player waited in place.
    Waited { at: Position },
    /// Player used a rift.
    Rifted { from: Position, to: Position },
    /// Player pushed entity/entities.
    Pushed {
        player_to: Position,
        pushed: Vec<(EntityId, Position)>,  // [(id, new_pos), ...]
    },
    /// Player pulled an entity.
    Pulled {
        player_to: Position,
        pulled_id: EntityId,
        pulled_to: Position,
    },
    /// Level restarted.
    Restarted,
    /// Player reached exit — won!
    Won { at: Position },
    /// Player was detected — lost! (Phase 5)
    Detected { by: EntityId, seen_at: Position },
}

/// Error when an action cannot be applied.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum ActionError {
    #[error("Game is not active (phase: {phase:?})")]
    GameNotActive { phase: GamePhase },

    #[error("Move blocked: {0}")]
    MoveBlocked(#[from] MoveError),

    #[error("No rift at current position")]
    NoRiftHere,

    #[error("Rift target is invalid: {reason}")]
    InvalidRiftTarget { target: Position, reason: String },

    #[error("Nothing to push in direction {direction:?}")]
    NothingToPush { direction: Direction },

    #[error("Cannot push: target blocked at {blocked_at:?}")]
    PushBlocked { blocked_at: Position },

    #[error("Push chain too long (max: {max})")]
    PushChainTooLong { chain_length: usize, max: usize },

    #[error("Nothing to pull from direction {direction:?}")]
    NothingToPull { direction: Direction },

    #[error("Cannot pull: entity not pullable")]
    NotPullable { entity_id: EntityId },

    #[error("Internal error: {0}")]
    Internal(String),
}

/// Detailed move validation error.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum MoveError {
    #[error("Position out of bounds: ({x}, {y}, {t})")]
    OutOfBounds { x: i32, y: i32, t: i32 },

    #[error("Position blocked by {entity_type} at ({x}, {y}, {t})")]
    Blocked {
        x: i32,
        y: i32,
        t: i32,
        entity_id: EntityId,
        entity_type: String,
    },

    #[error("Self-intersection: player already visited ({x}, {y}, {t})")]
    SelfIntersection { x: i32, y: i32, t: i32 },

    #[error("Invalid direction from current position")]
    InvalidDirection,

    #[error("Time overflow: t={t} exceeds maximum {max_t}")]
    TimeOverflow { t: i32, max_t: i32 },
}
```

### Action Execution

```rust
/// Apply an action to a game state, producing a new state.
///
/// This is the main entry point for game logic.
///
/// # Errors
/// Returns `ActionError` if the action cannot be performed.
pub fn apply_action(state: &GameState, action: Action) -> Result<ActionResult, ActionError>;

/// Preview an action without applying it.
///
/// Returns what would happen if the action were applied.
/// Useful for UI move preview.
pub fn preview_action(state: &GameState, action: Action) -> Result<ActionOutcome, ActionError>;

/// Validate an action without applying or previewing.
///
/// Faster than preview — only checks if action is valid.
pub fn validate_action(state: &GameState, action: Action) -> Result<(), ActionError>;
```

### Internal Functions

```rust
/// Apply a Move action.
fn apply_move(state: &GameState, direction: Direction) -> Result<ActionResult, ActionError>;

/// Apply a Wait action.
fn apply_wait(state: &GameState) -> Result<ActionResult, ActionError>;

/// Apply a UseRift action.
fn apply_rift(state: &GameState) -> Result<ActionResult, ActionError>;

/// Apply a Push action.
fn apply_push(state: &GameState, direction: Direction) -> Result<ActionResult, ActionError>;

/// Apply a Pull action.
fn apply_pull(state: &GameState, direction: Direction) -> Result<ActionResult, ActionError>;

/// Apply Restart action.
fn apply_restart(state: &GameState) -> Result<ActionResult, ActionError>;

/// Check win/lose conditions after an action.
fn check_game_end(state: &GameState, outcome: &ActionOutcome) -> Option<GamePhase>;
```

### Tests

- `test_apply_move_north`
- `test_apply_move_south`
- `test_apply_move_east`
- `test_apply_move_west`
- `test_apply_move_blocked`
- `test_apply_move_out_of_bounds`
- `test_apply_move_self_intersection`
- `test_apply_move_advances_time`
- `test_apply_move_extends_world_line`
- `test_apply_wait`
- `test_apply_wait_extends_world_line_same_xy`
- `test_apply_rift_success`
- `test_apply_rift_no_rift`
- `test_apply_rift_self_intersection`
- `test_apply_push_single_box`
- `test_apply_push_chain`
- `test_apply_push_chain_too_long`
- `test_apply_push_blocked_by_wall`
- `test_apply_pull_success`
- `test_apply_pull_nothing_to_pull`
- `test_apply_pull_not_pullable`
- `test_apply_restart`
- `test_action_result_moved_entities`
- `test_action_result_propagation`
- `test_preview_action`
- `test_validate_action`
- `test_game_not_active_error`
- `test_win_on_exit`

---

## 3. Validation (`src/game/validation.rs`)

Centralized move validation logic.

### Functions

```rust
use crate::core::{Position, Direction, EntityId, TimeCube};
use crate::game::{GameState, MoveError};

/// Validate a target position for player movement.
///
/// Checks (in order):
/// 1. Position is within cube bounds
/// 2. Time does not exceed maximum
/// 3. Position is not blocked by a BlocksMovement entity
/// 4. Position does not cause self-intersection
///
/// Returns `Ok(())` if valid, `Err(MoveError)` with details if not.
pub fn validate_move_target(
    state: &GameState,
    target: Position,
) -> Result<(), MoveError>;

/// Validate a standard move (direction-based).
///
/// Computes target position from current + direction + time advance,
/// then validates the target.
pub fn validate_directional_move(
    state: &GameState,
    direction: Direction,
) -> Result<Position, MoveError>;

/// Validate a wait action.
///
/// Checks that staying in place with t+1 doesn't cause self-intersection
/// (can happen if player previously visited same (x,y) at future time via rift).
pub fn validate_wait(state: &GameState) -> Result<Position, MoveError>;

/// Validate a rift usage.
///
/// Checks:
/// 1. Player is at a rift position
/// 2. Rift target is within bounds
/// 3. Rift target doesn't cause self-intersection
///
/// Does NOT check grandfather paradox (Phase 7).
///
/// Returns `ActionError` on failure (rift-specific).
pub fn validate_rift(state: &GameState) -> Result<Position, ActionError>;

/// Validate a push action.
///
/// Checks:
/// 1. There's a pushable entity adjacent in the given direction
/// 2. The push chain doesn't exceed max length
/// 3. All entities in chain can move to their targets
///
/// Returns the list of entities that would be pushed and their new positions.
pub fn validate_push(
    state: &GameState,
    direction: Direction,
) -> Result<Vec<(EntityId, Position, Position)>, ActionError>;  // [(id, from, to)]

/// Validate a pull action.
///
/// Checks:
/// 1. There's a pullable entity adjacent opposite to the given direction
/// 2. Player can move in the given direction
///
/// Returns (entity_id, entity_old_pos, entity_new_pos).
pub fn validate_pull(
    state: &GameState,
    direction: Direction,
) -> Result<(EntityId, Position, Position), ActionError>;

/// Check if a position would cause self-intersection.
pub fn would_self_intersect(state: &GameState, pos: Position) -> bool;

/// Find all positions reachable in one move from current state.
///
/// Includes: 4 directions (if valid) + wait + rift (if available).
pub fn find_reachable_positions(state: &GameState) -> Vec<(Position, Action)>;

/// Compute push chain for a direction.
///
/// Returns ordered list of (entity_id, current_pos) that would be pushed.
/// Empty if nothing to push.
pub fn compute_push_chain(
    cube: &TimeCube,
    start_pos: Position,
    direction: Direction,
    max_chain: usize,
) -> Vec<(EntityId, Position)>;
```

### Tests

- `test_validate_move_target_valid`
- `test_validate_move_target_out_of_bounds`
- `test_validate_move_target_blocked`
- `test_validate_move_target_self_intersection`
- `test_validate_directional_move`
- `test_validate_wait_valid`
- `test_validate_wait_self_intersection`
- `test_validate_rift_valid`
- `test_validate_rift_no_rift`
- `test_validate_rift_self_intersection`
- `test_validate_push_single`
- `test_validate_push_chain`
- `test_validate_push_blocked`
- `test_validate_push_chain_limit`
- `test_validate_pull_valid`
- `test_validate_pull_no_entity`
- `test_validate_pull_not_pullable`
- `test_would_self_intersect`
- `test_find_reachable_positions`
- `test_compute_push_chain_empty`
- `test_compute_push_chain_single`
- `test_compute_push_chain_multiple`

---

## 4. Propagation (`src/core/propagation.rs`)

Causal propagation engine — how changes ripple through time.

### Types

```rust
use std::collections::HashSet;
use crate::core::{TimeCube, TimeSlice, Entity, EntityId, Position, CubeError};

/// Context for a propagation operation.
#[derive(Debug, Clone)]
pub struct PropagationContext {
    /// Earliest time slice that changed.
    pub dirty_from: i32,
    /// Set of entity IDs that were affected.
    pub affected_entities: HashSet<EntityId>,
    /// Number of slices actually re-propagated.
    pub slices_updated: usize,
}

/// Result of a propagation operation.
#[derive(Debug, Clone)]
pub struct PropagationResult {
    /// Context with details of what was propagated.
    pub context: PropagationContext,
    /// Any errors encountered (non-fatal).
    pub warnings: Vec<PropagationWarning>,
}

/// Non-fatal issues during propagation.
#[derive(Debug, Clone)]
pub enum PropagationWarning {
    /// Entity collision during propagation (entities overlapped).
    EntityCollision {
        entity_a: EntityId,
        entity_b: EntityId,
        at: Position,
    },
    /// Entity propagated out of bounds (clipped).
    OutOfBounds { entity_id: EntityId, attempted: Position },
}

/// Options for propagation behavior.
#[derive(Debug, Clone, Default)]
pub struct PropagationOptions {
    /// Only propagate specific entities (None = all time-persistent).
    pub only_entities: Option<HashSet<EntityId>>,
    /// Stop propagation at this time (None = propagate to end).
    pub stop_at: Option<i32>,
    /// Skip entities that would collide (vs. error).
    pub skip_collisions: bool,
}
```

### Core Functions

```rust
// core/propagation.rs

/// Propagate all time-persistent entities from time `t` to all future slices.
///
/// For each entity with `TimePersistent` component at time `t`:
/// 1. Clone entity to t+1 with updated position.t
/// 2. For Patrol entities: recompute position from PatrolData
/// 3. Repeat for t+2, t+3, ... until time_depth
///
/// **Note:** Player is NOT propagated (managed by WorldLine).
pub fn propagate_from(
    cube: &mut TimeCube,
    from_t: i32,
) -> Result<PropagationResult, CubeError>;

/// Propagate with custom options.
pub fn propagate_from_with_options(
    cube: &mut TimeCube,
    from_t: i32,
    options: PropagationOptions,
) -> Result<PropagationResult, CubeError>;

/// Propagate a specific entity from its current time to all future slices.
pub fn propagate_entity(
    cube: &mut TimeCube,
    entity_id: EntityId,
    from_t: i32,
) -> Result<PropagationResult, CubeError>;

/// Remove an entity from all slices starting at time `t`.
pub fn depropagate_entity(
    cube: &mut TimeCube,
    entity_id: EntityId,
    from_t: i32,
) -> Result<usize, CubeError>;  // Returns count of removed

// TimeCube wrappers (Phase 2 API preserved)
impl TimeCube {
    pub fn propagate_slice(&mut self, from_t: i32) -> Result<usize, CubeError>;
    pub fn propagate_all(&mut self) -> Result<PropagationResult, CubeError>;
}
```

### Propagation Rules

```rust
/// Determine how an entity should be propagated to the next time slice.
///
/// Returns `None` if entity should not be propagated.
pub fn compute_propagated_entity(
    entity: &Entity,
    target_t: i32,
) -> Option<Entity> {
    // 1. Must have TimePersistent component
    if !entity.is_time_persistent() {
        return None;
    }

    // 2. Player is never auto-propagated
    if entity.is_player() {
        return None;
    }

    // 3. Clone with updated time
    let mut propagated = entity.at_time(target_t);

    // 4. For patrol entities, update spatial position
    if let Some(patrol) = entity.patrol_data() {
        let new_spatial = patrol.position_at(target_t);
        propagated = propagated.at_position(Position::new(
            new_spatial.x,
            new_spatial.y,
            target_t,
        ));
    }

    Some(propagated)
}

/// Check if two entities would collide at the same position.
pub fn would_collide(a: &Entity, b: &Entity) -> bool {
    // Both block movement = collision
    a.blocks_movement() && b.blocks_movement() &&
    a.position.same_spacetime(&b.position)
}
```

### Tests

- `test_propagate_from_single_entity`
- `test_propagate_from_multiple_entities`
- `test_propagate_skips_non_persistent`
- `test_propagate_skips_player`
- `test_propagate_patrol_updates_position`
- `test_propagate_slice_returns_count`
- `test_propagate_all`
- `test_propagate_entity_specific`
- `test_depropate_entity`
- `test_propagation_collision_warning`
- `test_propagation_out_of_bounds_warning`
- `test_propagation_options_only_entities`
- `test_propagation_options_stop_at`
- `test_compute_propagated_entity_persistent`
- `test_compute_propagated_entity_not_persistent`
- `test_compute_propagated_entity_patrol`
- `test_would_collide`

---

## 5. Module Exports

### `src/game/mod.rs`

```rust
//! Game logic: state management, actions, and validation.
//!
//! This module implements the game rules independent of rendering:
//! - [`GameState`]: Complete game state at any point
//! - [`Action`]: Player actions (move, wait, push, etc.)
//! - [`apply_action`]: Execute actions to produce new states
//! - Validation functions for move checking

pub mod state;
pub mod actions;
pub mod validation;

pub use state::{GameState, GamePhase, GameConfig, GameStateBuilder};
pub use actions::{
    Action, ActionResult, ActionOutcome, ActionError, MoveError,
    apply_action, preview_action, validate_action,
};
pub use validation::{
    validate_move_target, validate_directional_move, validate_wait,
    validate_rift, validate_push, validate_pull,
    would_self_intersect, find_reachable_positions, compute_push_chain,
};
```

### `src/core/mod.rs` (updated)

```rust
// Add to existing mod.rs:
pub mod propagation;

pub use propagation::{
    PropagationContext, PropagationResult, PropagationWarning, PropagationOptions,
};
```

### `src/lib.rs` (updated)

```rust
// Add to existing lib.rs:
pub mod game;
```

---

## Implementation Order

```
1. propagation.rs     ─── Extend core module (needed by actions)
2. state.rs           ─── GameState, GamePhase, GameConfig
3. validation.rs      ─── Move validation (uses GameState)
4. actions.rs         ─── Action types and apply_action (uses validation)
5. mod.rs files       ─── Wire everything together
```

**Parallelization:** `state.rs` and `propagation.rs` can be developed in parallel.

---

## Detailed Execution Plan

This plan is intentionally concrete and executable. Each step lists expected outputs and the exact tests to add.

### Step 1: Propagation Engine (Authoritative)

**Files**
- `src/core/propagation.rs` (new)
- `src/core/mod.rs` (export new types)

**Implementation**
1. Define `PropagationContext`, `PropagationResult`, `PropagationWarning`, `PropagationOptions` exactly as specified.
2. Implement `propagate_from`, `propagate_from_with_options`, `propagate_entity`, `depropagate_entity`.
3. Implement `compute_propagated_entity` and `would_collide` helpers as pure functions.
4. Implement `TimeCube::propagate_slice` and `TimeCube::propagate_all` as wrappers that call the propagation module with default options.
5. Ensure propagation:
   - Skips non-`TimePersistent` entities
   - Skips player entities
   - Recomputes patrol positions via `patrol.position_at(t)`
   - Returns warnings for collisions/out-of-bounds instead of hard errors when `skip_collisions` is enabled

**Tests**
- `test_propagate_from_single_entity`
- `test_propagate_from_multiple_entities`
- `test_propagate_skips_non_persistent`
- `test_propagate_skips_player`
- `test_propagate_patrol_updates_position`
- `test_propagate_entity_specific`
- `test_depropagate_entity`
- `test_propagation_collision_warning`
- `test_propagation_out_of_bounds_warning`
- `test_propagation_options_only_entities`
- `test_propagation_options_stop_at`
- `test_compute_propagated_entity_persistent`
- `test_compute_propagated_entity_not_persistent`
- `test_compute_propagated_entity_patrol`
- `test_would_collide`

---

### Step 2: GameState (State Container)

**Files**
- `src/game/state.rs` (new)
- `src/game/mod.rs` (exports)

**Implementation**
1. Define `GamePhase`, `GameConfig`, `GameState`, `GameStateBuilder`.
2. Implement `GameState::new`:
   - Find exactly one player entity in `cube` (error on none/multiple).
   - Initialize `world_line` from player position.
   - Store `player_id` and `turn = 0`.
3. Enforce **Player Source of Truth**:
   - `player_position()` returns `world_line.current().unwrap()`.
4. Provide `cube()` and `world_line()` read-only accessors only.
5. Implement `can_move_to` / `validate_position` as thin wrappers to validation module.
6. Implement `valid_actions` based on validation functions.

**Tests**
- `test_game_state_new_finds_player`
- `test_game_state_new_fails_no_player`
- `test_game_state_new_fails_multiple_players`
- `test_player_position_matches_world_line`
- `test_current_time_matches_player_t`
- `test_is_active_when_playing`
- `test_is_active_false_when_won`
- `test_can_move_to_empty_space`
- `test_can_move_to_blocked_by_wall`
- `test_can_move_to_self_intersection`
- `test_at_rift_detection`
- `test_at_exit_detection`
- `test_valid_actions_basic`
- `test_valid_actions_at_rift`
- `test_reachable_positions`
- `test_builder_pattern`

---

### Step 3: Validation Module (Move/Action Target Checks)

**Files**
- `src/game/validation.rs` (new)

**Implementation**
1. Implement `validate_move_target`:
   - Uses `TimeCube::validate_position`
   - Checks `blocks_movement`
   - Checks `WorldLine` self-intersection
2. Implement `validate_directional_move` and `validate_wait`:
   - Compute target position with `t + 1`
   - Delegate to `validate_move_target`
3. Implement `validate_rift`:
   - Ensure player at rift in current slice
   - Validate target bounds + self-intersection
4. Implement `compute_push_chain`:
   - Based on **current slice** at `t`
   - Respect `max_push_chain`
5. Implement `validate_push`:
   - Ensure adjacent pushable entity
   - Compute chain + validate target positions (t + 1)
6. Implement `validate_pull`:
   - Ensure adjacent pullable entity opposite direction
   - Validate player target (t + 1)
7. Implement `find_reachable_positions`:
   - 4 directional moves + wait + rift (if available)

**Tests**
- All tests listed in validation section of this doc.

---

### Step 4: Actions (Apply/Preview/Validate)

**Files**
- `src/game/actions.rs` (new)

**Implementation**
1. Define `Action`, `ActionResult`, `ActionOutcome`, `ActionError`, `MoveError`.
2. Implement `validate_action` by dispatching to validation functions.
3. Implement `preview_action`:
   - Return `ActionOutcome` without mutating state.
4. Implement `apply_action`:
   - Clone input state
   - Apply action to cloned state
   - Update `world_line`, `turn`, `history`
   - Update `TimeCube` player entity at `t + 1`
   - Call propagation for affected entities
   - Set game phase if win condition reached
5. Implement per-action helpers: `apply_move`, `apply_wait`, `apply_rift`, `apply_push`, `apply_pull`, `apply_restart`.

**Tests**
- All tests listed in Actions section of this doc.

---

### Step 5: Wire Modules + Regression Check

**Files**
- `src/game/mod.rs`
- `src/core/mod.rs` (propagation exports)
- `src/lib.rs` (exports `game`)

**Checks**
- `cargo test`
- `cargo clippy`

---

## Integration with Phase 2

Phase 3 builds directly on Phase 2 types:

| Phase 2 Type | Phase 3 Usage |
|--------------|---------------|
| `TimeCube` | Stored in `GameState`, mutated by propagation |
| `WorldLine` | Stored in `GameState`, extended by actions |
| `Position` | Used everywhere for coordinates |
| `Direction` | Used in `Action::Move`, `Action::Push`, `Action::Pull` |
| `Entity` | Queried for blocking, rift data, etc. |
| `Component` | Checked for `TimePersistent`, `Pushable`, etc. |
| `EntityId` | Track entities across actions and propagation |

---

## Error Handling Strategy

```
┌─────────────────────────────────────────────────────────┐
│                      ActionError                         │
│  - High-level: "Why can't I do this action?"            │
│  - User-facing: displayed in UI                         │
└─────────────────────────────────────────────────────────┘
                          │
                          │ wraps
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       MoveError                          │
│  - Mid-level: "Why can't I move there?"                 │
│  - Specific: blocked, out of bounds, self-intersection  │
└─────────────────────────────────────────────────────────┘
                          │
                          │ wraps
                          ▼
┌─────────────────────────────────────────────────────────┐
│                       CubeError                          │
│  - Low-level: "What went wrong in the cube?"            │
│  - From Phase 2: bounds, entity not found, etc.         │
└─────────────────────────────────────────────────────────┘
```

---

## Exit Criteria

- [ ] All files created and compile
- [ ] All tests pass (`cargo test`)
- [ ] No clippy warnings (`cargo clippy`)
- [ ] Can create GameState from TimeCube
- [ ] Can apply Move actions in all 4 directions
- [ ] Can apply Wait action
- [ ] Move validation rejects blocked positions
- [ ] Move validation rejects self-intersection
- [ ] World line extends correctly with each move
- [ ] Time advances with each action
- [ ] Propagation clones TimePersistent entities forward
- [ ] Propagation updates Patrol entity positions
- [ ] Push moves both player and box
- [ ] Pull moves player and pulls box
- [ ] Win detected when player reaches exit
- [ ] Game phase transitions correctly (Playing → Won)

---

## Example Usage

```rust
use he_walks_unseen::core::*;
use he_walks_unseen::game::*;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a simple level
    let mut cube = TimeCube::new(10, 10, 20);

    // Spawn player at (1, 1, 0)
    cube.spawn(Entity::player(Position::new(1, 1, 0)))?;

    // Spawn walls around edges
    for x in 0..10 {
        cube.spawn_and_propagate(Entity::wall(Position::new(x, 0, 0)))?;
        cube.spawn_and_propagate(Entity::wall(Position::new(x, 9, 0)))?;
    }
    for y in 1..9 {
        cube.spawn_and_propagate(Entity::wall(Position::new(0, y, 0)))?;
        cube.spawn_and_propagate(Entity::wall(Position::new(9, y, 0)))?;
    }

    // Spawn exit at (8, 8, 0)
    cube.spawn_and_propagate(Entity::exit(Position::new(8, 8, 0)))?;

    // Spawn a pushable box
    cube.spawn_and_propagate(Entity::pushable_box(Position::new(3, 1, 0)))?;

    // Create game state
    let config = GameConfig {
        level_name: "Test Level".into(),
        ..Default::default()
    };
    let mut state = GameState::new(cube, config)?;

    // Play the game
    println!("Start: {:?}", state.player_position());  // (1, 1, 0)

    // Move east
    let result = apply_action(&state, Action::Move(Direction::East))?;
    state = result.state;
    println!("After move east: {:?}", state.player_position());  // (2, 1, 1)

    // Push the box
    let result = apply_action(&state, Action::Push(Direction::East))?;
    state = result.state;
    println!("After push: {:?}", state.player_position());  // (3, 1, 2)
    if let ActionOutcome::Pushed { pushed, .. } = &result.outcome {
        println!("Pushed box to: {:?}", pushed[0].1);  // (4, 1, 2)
    }

    // Wait
    let result = apply_action(&state, Action::Wait)?;
    state = result.state;
    println!("After wait: {:?}", state.player_position());  // (3, 1, 3)

    // Check valid actions
    let valid = state.valid_actions();
    println!("Valid actions: {:?}", valid);

    // Preview a move (doesn't apply)
    let preview = preview_action(&state, Action::Move(Direction::South))?;
    println!("Preview move south: {:?}", preview);

    Ok(())
}
```

---

## Performance Considerations

| Operation | Target | Notes |
|-----------|--------|-------|
| `validate_action` | <100μs | Must be fast for UI responsiveness |
| `apply_action` | <1ms | Includes state clone |
| `propagate_from` | <10ms | For 20×20×50 cube with ~100 entities |
| `find_reachable_positions` | <500μs | Called frequently for UI hints |

**Optimization opportunities:**
- Cache `valid_actions()` result until state changes
- Incremental propagation (only dirty slices)
- Pre-compute push chains once per turn

---

## Phase 3 Limitations (Deferred to Later Phases)

| Feature | Deferred To | Reason |
|---------|-------------|--------|
| Grandfather paradox detection | Phase 7 | Requires full timeline analysis |
| Enemy detection (light cones) | Phase 5 | Separate concern |
| Visual move preview | Phase 4 | Requires rendering |
| Level loading from TOML | Phase 6 | Separate concern |
| Undo stack persistence | Phase 6 | Polish feature |

---

## Related Documents

- [Phase 2: Core Data Structures](PHASE_02_CORE_DATA.md) — Prerequisites
- [Core Data Design](../design/CORE_DATA.md) — Data architecture
- [Overall Design](../design/OVERALL.md) — Game mechanics reference
