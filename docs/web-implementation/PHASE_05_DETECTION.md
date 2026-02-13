# Phase 5: Detection (V1, Web)

> **Depends on:** `docs/web-implementation/PHASE_04_INTERACTIONS.md`
> **Enables:** `docs/web-implementation/PLAN.md` Phase 7 (Paradox)
> **Design References:** `docs/web-design/MATH_MODEL.md`, `docs/web-design/GAME_STATE.md`, `docs/web-design/RENDERING.md`

---

## Goal

Add a deterministic enemy detection system that can transition game state to `Detected`.

Phase 5 focuses on a simple, explicit model first:
- discrete-delay detection (V1)
- structured detection report for UI/logging
- reducer integration after each successful interaction

---

## Status

- `Status`: Implemented (V1 baseline)

---

## Locked Rules

1. Keep truth boundaries unchanged:
- player truth: `WorldLineState`
- object truth: `TimeCube` occupancy

2. Detection is a pure read over current state (no mutations in detector).

3. Detection runs only after successful interaction actions.

4. Detection model V1 is deterministic and tunable via config.

5. Phase transitions remain single-source and explicit in reducer:
- `Playing -> Won`
- `Playing -> Detected`

6. Tie-break rule for same-turn outcomes:
- `Won` has priority over `Detected` (if exit is reached on that action).

---

## Scope

### In Scope

- `DetectionConfig` and `DetectionReport` types
- Core detection evaluator (`core`, no React dependency)
- Reducer integration to set `GamePhase = Detected`
- Status/log text for detection outcomes
- Optional board overlay toggle for danger preview
- Unit and reducer tests

### Out of Scope

- Grandfather paradox checks
- Full light cone propagation physics
- Probabilistic/AI behavior
- Enemy path simulation changes (patrol movement remains future work)

---

## Detection Model (V1)

Use **discrete-delay + bounded distance**:

Given enemy at `(ex, ey, te)` and a player position at `(px, py, tp)`:
- `tp = te - delayTurns`
- `manhattanDistance((ex, ey), (px, py)) <= maxDistance`

If any enemy matches any eligible player position at that `tp`, detection triggers.

Notes:
- `delayTurns` is fixed integer (`>= 1`)
- `maxDistance` can be fixed integer; keep small by default
- LOS/raycast is not required in V1 (may be added in V1.1)

---

## Interface-First Contracts

Suggested module: `frontend/src/core/detection.ts`

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

export function evaluateDetectionV1(input: {
  cube: TimeCube
  worldLine: WorldLineState
  currentTime: number
  config: DetectionConfig
}): DetectionReport
```

Game state additions (`frontend/src/game/gameSlice.ts`):

```ts
type GamePhase = 'Playing' | 'Won' | 'Detected'

detectionConfig: DetectionConfig
lastDetection: DetectionReport | null
```

---

## Reducer / Pipeline Integration

After a successful interaction:

1. Update turn/time/worldline/cube as already done.
2. Check `Won` condition first.
3. If not `Won`, run `evaluateDetectionV1`.
4. If detected:
- set `phase = 'Detected'`
- set status with detected enemy/event summary
- keep deterministic action history entry

Post-detection behavior:
- phase guard blocks further gameplay actions until restart (same behavior pattern as `Won`).

---

## UI / Rendering Integration

### Required

- State window shows current phase (`Playing`, `Won`, `Detected`).
- Log/status message includes detection reason.

### Optional (Phase 5 stretch)

- Add `danger preview` toggle and simple per-slice markers for enemies that can detect at current `t`.
- Keep current monochrome visual style (line + fill, no effects).

---

## Implementation Plan

1. Add detection contracts and evaluator in `core`.
2. Add detection config defaults to game state.
3. Integrate detector into interaction post-check pipeline.
4. Extend game phase union with `Detected`.
5. Add UI status/report display (minimal, no clutter).
6. Add tests and regression checks.

---

## Test Requirements

1. Core detector tests (`frontend/src/core/detection.test.ts`):
- detects when delay and distance conditions match
- does not detect when delay mismatch
- does not detect when out of range
- deterministic report event content

2. Reducer tests (`frontend/src/game/gameSlice.test.ts`):
- successful action can transition to `Detected`
- after `Detected`, actions are blocked until restart
- restart clears `Detected` and detection report
- existing win/restart behavior not regressed

3. Regression tests:
- move/rift/push/pull remain deterministic
- history recording remains stable

---

## Acceptance Criteria

1. Detection V1 is deterministic and configurable.
2. `GamePhase` can become `Detected` from normal play.
3. Status/log provides clear detection feedback.
4. Existing phase behaviors (`Playing`, `Won`) remain correct.
5. `npm run lint`, `npm run test`, and `npm run build` pass.

---

## Risks and Mitigations

1. Ambiguous win-vs-detected order
- Mitigation: lock explicit priority (`Won` first) in this phase.

2. Static enemy occupancy may feel limited
- Mitigation: keep detector API independent from enemy movement source so patrol simulation can plug in later.

3. Overly heavy detection checks at larger time depth
- Mitigation: evaluate only exact `tp = te - delayTurns`; avoid full world-line scans.
