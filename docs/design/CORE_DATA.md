# Core Data Design

> **Module:** `src/core/`
> **Status:** Implemented (Phase 2)

This document describes the data architecture for the Space-Time Cube game engine.

---

## Conceptual Model

### The Space-Time Cube

The game world is a **3D grid** where:
- **X, Y** = spatial dimensions (the visible 2D game board)
- **T** = time dimension (discrete turns)

```
        t=2  ┌─────────┐
            /│         │
       t=1 ┌─────────┐ │
          /│         │ │
     t=0 ┌─────────┐ │ │
         │  (x,y)  │ │/
         │    ●    │ │
         │  player │/
         └─────────┘
```

**Key Insight:** The player is a 3D creature navigating through a 4D spacetime. Other entities are 2D projections that exist within time slices.

### Entity Dimensionality

| Entity Type | Dimensionality | Behavior |
|-------------|----------------|----------|
| Player | 3D (moves through time) | Controlled by player, leaves trail (WorldLine) |
| Walls | 2D × time (persistent) | Same position at all time slices |
| Enemies | 2D × time (patrol) | Position computed from `patrol.position_at(t)` |
| Boxes | 2D (instance per slice) | Can be pushed, state may differ per slice |
| Rifts | 2D × time (persistent) | Portal to another (x, y, t) position |

---

## Type Hierarchy

```
Position (x, y, t)          ← Atomic spacetime coordinate
    │
    ├── SpatialPos (x, y)   ← 2D projection (for TimeSlice indexing)
    │
    └── Direction           ← N/S/E/W movement vectors

Component                   ← Behavior markers and data
    ├── BlocksMovement      ← Marker: impassable
    ├── BlocksVision        ← Marker: opaque to light cones
    ├── Pushable/Pullable   ← Marker: interactive
    ├── TimePersistent      ← Marker: cloned to future slices
    ├── Player/Exit         ← Marker: special roles
    ├── Patrol(PatrolData)  ← Data: enemy movement path
    ├── VisionCone(VisionData) ← Data: detection parameters
    └── Rift(RiftData)      ← Data: teleport target

Entity                      ← ID + Position + Components
    │
    └── EntityType          ← Derived classification (Player, Enemy, Wall, etc.)

TimeSlice                   ← 2D grid at time t (owns entities)
    │
    └── TimeCube            ← Collection of TimeSlices (the full 3D world)

WorldLine                   ← Player's path through spacetime (turn-ordered)
```

---

## Critical Design Decisions

### 1. Entity Storage: Clone-Per-Slice

**Problem:** A wall at (5, 5) exists at all times. How do we represent "same entity, multiple positions"?

**Rejected Alternatives:**
- Single entity with position list → Complex cross-slice references
- Entity stored once, slices hold references → Ownership/lifetime issues
- Global entity map with slice membership → Query complexity

**Chosen Solution:** Each `TimeSlice` **owns clones** of its entities. The `EntityId` (UUID) provides identity across clones.

```
TimeSlice t=0: Entity { id: wall_1, pos: (5,5,0) }
TimeSlice t=1: Entity { id: wall_1, pos: (5,5,1) }  ← clone
TimeSlice t=2: Entity { id: wall_1, pos: (5,5,2) }  ← clone
```

**Trade-offs:**
| Aspect | Impact |
|--------|--------|
| Memory | O(entities × time_depth) — acceptable for target grid sizes |
| Simplicity | No lifetime annotations, no Rc/RefCell |
| Propagation | Explicit: `spawn_and_propagate()` clones to future |
| Mutation | Change in t=0 doesn't auto-update t=5 (requires re-propagation) |

### 2. WorldLine: Turn-Ordered, Not Time-Ordered

**Problem:** With rifts, the player can travel to the past. A time-ordered path would be non-contiguous.

**Example:**
```
Turn 0: (5,5,0) ← start
Turn 1: (6,5,1) ← move east
Turn 2: (7,5,2) ← move east
Turn 3: (3,3,0) ← RIFT to past!
Turn 4: (4,3,1) ← move east (now at t=1 again)
```

**Chosen Solution:** WorldLine stores positions in **turn order**, not time order. The `t` values may be non-monotonic.

**Invariants:**
1. No self-intersection: `(x, y, t)` appears at most once
2. Normal moves: `t₂ = t₁ + 1` AND (same space OR adjacent)
3. Rift moves: Any target allowed (skip adjacency/time check)

**Data Structure:**
```rust
struct WorldLine {
    path: Vec<Position>,        // Turn-ordered
    visited: HashSet<Position>, // O(1) intersection check
}
```

### 3. Patrol: Stateless Position Computation

**Problem:** Enemies patrol paths. How do we track their position without mutable state in each TimeSlice?

**Chosen Solution:** `PatrolData` is **immutable**. Position at any time is computed:

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

**Benefits:**
- No state synchronization across slices
- Deterministic: same `t` always yields same position
- Enables "time scrubbing" UI without simulation

### 4. Component System: Enum, Not Trait Objects

**Rejected:** `Box<dyn Component>` with trait methods

**Chosen:** `enum Component` with explicit variants

