# Phase 3: Objects and World Occupancy (Web)

> **Depends on:** `docs/web-implementation/PHASE_02_TIME_TRAVEL.md`
> **Enables:** Phase 4 (interactions: push/pull and richer action validation)
> **Design References:** `docs/web-design/CORE_DATA.md`, `docs/web-design/GAME_STATE.md`, `docs/web-design/MATH_MODEL.md`

---

## Goal

Add object systems to the space-time world while preserving the Phase 2 turn/time model.

Phase 3 introduces reusable, configurable objects:
- walls
- exits
- boxes (as objects only, no push/pull mechanics yet)
- enemies (as objects only, no detection yet)

---

## Phase Principles

1. Reusable by construction:
- behavior is represented by components and object definitions
- game logic consumes interfaces, not hardcoded object types

2. Configurable by data:
- object archetypes and placements come from data contracts
- no hardcoded map layouts inside reducers

3. Keep scope tight:
- no detection logic
- no push/pull interactions
- no paradox checks beyond existing self-intersection rules

---

## Scope

### In Scope
- Entity/component model for world objects
- Object registry (archetype definitions)
- Level object placements into time-aware world state
- Occupancy and collision queries (movement blocking)
- Exit tile check (basic win condition)
- Enemy object presence and patrol metadata storage only

### Out of Scope
- Enemy detection/light cone checks
- Push/pull behavior
- Advanced propagation optimization
- Data loading pipeline polish (full JSON loader belongs to Phase 6)

---

## Interface-First Contracts

### Core Types (`frontend/src/core/`)

1. `Component`
- marker variants: `BlocksMovement`, `BlocksVision`, `TimePersistent`, `Exit`, `Pushable`, `Pullable`
- data variants: `Patrol`, `Rift`

2. `ObjectArchetype`
```ts
type ObjectArchetype = {
  kind: string; // e.g. "wall", "exit", "box", "enemy"
  components: Component[];
  render: { glyph?: string; fill?: string; stroke?: string };
};
```

3. `ObjectInstance`
```ts
type ObjectInstance = {
  id: string;
  archetype: string;
  position: Position3D;
  overrides?: Partial<ObjectArchetype>;
};
```

4. `ObjectRegistry`
- lookup by archetype key
- validation for unknown archetypes

5. `TimeSlice` / `TimeCube` occupancy API
- `objectsAt(position)`
- `isBlocked(position)` (`BlocksMovement`)
- `hasExit(position)` (`Exit`)

### Game State (`frontend/src/game/`)

1. `GameState` additions
- `objectRegistry`
- `cube` extended to hold object instances per slice
- `phase` includes `Won`

2. Action/reducer behavior
- movement checks `isBlocked(next)`
- post-move check `hasExit(next)` -> `phase = Won`

### Render (`frontend/src/render/`)

1. Render order
- object layers first
- past-turn selves next
- current-turn self on top

2. Object drawing uses archetype render metadata, not per-type `if/else` branching.

---

## Data Contracts (Phase 3 subset)

Phase 3 can use local in-code constants first, but shape must match future file-driven loading:

```ts
type LevelObjectsConfig = {
  archetypes: Record<string, ObjectArchetype>;
  instances: ObjectInstance[];
};
```

Minimum required archetypes in Phase 3:
- `wall`
- `exit`
- `box`
- `enemy`

---

## Implementation Plan

1. Add `components.ts`, `entity.ts` (or `objects.ts`) in `core`.
2. Extend `timeCube.ts` to store/query object instances by slice.
3. Add object registry and placement bootstrap in `game` init.
4. Update `movePlayer2D` validation to use cube occupancy checks.
5. Add win condition check against `Exit`.
6. Update board renderer to draw objects from slice state.
7. Keep styling unchanged from current monochrome baseline.

---

## Test Requirements

1. Core object tests:
- registry resolves known archetypes
- unknown archetype fails predictably
- occupancy index returns expected objects for `(x,y,t)`

2. Game reducer tests:
- movement blocked by wall object
- movement allowed on empty cells
- entering exit cell sets `Won` phase

3. Render sanity:
- object glyph/fill shown
- player still rendered above objects

---

## Exit Criteria

1. World contains object instances from configurable definitions.
2. Movement honors object blocking rules.
3. Exit object can end the level (`Won`).
4. Enemy objects can be placed and rendered (behavior deferred).
5. Lint and tests pass.

