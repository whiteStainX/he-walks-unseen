# Phase 2: Core Data Structures

> **Depends on:** Phase 1 (Foundation)
> **Enables:** Phase 3 (Movement), Phase 4 (Rendering)

---

## Overview

This phase implements the fundamental data structures that model the Space-Time Cube. These are pure data types with no rendering or I/O dependencies.

**Goal:** Define types that can answer:
- "What entity is at position (x, y, t)?"
- "Has the player's world line self-intersected?"
- "What components does this entity have?"

---

## File Structure

```
src/core/
├── mod.rs           # Module exports
├── position.rs      # Position type and spatial math
├── components.rs    # Component enum, EntityId, and component data
├── entity.rs        # Entity struct and factory methods
├── time_slice.rs    # Single 2D grid at time t (owns entities)
├── time_cube.rs     # Collection of TimeSlices
└── world_line.rs    # Player path tracking
```

---

## Critical Design Decisions

### Entity Storage Model

**Problem:** Time-persistent entities exist across multiple time slices. A single `HashMap<EntityId, Entity>` cannot represent an entity at multiple `(x, y, t)` positions.

**Solution:** Each `TimeSlice` owns its own entity instances. Entities are **cloned** when propagated forward through time. The `EntityId` remains consistent across clones for identity tracking (e.g., "this is the same wall at t=0 and t=5").

```
TimeSlice t=0: owns Entity { id: wall_1, pos: (5, 5, 0) }
TimeSlice t=1: owns Entity { id: wall_1, pos: (5, 5, 1) }  // clone with updated t
TimeSlice t=2: owns Entity { id: wall_1, pos: (5, 5, 2) }  // clone with updated t
```

**Trade-offs:**
- Memory: O(entities × time_depth) — acceptable for 20×20×50 grids
- Simplicity: No complex cross-slice references
- Propagation: Explicit cloning makes changes visible

**Entity ID Conflict Policy:**
When spawning an entity with an ID that already exists in the target slice:
- `spawn()`: Returns `CubeError::EntityAlreadyExists { id, t }` — caller must handle.
- `spawn_and_propagate()`: Same behavior — fails on first conflict.
- `spawn_or_replace()`: Overwrites existing entity with same ID (use for updates).

This explicit policy prevents silent overwrites and makes conflicts visible during debugging.

### Time Bounds

**Valid time range:** `0 <= t < time_depth`

- `t = 0` is the initial state (level start)
- `t = time_depth - 1` is the maximum reachable time
- Negative `t` is always invalid
- Operations at `t >= time_depth` return `CubeError::OutOfBounds`

### WorldLine Model: Turn-Ordered, Not Time-Ordered

**Key Insight:** The player can travel to the past via rifts. Therefore, the WorldLine is ordered by **turn number** (move sequence), NOT by the `t` coordinate.

```
Turn 0: (5, 5, 0)   ← start
Turn 1: (6, 5, 1)   ← move east, t advances
Turn 2: (7, 5, 2)   ← move east, t advances
Turn 3: (3, 3, 0)   ← rift to past! t goes backward
Turn 4: (4, 3, 1)   ← move east from t=0, now at t=1 again
```

**Invariants:**
- **No self-intersection:** The player cannot occupy the same `(x, y, t)` twice, regardless of turn order.
- **Turn-ordered storage:** `path[i]` is the position at turn `i`, NOT time `i`.
- **Non-chronological `t`:** The `t` values in the path may go up, down, or repeat.

**Implications:**
- `positions_at_time(t)` returns **all positions** where the player was at time `t` (may be multiple due to rifts).
- `time_range()` returns `(min_t, max_t)` across all visited positions.
- `current_time()` returns the `t` of the most recent position.

**Step Validity:**
1. **Normal move:** `t2 = t1 + 1` AND Manhattan distance ≤ 1 AND no diagonal.
2. **Wait:** `t2 = t1 + 1` AND same `(x, y)`.
3. **Rift move:** Any `(x2, y2, t2)` allowed by the rift target (no adjacency/time constraints).
4. **Self-intersection check:** Always applies — target `(x, y, t)` must not already be in the WorldLine.

### Component Invariants

**Allowed combinations:**
- `BlocksMovement` + `BlocksVision`: Yes (walls)
- `BlocksMovement` + `Pushable`: Yes (pushable blocks the path until pushed)
- `Pushable` + `Pullable`: Yes (fully interactive object)
- `Player` + anything else: No (player is special-cased)

**Duplicate component handling:**
- **Marker components** (`BlocksMovement`, `BlocksVision`, `Pushable`, `Pullable`, `TimePersistent`, `Exit`, `Player`): Duplicates are tolerated but ignored. Predicate checks use `any()`.
- **Data-bearing components** (`Rift`, `Patrol`, `VisionCone`): **Must be unique per entity.** `EntityBuilder` and factory methods enforce this and will reject duplicates.
- Accessors like `rift_data()`, `patrol_data()`, `vision_data()` return the first match (duplicates should not exist for data-bearing components).