```rust
enum Component {
    BlocksMovement,
    BlocksVision,
    Patrol(PatrolData),
    VisionCone(VisionData),
    // ...
}
```

**Rationale:**
- Game has fixed, known component types
- No runtime polymorphism overhead
- Pattern matching enables exhaustive handling
- Data components carry their data inline

### 5. EntityType: Derived, Not Stored

`EntityType` is computed from components, not stored:

```rust
fn entity_type(&self) -> EntityType {
    if self.is_player() { return EntityType::Player; }
    if self.is_enemy() { return EntityType::Enemy; }
    if self.is_rift() { return EntityType::Rift; }
    // ... precedence rules
}
```

**Precedence Order:**
1. Player → `EntityType::Player`
2. VisionCone → `EntityType::Enemy`
3. Rift → `EntityType::Rift`
4. Exit → `EntityType::Exit`
5. Pushable/Pullable → `EntityType::Box`
6. BlocksMovement + BlocksVision → `EntityType::Wall`
7. No blocking components → `EntityType::Floor`
8. Otherwise → `EntityType::Custom`

---

## API Patterns

### Spawn Variants

| Method | ID Conflict Behavior | Propagation |
|--------|---------------------|-------------|
| `spawn()` | Error | No |
| `spawn_and_propagate()` | Error | Yes (if TimePersistent) |
| `spawn_or_replace()` | Overwrite | No |

### Query Methods

```rust
// By position
cube.entities_at(Position) -> Vec<&Entity>
cube.is_walkable(Position) -> bool
cube.blocks_movement(Position) -> bool
cube.has_rift(Position) -> bool

// By time
cube.slice(t) -> Option<&TimeSlice>
cube.player_at(t) -> Option<&Entity>
cube.enemies_at(t) -> Vec<&Entity>

// By ID
cube.entity_at_time(id, t) -> Option<&Entity>
```

### WorldLine Validation

```rust
// Before extending
world_line.would_intersect(pos) -> bool  // O(1) via HashSet
world_line.is_valid_step(pos) -> bool    // Checks t+1 and adjacency

// Extend
world_line.extend(pos) -> Result<(), WorldLineError>      // Normal move
world_line.extend_via_rift(pos) -> Result<(), WorldLineError>  // Skip adjacency
```

---

## Time Bounds

**Valid range:** `0 <= t < time_depth`

| Value | Meaning |
|-------|---------|
| `t = 0` | Level start state |
| `t = time_depth - 1` | Maximum reachable time |
| `t < 0` | Invalid (panic/error) |
| `t >= time_depth` | `CubeError::OutOfBounds` |

---

## Memory Layout

For a 20×20 grid with 50 time slices and ~100 entities:

```
TimeCube
├── slices: Vec<TimeSlice> (50 slices)
│   └── TimeSlice
│       ├── entities: HashMap<EntityId, Entity>  (~100 entries)
│       └── spatial_index: HashMap<SpatialPos, Vec<EntityId>>
│
└── Total: ~50 × 100 = 5,000 entity instances
    Estimate: ~500KB (entities) + ~200KB (indices) < 1MB
```

---

## Error Types

```rust
enum CubeError {
    OutOfBounds { x, y, t, max_x, max_y, max_t },
    EntityNotFound(EntityId),
    EntityAlreadyExists { id, t },
    TimeSliceNotFound(t),
    PositionBlocked { x, y, t },
}

enum WorldLineError {
    SelfIntersection { x, y, t },
    Empty,
    InvalidStep { from, to },
}
```

---

## Module Dependencies

```
position.rs      ← No dependencies (leaf)
       ↓
components.rs    ← Uses Position, SpatialPos, Direction
       ↓
entity.rs        ← Uses Position, Component, EntityId
       ↓
time_slice.rs    ← Uses Position, Entity, EntityId, SpatialPos
       ↓
time_cube.rs     ← Uses TimeSlice, Entity, Position, EntityId

world_line.rs    ← Uses Position only (parallel to time_slice/time_cube)
```

---

## Usage Example

```rust
use he_walks_unseen::core::*;

// Create world
let mut cube = TimeCube::new(10, 10, 20);

// Spawn persistent wall
cube.spawn_and_propagate(Entity::wall(Position::new(5, 5, 0)))?;

// Spawn enemy with patrol
let patrol = PatrolData::new(vec![
    SpatialPos::new(3, 3),
    SpatialPos::new(3, 7),
], true);
let vision = VisionData::new(3, Direction::South);
cube.spawn_and_propagate(Entity::enemy(Position::new(3, 3, 0), patrol, vision))?;

// Track player movement
let mut world_line = WorldLine::new(Position::new(1, 1, 0));
world_line.extend(Position::new(2, 1, 1))?;  // Move east
world_line.extend(Position::new(2, 1, 2))?;  // Wait

// Query
assert!(cube.blocks_movement(Position::new(5, 5, 10)));
assert_eq!(world_line.positions_at_time(0).len(), 1);
```

---

## Related Documents

- [Overall Design](OVERALL.md) — Game mechanics and rules
- [Phase 2 Implementation Plan](../implementation/PHASE_02_CORE_DATA.md) — Detailed API spec
