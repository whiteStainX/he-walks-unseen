# Core Data Design (Web)

> **Module target:** `frontend/src/core/`
> **Status:** Phase 6 implemented, Phase 7 contracts planned

This document defines canonical core data structures and reusable core contracts.

---

## 1. Core Model

### Space-Time Cube
- 3D grid `(x, y, t)`
- Player is represented by a world line through cube-time
- Non-player entities are represented by occupancy in `TimeCube`

### Truth Split
1. Player truth: `WorldLineState`
2. Object truth: `TimeCube`

This split is invariant across phases.

---

## 2. Canonical Types

```ts
export interface Position2D {
  x: number
  y: number
}

export interface Position3D extends Position2D {
  t: number
}

export type Direction2D = 'north' | 'south' | 'east' | 'west'
```

```ts
export interface TimeSlice {
  t: number
  objectIds: string[]
  spatialIndex: Record<string, string[]>
}

export interface TimeCube {
  width: number
  height: number
  timeDepth: number
  slices: TimeSlice[]
  objectsById: Record<string, ResolvedObjectInstance>
}
```

```ts
export interface WorldLineState {
  path: Position3D[]
  visited: Record<string, true>
}
```

Shared result contract:

```ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
```

Canonical location: `frontend/src/core/result.ts`

---

## 3. Object System

Objects are archetype-based and data-driven:
- archetype defines components + render hints
- instance binds `id`, archetype key, and initial position
- resolved object stores dereferenced archetype payload

Component model remains discriminated unions (`Marker`, `Patrol`, `Rift`-style components).

Key movement-related markers:
- `BlocksMovement`
- `Pushable`
- `Pullable`
- `TimePersistent`
- `Exit`

---

## 4. Indexing Strategy

Spatial keys:
- `TimeSlice.spatialIndex` key: `"x,y"`

World-line membership keys:
- `WorldLineState.visited` key: `"x,y,t"`

Purpose:
- O(1) lookup for occupancy and self-intersection checks
- deterministic serialization-friendly structures (`Record<...>`)

---

## 5. Rift Contracts

Rift behavior is a reusable core primitive.

```ts
type RiftInstruction =
  | { kind: 'default' }
  | { kind: 'delta'; delta: number; targetSpatial?: Position2D }
  | { kind: 'tunnel'; target: Position3D }

interface RiftSettings {
  defaultDelta: number
  baseEnergyCost: number
}

interface RiftResources {
  energy: number | null
}

interface RiftResolution {
  target: Position3D
  energyCost: number
  mode: RiftInstruction['kind']
}
```

Core API:
- `resolveRift(input) -> Result<RiftResolution, RiftResolveError>`

---

## 6. Detection Contracts (Phase 5)

Detection contracts are defined in core so reducer and render can share one report shape.

```ts
export interface DetectionConfig {
  enabled: boolean
  delayTurns: number
  maxDistance: number
}

export interface DetectionEvent {
  enemyId: string
  enemyPosition: Position3D
  observedPlayer: Position3D
  observedTurn: number
}

export interface DetectionReport {
  detected: boolean
  atTime: number
  events: DetectionEvent[]
}
```

Planned core API:

```ts
evaluateDetectionV1(input: {
  cube: TimeCube
  worldLine: WorldLineState
  currentTime: number
  config: DetectionConfig
}): DetectionReport
```

V1 model target:
- discrete-delay + bounded Manhattan distance
- pure read operation (no mutations)

---

## 7. Paradox Contracts (Phase 7)

Paradox contracts are core-level so reducer, render, and tests share one causality model.

```ts
export type CausalRequirement =
  | { kind: 'PlayerAt'; position: Position3D; sourceTurn: number }
  | { kind: 'ObjectAt'; objectId: string; position: Position3D; sourceTurn: number }

export interface CausalAnchor {
  id: string
  requirement: CausalRequirement
}

export interface ParadoxConfig {
  enabled: boolean
}

export interface ParadoxViolation {
  anchorId: string
  requirement: CausalRequirement
  reason: 'PlayerMissing' | 'ObjectMissing' | 'ObjectMismatch'
}

export interface ParadoxReport {
  paradox: boolean
  checkedFromTime: number
  earliestSourceTurn: number | null
  violations: ParadoxViolation[]
}
```

Planned core API:

```ts
evaluateParadoxV1(input: {
  cube: TimeCube
  worldLine: WorldLineState
  anchors: CausalAnchor[]
  checkedFromTime: number
  config: ParadoxConfig
}): ParadoxReport
```

V1 model target:
- committed-prefix consistency, not speculative full-timeline solving
- evaluate only anchors in the affected time window
- pure read operation (no mutations)

---

## 8. Core Error Families

```ts
type CubeError =
  | { kind: 'OutOfBounds'; x: number; y: number; t: number }
  | { kind: 'EntityNotFound'; id: string }
  | { kind: 'EntityAlreadyExists'; id: string; t: number }


type WorldLineError =
  | { kind: 'EmptyWorldLine' }
  | { kind: 'SelfIntersection'; position: Position3D }
  | { kind: 'InvalidNormalStep'; from: Position3D; to: Position3D }
```

Interaction-specific and reducer-level errors should wrap these core errors rather than redefining duplicated primitives.

---

## 9. Module Dependencies

```
result.ts       (leaf)
position.ts     (leaf)
components.ts   (position)
objects.ts      (components, position, result)
worldLine.ts    (position, result)
rift.ts         (position, result)
timeCube.ts     (objects, components, position, result)
detection.ts    (timeCube, worldLine, position)
paradox.ts      (timeCube, worldLine, position)
```

---

## Related Documents
- `docs/web-design/GAME_STATE.md`
- `docs/web-design/MATH_MODEL.md`
- `docs/web-implementation/PHASE_05_DETECTION.md`
- `docs/web-implementation/PLAN.md`