**Precedence for EntityType inference:**
1. Has `Player` → `EntityType::Player`
2. Has `VisionCone` → `EntityType::Enemy`
3. Has `Rift` → `EntityType::Rift`
4. Has `Exit` → `EntityType::Exit`
5. Has `Pushable` or `Pullable` → `EntityType::Box`
6. Has `BlocksMovement` + `BlocksVision` → `EntityType::Wall`
7. Has no `BlocksMovement` and no `BlocksVision` → `EntityType::Floor`
8. Otherwise → `EntityType::Custom`

### PatrolData: Deterministic Position Computation

`PatrolData` has no mutable state. Enemy position at any time `t` is computed deterministically:

```rust
fn position_at(&self, t: i32) -> SpatialPos {
    let index = if self.loops {
        (t as usize) % self.path.len()
    } else {
        (t as usize).min(self.path.len() - 1)
    };
    self.path[index]
}
```

This ensures:
- No state synchronization issues across time slices
- Enemy positions are predictable and reproducible
- Phase 3 game loop simply calls `patrol.position_at(t)` to get enemy location

---

## 1. Position (`src/core/position.rs`)

The atomic unit of location in the Space-Time Cube.

### Types

```rust
/// A position in the 3D Space-Time Cube.
///
/// Valid ranges:
/// - `x`: 0 <= x < width (defined by TimeCube)
/// - `y`: 0 <= y < height (defined by TimeCube)
/// - `t`: 0 <= t < time_depth (defined by TimeCube)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Position {
    pub x: i32,
    pub y: i32,
    pub t: i32,
}

/// A 2D spatial position (no time component)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SpatialPos {
    pub x: i32,
    pub y: i32,
}

/// Cardinal directions for movement (no diagonals)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Direction {
    North,  // y - 1
    South,  // y + 1
    East,   // x + 1
    West,   // x - 1
}
```

### Methods

```rust
impl Position {
    /// Create a new position
    pub const fn new(x: i32, y: i32, t: i32) -> Self;

    /// Get the spatial component (x, y)
    pub const fn spatial(&self) -> SpatialPos;

    /// Move in a direction (time unchanged)
    pub const fn move_dir(&self, dir: Direction) -> Self;

    /// Advance time by 1 (position unchanged)
    pub const fn tick(&self) -> Self;

    /// Move in direction AND advance time (standard game move)
    pub const fn step(&self, dir: Direction) -> Self;

    /// Wait in place (advance time only)
    pub const fn wait(&self) -> Self; // alias for tick()

    /// Manhattan distance to another position (spatial only, ignores t)
    pub fn manhattan_distance(&self, other: &Position) -> u32;

    /// Euclidean distance to another position (spatial only, ignores t)
    pub fn euclidean_distance(&self, other: &Position) -> f64;

    /// Check if same (x, y, t)
    pub const fn same_spacetime(&self, other: &Position) -> bool;

    /// Check if same (x, y), ignoring t
    pub const fn same_space(&self, other: &Position) -> bool;

    /// Check if this position is spatially adjacent to another (Manhattan distance = 1)
    pub fn is_adjacent(&self, other: &Position) -> bool;

    /// Check if this is a valid next step from current position
    /// Valid: same space with t+1, OR adjacent space with t+1
    pub fn is_valid_step_from(&self, current: &Position) -> bool;
}

impl SpatialPos {
    pub const fn new(x: i32, y: i32) -> Self;
    pub fn manhattan_distance(&self, other: &SpatialPos) -> u32;
    pub fn is_adjacent(&self, other: &SpatialPos) -> bool;
}

impl Direction {
    /// Get the (dx, dy) delta for this direction
    pub const fn delta(&self) -> (i32, i32);

    /// Get the opposite direction
    pub const fn opposite(&self) -> Direction;

    /// All four cardinal directions
    pub const fn all() -> [Direction; 4];

    /// Try to determine direction from one position to adjacent position
    pub fn from_delta(dx: i32, dy: i32) -> Option<Direction>;
}
```

### Tests

- `test_position_creation`
- `test_move_direction_north_south_east_west`
- `test_tick_advances_time_only`
- `test_step_moves_and_ticks`
- `test_wait_equals_tick`
- `test_manhattan_distance`
- `test_euclidean_distance`
- `test_same_spacetime`
- `test_same_space_different_time`
- `test_is_adjacent`
- `test_is_valid_step_from`
- `test_direction_delta`
- `test_direction_opposite`
- `test_direction_from_delta`

---

## 2. Components (`src/core/components.rs`)

Components define entity behaviors. EntityId is defined here to avoid circular dependencies.

### Types

