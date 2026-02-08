# Core Data Design (Web)

> **Module target:** `frontend/src/core/`
> **Status:** Web rewrite

This document defines the core data model in TypeScript for the Space-Time Cube.

---

## Conceptual Model

### Space-Time Cube
- 3D grid `(x, y, t)`
- Player is 3D; other entities are 2D per time slice

### Entity Dimensionality
| Entity | Dimensionality | Behavior |
|--------|----------------|----------|
| Player | 3D | World line through time
| Walls | 2D × time | Fixed across slices
| Enemies | 2D × time | Patrol-derived positions
| Boxes | 2D | Push/pull within slices
| Rifts | 2D × time | Map links between `(x,y,t)`

---

## Type Hierarchy (TypeScript)

```
Position        = { x: number; y: number; t: number }
SpatialPos      = { x: number; y: number }
Direction       = 'north' | 'south' | 'east' | 'west'

Component       = union of component variants
Entity          = { id: string; position: Position; components: Component[] }
TimeSlice       = { t: number; entities: Map<string, Entity>; spatialIndex: Map<string, string[]> }
TimeCube        = { width, height, timeDepth, slices: TimeSlice[] }
WorldLineState  = { path: Position[]; visited: Record<string, true> }
```

**Note:** Use stable ID strings (`uuid`) across cloned entities.

---

## Critical Decisions (Web)

### 1. Clone-Per-Slice Entity Storage
Each `TimeSlice` owns its own entity instances. Identity continuity is maintained via `Entity.id`.

Pros:
- Simple slice queries
- No cross-slice references
- Deterministic propagation

### 2. WorldLine is Turn-Ordered
The player world line is ordered by turn (player action sequence), not by cube-time `t`.

### 3. Player Truth vs Object Truth
- **Player truth (Phase 2):** `WorldLineState` is the source of truth.
- **Object truth (Phase 3+):** objects use simpler deterministic world lines and cube occupancy.
  - walls/exits: fixed across `t`
  - patrol entities: `position_at(t)` behavior
  - interactive objects: piecewise world lines after interactions

### 4. Components as Discriminated Unions
Avoid class hierarchies. Use discriminated unions for components.

```ts
type Component =
  | { kind: 'BlocksMovement' }
  | { kind: 'BlocksVision' }
  | { kind: 'Pushable' }
  | { kind: 'Pullable' }
  | { kind: 'TimePersistent' }
  | { kind: 'Exit' }
  | { kind: 'Player' }
  | { kind: 'Patrol'; path: SpatialPos[]; loops: boolean }
  | { kind: 'VisionCone'; lightSpeed: number; radius?: number }
  | { kind: 'Rift'; target: Position; bidirectional: boolean };
```

### 5. Temporal Transition Primitives (Rift)
Rift logic should be represented as reusable core primitives, not reducer-specific ad hoc logic.

```ts
type RiftInstruction =
  | { kind: 'default' }
  | { kind: 'delta'; delta: number; targetSpatial?: SpatialPos }
  | { kind: 'tunnel'; target: Position };

type RiftSettings = {
  defaultDelta: number;   // e.g. 3 means default jump is t - 3
  baseEnergyCost: number; // for future resource systems
};

type RiftResolution = {
  target: Position;       // full (x,y,t)
  energyCost: number;
  mode: RiftInstruction['kind'];
};
```

Core contract:
- `resolveRift(input) -> Result<RiftResolution, RiftResolveError>`
- validates target space/time bounds
- remains UI-agnostic and reusable across movement, tunnel, and future cost systems

---

## Indexing Strategy

- `TimeSlice.spatialIndex` maps `"x,y"` to entity IDs for fast lookup
- `WorldLineState.visited` stores sparse keys `"x,y,t" -> true` for O(1) self-intersection

Helper key:
```
key = `${x},${y},${t}`
```

---

## Error Types (Web)

```ts
type CubeError =
  | { kind: 'OutOfBounds'; x: number; y: number; t: number }
  | { kind: 'EntityNotFound'; id: string }
  | { kind: 'EntityAlreadyExists'; id: string; t: number }
  | { kind: 'PositionBlocked'; x: number; y: number; t: number };

type WorldLineError =
  | { kind: 'EmptyWorldLine' }
  | { kind: 'SelfIntersection'; position: Position }
  | { kind: 'InvalidNormalStep'; from: Position; to: Position };
```

---

## Module Dependencies (Web)

```
position.ts      (leaf)
components.ts    (position)
entity.ts        (components)
timeSlice.ts     (entity, position)
timeCube.ts      (timeSlice)
worldLine.ts     (position)
rift.ts          (position)
```

---

## Related Documents
- `MATH_MODEL.md`
- `GAME_STATE.md`