```rust
use crate::core::position::{Position, SpatialPos, Direction};

/// Unique identifier for entities. Consistent across time slices for the same logical entity.
pub type EntityId = uuid::Uuid;

/// All possible components an entity can have.
///
/// See "Component Invariants" in design decisions for valid combinations.
#[derive(Debug, Clone, PartialEq)]
pub enum Component {
    /// Blocks other entities from occupying this space
    BlocksMovement,

    /// Blocks enemy vision (line of sight)
    BlocksVision,

    /// Can be pushed by the player
    Pushable,

    /// Can be pulled by the player
    Pullable,

    /// Propagates forward through time automatically.
    /// Entities without this component only exist at their spawn time.
    TimePersistent,

    /// Follows a deterministic patrol path (enemies).
    /// Position at time t is computed as: path[t % path.len()] if loops, else path[min(t, len-1)]
    Patrol(PatrolData),

    /// Emits a vision cone for detection (enemies)
    VisionCone(VisionData),

    /// Teleports player to target position when activated
    Rift(RiftData),

    /// Marks this as the level exit (win condition)
    Exit,

    /// Marks this as the player (exactly one per level)
    Player,
}

/// Data for patrol behavior.
///
/// **Note:** Patrol position is computed deterministically from time `t`, not tracked as mutable state.
/// Formula: `path[t % path.len()]` for looping, `path[min(t, path.len() - 1)]` for non-looping.
#[derive(Debug, Clone, PartialEq)]
pub struct PatrolData {
    /// Sequence of spatial positions to visit (must be non-empty)
    pub path: Vec<SpatialPos>,
    /// Whether to loop back to start (true) or stop at end (false)
    pub loops: bool,
}

/// Data for vision cone (light cone detection)
#[derive(Debug, Clone, PartialEq)]
pub struct VisionData {
    /// Speed of light in tiles per turn (e.g., 3 means sees 3 tiles away instantly)
    pub light_speed: u32,
    /// Direction the enemy is facing (affects FOV center)
    pub facing: Direction,
    /// Field of view in degrees (default: 90 for quarter circle, 360 for omnidirectional)
    pub fov_degrees: u32,
}

/// Data for rift teleportation
#[derive(Debug, Clone, PartialEq)]
pub struct RiftData {
    /// Target position (x, y, t) - can jump in time
    pub target: Position,
    /// Whether player can travel both directions
    pub bidirectional: bool,
}
```

### Methods

```rust
impl Component {
    /// Check if this component blocks movement
    pub fn blocks_movement(&self) -> bool;

    /// Check if this component blocks vision
    pub fn blocks_vision(&self) -> bool;

    /// Check if this component marks entity as time-persistent
    pub fn is_time_persistent(&self) -> bool;
}

impl PatrolData {
    /// Create a new patrol path (panics if path is empty)
    pub fn new(path: Vec<SpatialPos>, loops: bool) -> Self;

    /// Get position at time t (deterministic computation).
    ///
    /// **Precondition:** `t >= 0`. Negative t is invalid and will panic or wrap.
    /// The level loader and TimeCube enforce valid time bounds, so this is
    /// only a concern if calling directly with untrusted input.
    pub fn position_at(&self, t: i32) -> SpatialPos;

    /// Get the path length
    pub fn len(&self) -> usize;

    /// Check if path is empty (should never be true after construction)
    pub fn is_empty(&self) -> bool;
}

impl VisionData {
    /// Create with default FOV (90 degrees, forward-facing cone)
    pub fn new(light_speed: u32, facing: Direction) -> Self;

    /// Create with custom FOV
    pub fn with_fov(light_speed: u32, facing: Direction, fov_degrees: u32) -> Self;

    /// Create omnidirectional vision (360 degrees)
    pub fn omnidirectional(light_speed: u32) -> Self;
}

impl RiftData {
    /// Create a one-way rift
    pub fn one_way(target: Position) -> Self;

    /// Create a bidirectional rift
    pub fn bidirectional(target: Position) -> Self;
}
```

### Tests

- `test_component_blocks_movement`
- `test_component_blocks_vision`
- `test_component_is_time_persistent`
- `test_patrol_position_at_loops`
- `test_patrol_position_at_no_loop`
- `test_patrol_position_at_zero`
- `test_patrol_empty_panics`
- `test_patrol_is_empty`
- `test_vision_data_default_fov`
- `test_vision_data_omnidirectional`
- `test_rift_one_way`
- `test_rift_bidirectional`

---

## 3. Entity (`src/core/entity.rs`)

An entity is an ID with a position and a set of components.

### Types

```rust
use crate::core::components::{Component, EntityId, PatrolData, VisionData, RiftData};
use crate::core::position::Position;

/// An entity in the game world.
///
/// Each TimeSlice owns its entity instances. The same EntityId across slices
/// represents the same logical entity (e.g., "wall #42" at t=0 and t=5).
#[derive(Debug, Clone)]
pub struct Entity {
    /// Unique identifier (consistent across time slices)
    pub id: EntityId,
    /// Position in space-time
    pub position: Position,
    /// Components defining behavior
    components: Vec<Component>,
    /// Display name (for debugging, optional)
    pub name: Option<String>,
}

/// Type of entity for quick filtering.
///
/// Determined by component precedence (see design decisions).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum EntityType {
    Player,
    Enemy,
    Rift,
    Exit,
    Box,    // Pushable/Pullable
    Wall,   // BlocksMovement + BlocksVision
    Floor,  // No blocking components
    Custom, // Unrecognized combination
}
```

### Methods

```rust
impl Entity {
    /// Create a new entity with auto-generated ID
    pub fn new(position: Position, components: Vec<Component>) -> Self;

    /// Create with a specific ID (for cloning across time slices)
    pub fn with_id(id: EntityId, position: Position, components: Vec<Component>) -> Self;

    /// Get components (immutable)
    pub fn components(&self) -> &[Component];

    /// Check if entity has a component matching predicate
    pub fn has<F>(&self, predicate: F) -> bool
    where
        F: Fn(&Component) -> bool;

    /// Check if entity has a specific component variant
    pub fn has_component(&self, component: &Component) -> bool;

    /// Check if entity blocks movement
    pub fn blocks_movement(&self) -> bool;

    /// Check if entity blocks vision
    pub fn blocks_vision(&self) -> bool;

    /// Check if entity persists through time
    pub fn is_time_persistent(&self) -> bool;

    /// Check if entity is the player
    pub fn is_player(&self) -> bool;

    /// Check if entity is an enemy (has VisionCone)
    pub fn is_enemy(&self) -> bool;

    /// Check if entity is a rift
    pub fn is_rift(&self) -> bool;

    /// Check if entity is the exit
    pub fn is_exit(&self) -> bool;

    /// Get entity type (uses precedence rules)
    pub fn entity_type(&self) -> EntityType;

    /// Get rift data if present
    pub fn rift_data(&self) -> Option<&RiftData>;

    /// Get patrol data if present
    pub fn patrol_data(&self) -> Option<&PatrolData>;

    /// Get vision data if present
    pub fn vision_data(&self) -> Option<&VisionData>;

    /// Clone to a new position (same ID, new position)
    pub fn at_position(&self, pos: Position) -> Self;

    /// Clone to next time slice (t + 1), same spatial position
    pub fn propagate_to_next_time(&self) -> Self;

    /// Clone to specific time slice, same spatial position
    pub fn at_time(&self, t: i32) -> Self;
}

// Factory methods for common entity types
impl Entity {
    /// Create a wall (blocks movement and vision, time-persistent)
    pub fn wall(position: Position) -> Self;

    /// Create a floor (no blocking components, not time-persistent)
    pub fn floor(position: Position) -> Self;

    /// Create the player (not time-persistent — player position managed by WorldLine)
    pub fn player(position: Position) -> Self;

    /// Create an enemy with patrol and vision (time-persistent)
    pub fn enemy(position: Position, patrol: PatrolData, vision: VisionData) -> Self;

    /// Create a pushable box (blocks movement, time-persistent)
    pub fn pushable_box(position: Position) -> Self;

    /// Create a rift (time-persistent — exists at all future time slices)
    pub fn rift(position: Position, target: Position, bidirectional: bool) -> Self;

    /// Create the exit (time-persistent)
    pub fn exit(position: Position) -> Self;
}
```

### Builder Pattern

```rust
/// Builder for creating entities with custom component combinations
pub struct EntityBuilder {
    id: Option<EntityId>,
    position: Position,
    components: Vec<Component>,
    name: Option<String>,
}

impl EntityBuilder {
    pub fn new(position: Position) -> Self;
    pub fn with_id(self, id: EntityId) -> Self;
    pub fn with_name(self, name: impl Into<String>) -> Self;
    pub fn with_component(self, component: Component) -> Self;
    pub fn blocking(self) -> Self;      // Adds BlocksMovement
    pub fn opaque(self) -> Self;        // Adds BlocksVision
    pub fn persistent(self) -> Self;    // Adds TimePersistent
    pub fn pushable(self) -> Self;      // Adds Pushable
    pub fn pullable(self) -> Self;      // Adds Pullable
    pub fn build(self) -> Entity;
}
```

### Tests

- `test_entity_creation_generates_id`
- `test_entity_with_specific_id`
- `test_entity_has_component`
- `test_entity_blocks_movement`
- `test_entity_blocks_vision`
- `test_entity_is_time_persistent`
- `test_entity_is_player`
- `test_entity_is_enemy`
- `test_entity_type_precedence_player`
- `test_entity_type_precedence_enemy`
- `test_entity_type_precedence_wall`
- `test_entity_type_precedence_floor`
- `test_entity_type_custom`
- `test_entity_at_position_preserves_id`
- `test_entity_propagate_increments_time`
- `test_factory_wall_components`
- `test_factory_enemy_components`
- `test_builder_chaining`

---

## 4. TimeSlice (`src/core/time_slice.rs`)

A 2D grid representing the world at a specific moment in time. **Owns its entity instances.**

### Types

```rust
use std::collections::HashMap;
use crate::core::entity::Entity;
use crate::core::components::EntityId;
use crate::core::position::SpatialPos;

/// A 2D snapshot of the world at time t.
///
/// Each slice owns its entity instances. Entities are cloned when propagated.
#[derive(Debug, Clone)]
pub struct TimeSlice {
    /// The time coordinate
    pub t: i32,
    /// Grid dimensions
    pub width: i32,
    pub height: i32,
    /// All entities in this slice, keyed by ID
    entities: HashMap<EntityId, Entity>,
    /// Spatial index: positions -> entity IDs at that position
    spatial_index: HashMap<SpatialPos, Vec<EntityId>>,
}
```

### Methods

```rust
impl TimeSlice {
    /// Create an empty time slice
    pub fn new(t: i32, width: i32, height: i32) -> Self;

    /// Check if a spatial position is within bounds
    pub fn in_bounds(&self, pos: SpatialPos) -> bool;

    /// Get entity IDs at a position (returns empty Vec if none)
    pub fn entity_ids_at(&self, pos: SpatialPos) -> Vec<EntityId>;

    /// Get entities at a position
    pub fn entities_at(&self, pos: SpatialPos) -> Vec<&Entity>;

    /// Get entity by ID
    pub fn entity(&self, id: EntityId) -> Option<&Entity>;

    /// Get entity by ID (mutable)
    pub fn entity_mut(&mut self, id: EntityId) -> Option<&mut Entity>;

    /// Add an entity to this slice.
    /// If an entity with the same ID already exists, it is overwritten.
    pub fn add_entity(&mut self, entity: Entity);

    /// Remove an entity by ID, returns the entity if found
    pub fn remove_entity(&mut self, id: EntityId) -> Option<Entity>;

    /// Move an entity to a new spatial position within this slice.
    ///
    /// **Atomicity:** Updates `Entity.position.x/y` AND `spatial_index` together.
    /// On success, both are updated. On failure, neither is modified.
    ///
    /// **Returns:**
    /// - `true`: Entity found, position and index updated.
    /// - `false`: Entity not found (id doesn't exist in this slice).
    ///
    /// **Note:** Does NOT check bounds or walkability — caller must validate.
    /// The entity's `t` coordinate is NOT modified (stays at slice's `t`).
    pub fn move_entity(&mut self, id: EntityId, to: SpatialPos) -> bool;

    /// Check if position blocks movement
    pub fn blocks_movement_at(&self, pos: SpatialPos) -> bool;

    /// Check if position blocks vision
    pub fn blocks_vision_at(&self, pos: SpatialPos) -> bool;

    /// Check if position is walkable (in bounds and not blocked)
    pub fn is_walkable(&self, pos: SpatialPos) -> bool;

    /// Check if position has a rift
    pub fn has_rift_at(&self, pos: SpatialPos) -> bool;

    /// Check if position is the exit
    pub fn is_exit_at(&self, pos: SpatialPos) -> bool;

    /// Get rift target from a position (if rift exists)
    pub fn rift_target_at(&self, pos: SpatialPos) -> Option<crate::core::position::Position>;

    /// Get all entities
    pub fn all_entities(&self) -> impl Iterator<Item = &Entity>;

    /// Get all entity IDs
    pub fn all_entity_ids(&self) -> impl Iterator<Item = EntityId> + '_;

    /// Get all occupied positions
    pub fn occupied_positions(&self) -> impl Iterator<Item = SpatialPos> + '_;

    /// Count entities
    pub fn entity_count(&self) -> usize;

    /// Clear all entities
    pub fn clear(&mut self);

    /// Find the player entity
    pub fn player(&self) -> Option<&Entity>;

    /// Find all enemies
    pub fn enemies(&self) -> Vec<&Entity>;
}
```

### Tests

- `test_time_slice_creation`
- `test_in_bounds`
- `test_add_entity`
- `test_remove_entity`
- `test_entity_ids_at_empty_returns_empty_vec`
- `test_entity_ids_at_multiple`
- `test_entities_at`
- `test_move_entity_updates_index`
- `test_blocks_movement_at`
- `test_blocks_vision_at`
- `test_is_walkable`
- `test_has_rift_at`
- `test_rift_target_at`
- `test_is_exit_at`
- `test_player_lookup`
- `test_enemies_lookup`
- `test_clear`

---

## 5. TimeCube (`src/core/time_cube.rs`)

The complete 3D Space-Time world. Collection of TimeSlices.

### Types

```rust
use crate::core::entity::Entity;
use crate::core::components::EntityId;
use crate::core::position::{Position, SpatialPos};
use crate::core::time_slice::TimeSlice;

/// The complete Space-Time Cube.
///
/// Valid coordinates: 0 <= x < width, 0 <= y < height, 0 <= t < time_depth
#[derive(Debug, Clone)]
pub struct TimeCube {
    /// Grid dimensions (spatial)
    pub width: i32,
    pub height: i32,
    /// Number of time slices (0 to time_depth - 1)
    pub time_depth: i32,
    /// Time slices, indexed by t
    slices: Vec<TimeSlice>,
}

/// Error types for cube operations
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum CubeError {
    #[error("Position out of bounds: ({x}, {y}, {t}) - valid range: x=[0,{max_x}), y=[0,{max_y}), t=[0,{max_t})")]
    OutOfBounds { x: i32, y: i32, t: i32, max_x: i32, max_y: i32, max_t: i32 },

    #[error("Entity not found: {0}")]
    EntityNotFound(EntityId),

    #[error("Entity already exists: {id} at t={t}")]
    EntityAlreadyExists { id: EntityId, t: i32 },

    #[error("Time slice not found: t={0}")]
    TimeSliceNotFound(i32),

    #[error("Position blocked: ({x}, {y}, {t})")]
    PositionBlocked { x: i32, y: i32, t: i32 },
}
```

### Methods

```rust
impl TimeCube {
    /// Create an empty cube with given dimensions
    pub fn new(width: i32, height: i32, time_depth: i32) -> Self;

    /// Check if position is within bounds
    pub fn in_bounds(&self, pos: Position) -> bool;

    /// Validate position, return error if out of bounds
    pub fn validate_position(&self, pos: Position) -> Result<(), CubeError>;

    /// Get a time slice (immutable)
    pub fn slice(&self, t: i32) -> Option<&TimeSlice>;

    /// Get a time slice (mutable)
    pub fn slice_mut(&mut self, t: i32) -> Option<&mut TimeSlice>;

    /// Get entity by ID at a specific time
    pub fn entity_at_time(&self, id: EntityId, t: i32) -> Option<&Entity>;

    /// Get all entities at a position
    pub fn entities_at(&self, pos: Position) -> Vec<&Entity>;

    /// Get all entity IDs at a position
    pub fn entity_ids_at(&self, pos: Position) -> Vec<EntityId>;

    /// Spawn an entity at its position's time slice.
    /// Returns EntityAlreadyExists if an entity with same ID exists in that slice.
    pub fn spawn(&mut self, entity: Entity) -> Result<EntityId, CubeError>;

    /// Spawn and propagate: add entity and clone to all future slices if time-persistent.
    /// Returns EntityAlreadyExists on first conflict (no partial propagation).
    pub fn spawn_and_propagate(&mut self, entity: Entity) -> Result<EntityId, CubeError>;

    /// Spawn or replace: overwrites any existing entity with same ID in target slice.
    /// Does NOT propagate to future slices, even if time-persistent.
    /// Use for updating entity state (e.g., moving player between slices).
    pub fn spawn_or_replace(&mut self, entity: Entity) -> Result<EntityId, CubeError>;

    /// Remove an entity from a specific time slice
    pub fn despawn_at(&mut self, id: EntityId, t: i32) -> Result<Entity, CubeError>;

    /// Remove an entity from all time slices
    pub fn despawn_all(&mut self, id: EntityId) -> Vec<Entity>;

    /// Check if position blocks movement
    pub fn blocks_movement(&self, pos: Position) -> bool;

    /// Check if position blocks vision
    pub fn blocks_vision(&self, pos: Position) -> bool;

    /// Check if position is walkable
    pub fn is_walkable(&self, pos: Position) -> bool;

    /// Check if position has a rift
    pub fn has_rift(&self, pos: Position) -> bool;

    /// Get rift target from a position
    pub fn rift_target(&self, pos: Position) -> Option<Position>;

    /// Check if position is the exit
    pub fn is_exit(&self, pos: Position) -> bool;

    /// Get the player at a specific time
    pub fn player_at(&self, t: i32) -> Option<&Entity>;

    /// Get all enemies at a specific time
    pub fn enemies_at(&self, t: i32) -> Vec<&Entity>;

    /// Propagate all time-persistent entities from t to t+1
    pub fn propagate_slice(&mut self, from_t: i32) -> Result<(), CubeError>;

    /// Propagate all time-persistent entities from t=0 to time_depth-1
    pub fn propagate_all(&mut self);

    /// Iterator over all time slices
    pub fn slices(&self) -> impl Iterator<Item = &TimeSlice>;

    /// Iterator over all time slices (mutable)
    pub fn slices_mut(&mut self) -> impl Iterator<Item = &mut TimeSlice>;
}
```

### Tests

- `test_cube_creation`
- `test_cube_in_bounds_valid`
- `test_cube_in_bounds_invalid_negative`
- `test_cube_in_bounds_invalid_overflow`
- `test_validate_position_error_message`
- `test_spawn_entity`
- `test_spawn_entity_already_exists`
- `test_spawn_out_of_bounds`
- `test_spawn_and_propagate`
- `test_spawn_and_propagate_conflict`
- `test_spawn_or_replace`
- `test_despawn_at`
- `test_despawn_all`
- `test_entities_at`
- `test_blocks_movement`
- `test_blocks_vision`
- `test_is_walkable`
- `test_has_rift`
- `test_rift_target`
- `test_is_exit`
- `test_player_at`
- `test_enemies_at`
- `test_propagate_slice`
- `test_propagate_all`

---

## 6. WorldLine (`src/core/world_line.rs`)

Tracks the player's path through the Space-Time Cube. **Ordered by turn, not by time.**

### Types

```rust
use std::collections::HashSet;
use crate::core::position::Position;

/// The player's path through space-time.
///
/// **Invariants:**
/// - No two positions share the same `(x, y, t)` — no self-intersection.
/// - Path is ordered by **turn number** (move sequence), NOT by `t` coordinate.
/// - The `t` values may be non-monotonic (rifts can send player to the past).
///
/// **Example (with time travel):**
/// ```text
/// Turn 0: (5, 5, 0)  ← start
/// Turn 1: (6, 5, 1)  ← move east
/// Turn 2: (3, 3, 0)  ← rift to past! t goes from 1 to 0
/// Turn 3: (4, 3, 1)  ← move east, now at t=1 again (different spatial pos)
/// ```
#[derive(Debug, Clone)]
pub struct WorldLine {
    /// Ordered sequence of positions visited (by turn, not by t)
    path: Vec<Position>,
    /// Set for O(1) self-intersection checks
    visited: HashSet<Position>,
}

/// Error types for world line operations
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum WorldLineError {
    #[error("Self-intersection: position ({x}, {y}, {t}) already in world line")]
    SelfIntersection { x: i32, y: i32, t: i32 },

    #[error("World line is empty")]
    Empty,

    #[error("Invalid step: from ({fx}, {fy}, {ft}) to ({tx}, {ty}, {tt}) - must be adjacent with t+1")]
    InvalidStep {
        fx: i32, fy: i32, ft: i32,
        tx: i32, ty: i32, tt: i32,
    },
}
```

### Methods

```rust
impl WorldLine {
    /// Create a new world line starting at position (turn 0)
    pub fn new(start: Position) -> Self;

    /// Create an empty world line
    pub fn empty() -> Self;

    /// Get the current (last) position, or None if empty
    pub fn current(&self) -> Option<Position>;

    /// Get the current time (t coordinate of last position)
    pub fn current_time(&self) -> Option<i32>;

    /// Get the starting position (turn 0), or None if empty
    pub fn start(&self) -> Option<Position>;

    /// Get the full path as a slice (ordered by turn)
    pub fn path(&self) -> &[Position];

    /// Get position at a specific turn number
    pub fn position_at_turn(&self, turn: usize) -> Option<Position>;

    /// Get the number of turns (positions) in the line
    pub fn len(&self) -> usize;

    /// Get the current turn number (len - 1, or None if empty)
    pub fn current_turn(&self) -> Option<usize>;

    /// Check if empty
    pub fn is_empty(&self) -> bool;

    /// Check if a position would cause self-intersection
    pub fn would_intersect(&self, pos: Position) -> bool;

    /// Check if adding position is a valid normal step (same space or adjacent, with t+1)
    pub fn is_valid_step(&self, pos: Position) -> bool;

    /// Extend with a standard move (validates adjacency + t+1 + no intersection)
    pub fn extend(&mut self, pos: Position) -> Result<(), WorldLineError>;

    /// Extend via rift (validates only self-intersection, skips adjacency/time check)
    pub fn extend_via_rift(&mut self, pos: Position) -> Result<(), WorldLineError>;

    /// Try to extend with standard move, returns false on any validation failure
    pub fn try_extend(&mut self, pos: Position) -> bool;

    /// Check if the world line contains a position (same x, y, t)
    pub fn contains(&self, pos: Position) -> bool;

    /// Get ALL positions at a specific time t (may be multiple due to time travel).
    /// Returns empty vec if none.
    pub fn positions_at_time(&self, t: i32) -> Vec<Position>;

    /// Get the time range (min_t, max_t) across all positions, or None if empty.
    /// Note: This is NOT a contiguous range — there may be gaps or revisits.
    pub fn time_range(&self) -> Option<(i32, i32)>;

    /// Get all unique time values visited, sorted ascending
    pub fn visited_times(&self) -> Vec<i32>;

    /// Reset to a new starting position (clears history)
    pub fn reset(&mut self, start: Position);

    /// Clear the world line entirely
    pub fn clear(&mut self);

    /// Iterator over positions (in turn order)
    pub fn iter(&self) -> impl Iterator<Item = &Position>;
}
```

### Tests

- `test_world_line_new`
- `test_world_line_empty`
- `test_world_line_extend_valid`
- `test_world_line_extend_self_intersection`
- `test_world_line_extend_invalid_step_wrong_time`
- `test_world_line_extend_invalid_step_not_adjacent`
- `test_world_line_extend_via_rift_to_past`
- `test_world_line_extend_via_rift_to_future`
- `test_world_line_rift_then_normal_move`
- `test_world_line_would_intersect`
- `test_world_line_would_intersect_after_rift`
- `test_world_line_is_valid_step`
- `test_world_line_contains`
- `test_world_line_positions_at_time_single`
- `test_world_line_positions_at_time_multiple`
- `test_world_line_positions_at_time_none`
- `test_world_line_time_range`
- `test_world_line_time_range_non_monotonic`
- `test_world_line_visited_times`
- `test_world_line_current_time`
- `test_world_line_current_turn`
- `test_world_line_position_at_turn`
- `test_world_line_reset`
- `test_world_line_clear`
- `test_world_line_try_extend`
- `test_world_line_iteration_order`

---

## 7. Module Exports (`src/core/mod.rs`)

```rust
//! Core game data structures for the Space-Time Cube.
//!
//! This module contains pure data types with no I/O or rendering dependencies:
//! - [`Position`]: 3D coordinates (x, y, t)
//! - [`Component`]: Entity behaviors (ECS-like)
//! - [`Entity`]: Game objects with components
//! - [`TimeSlice`]: 2D world snapshot at time t
//! - [`TimeCube`]: Complete 3D Space-Time world
//! - [`WorldLine`]: Player path tracking

pub mod position;
pub mod components;
pub mod entity;
pub mod time_slice;
pub mod time_cube;
pub mod world_line;

// Re-export commonly used types at crate::core level
pub use position::{Position, SpatialPos, Direction};
pub use components::{Component, EntityId, PatrolData, VisionData, RiftData};
pub use entity::{Entity, EntityType, EntityBuilder};
pub use time_slice::TimeSlice;
pub use time_cube::{TimeCube, CubeError};
pub use world_line::{WorldLine, WorldLineError};
```

---

## Implementation Order

```
1. position.rs      ─── No dependencies
2. components.rs    ─── Depends on: position
3. entity.rs        ─── Depends on: position, components
4. time_slice.rs    ─── Depends on: position, components, entity
5. time_cube.rs     ─── Depends on: position, time_slice, entity, components
6. world_line.rs    ─── Depends on: position only (can be parallel with 4-5)
7. mod.rs           ─── Wire everything together
```

---

## Exit Criteria

- [ ] All files created and compile
- [ ] All methods implemented
- [ ] All tests pass (`cargo test`)
- [ ] No clippy warnings (`cargo clippy`)
- [ ] Documentation on all public items (`cargo doc`)
- [ ] Can create a TimeCube with player, walls, enemy, rift, exit
- [ ] Can query entities at any (x, y, t)
- [ ] Entities propagate correctly through time slices
- [ ] WorldLine detects self-intersection correctly
- [ ] WorldLine validates step contiguity

---

## Example Usage

```rust
use he_walks_unseen::core::*;

fn main() -> Result<(), CubeError> {
    // Create a 10x10 cube with 20 time slices
    let mut cube = TimeCube::new(10, 10, 20);

    // Spawn a player at (5, 5, 0)
    let player = Entity::player(Position::new(5, 5, 0));
    let player_id = cube.spawn(player)?;

    // Spawn walls around the edge (will propagate through time)
    for x in 0..10 {
        cube.spawn_and_propagate(Entity::wall(Position::new(x, 0, 0)))?;
        cube.spawn_and_propagate(Entity::wall(Position::new(x, 9, 0)))?;
    }
    for y in 1..9 {
        cube.spawn_and_propagate(Entity::wall(Position::new(0, y, 0)))?;
        cube.spawn_and_propagate(Entity::wall(Position::new(9, y, 0)))?;
    }

    // Spawn an enemy with patrol (position computed from t)
    let patrol = PatrolData::new(
        vec![SpatialPos::new(3, 3), SpatialPos::new(3, 7)],
        true, // loops
    );
    let vision = VisionData::new(3, Direction::South);
    let enemy = Entity::enemy(Position::new(3, 3, 0), patrol, vision);
    cube.spawn_and_propagate(enemy)?;

    // Spawn a rift that sends player from (7, 5, t) to (2, 2, 0) — back to the past!
    let rift = Entity::rift(Position::new(7, 5, 0), Position::new(2, 2, 0), false);
    cube.spawn_and_propagate(rift)?;

    // Spawn exit
    cube.spawn_and_propagate(Entity::exit(Position::new(8, 8, 0)))?;

    // Create player world line (ordered by turn, not by t)
    let mut world_line = WorldLine::new(Position::new(5, 5, 0));

    // Turn 1: Move player east
    let next_pos = Position::new(6, 5, 1);
    if cube.is_walkable(next_pos) && !world_line.would_intersect(next_pos) {
        world_line.extend(next_pos)?;

        // Spawn player at new position (different time slice)
        let moved_player = Entity::with_id(player_id, next_pos, vec![Component::Player]);
        cube.spawn_or_replace(moved_player)?;
    }

    // Turn 2: Move to rift position
    let rift_pos = Position::new(7, 5, 2);
    if cube.is_walkable(rift_pos) && !world_line.would_intersect(rift_pos) {
        world_line.extend(rift_pos)?;
        let moved_player = Entity::with_id(player_id, rift_pos, vec![Component::Player]);
        cube.spawn_or_replace(moved_player)?;
    }

    // Turn 3: Use rift — travel to the past!
    if let Some(rift_target) = cube.rift_target(rift_pos) {
        // rift_target = (2, 2, 0) — back to t=0 but different spatial position
        if !world_line.would_intersect(rift_target) {
            world_line.extend_via_rift(rift_target)?; // No adjacency check for rifts
            let moved_player = Entity::with_id(player_id, rift_target, vec![Component::Player]);
            cube.spawn_or_replace(moved_player)?;
        }
    }

    // World line is now: [(5,5,0), (6,5,1), (7,5,2), (2,2,0)]
    // Ordered by turn, NOT by t. Note t goes: 0 → 1 → 2 → 0 (non-monotonic)
    println!("Player world line: {:?}", world_line.path());
    println!("Current time: {:?}", world_line.current_time()); // Some(0)
    println!("Positions at t=0: {:?}", world_line.positions_at_time(0)); // [(5,5,0), (2,2,0)]

    Ok(())
}
```
