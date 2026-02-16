# Phase 11: Enemy Motion Execution (V1)

> **Depends on:** `docs/web-design/ENEMY_MOTION_EXECUTION_V1.md`
> **Related:** `docs/web-design/ENEMY_LOGIC_V1.md`, `docs/web-design/MATH_MODEL.md`
> **Scope:** Execute movement policies into runtime TimeCube occupancy.

---

## Goal

Make enemies actually move across time slices by materializing policy-driven positions into the cube.

Primary outcomes:
1. Enemy position changes with `t` based on behavior policy.
2. Movement remains deterministic and data-driven.
3. Existing paradox/win/detection ordering is unchanged.

---

## Status

- `Status`: Completed (2026-02-16)

---

## Locked Rules

1. Truth model stays:
- player truth = `WorldLineState`
- object/enemy truth = `TimeCube`
2. No chase/alert FSM in this phase.
3. No randomness.
4. Keep reducer pipeline ordering unchanged (`Paradox -> Won -> Detected`).

---

## Deliverables

1. Enemy motion projector from behavior policy to per-slice cube positions.
2. Bootstrap/load/restart integration so projected motion is always present.
3. Deterministic tests for policy execution across `t`.
4. Detection regression tests proving moved enemies are used.

---

## Workstreams

### 11A. Core Motion Projector

Implement pure helpers:
1. Resolve policy for each enemy instance id.
2. Evaluate policy position by absolute `t`.
3. Build per-slice enemy placements.

File targets:
1. `frontend/src/data/behaviorResolver.ts` (reuse policy resolver/evaluator)
2. New helper file if needed under `frontend/src/core/` or `frontend/src/data/`

Exit criteria:
1. Given `(enemyId, t)` the resolved `(x,y)` is deterministic.

### 11B. Bootstrap Integration

Implement:
1. During object bootstrap, place enemy occupancy by projected positions across all slices.
2. Keep non-enemy placement logic unchanged.
3. Apply same behavior for default boot content and public-loaded content.

File targets:
1. `frontend/src/game/levelObjects.ts`
2. `frontend/src/data/loader.ts` (if conversion shape needs extension)
3. `frontend/src/core/timeCube.ts` (only if placement API extension is needed)

Exit criteria:
1. Restart/content reload preserves the same enemy trajectories.

### 11C. Runtime + Detection Consistency

Implement:
1. Ensure detection reads projected enemy positions at current slice.
2. Ensure no extra enemy tick in interaction pipeline for V1.

File targets:
1. `frontend/src/core/detection.ts`
2. `frontend/src/game/interactions/pipeline.ts` (only if glue changes are needed)

Exit criteria:
1. Detection behavior is stable and based on moved enemy positions.

### 11D. Test Coverage

Add tests:
1. Loop/ping-pong trajectory occupancy by time.
2. Restart reproducibility.
3. Detection from moved enemy locations.
4. Backward compatibility for static-only packs.

File targets:
1. `frontend/src/game/gameSlice.test.ts`
2. `frontend/src/data/loader.test.ts`
3. `frontend/src/core/detection.test.ts`
4. Additional focused tests for motion projection helper(s)

Exit criteria:
1. Failing behavior policies are caught before runtime.
2. Existing tests remain green.

---

## Execution Sequence

1. Add core projector helpers.
2. Integrate projector into bootstrap/load/restart.
3. Validate detection consistency.
4. Add/adjust tests.
5. Run lint/test/build.

---

## Test Plan

1. Unit:
- policy-to-position mapping by `t`
- edge cases: 1-point path, ping-pong boundary turnarounds
2. Integration:
- waiting turns changes enemy board position by slice
- rifting to different `t` shows correct enemy location
3. Quality gates:
- `npm run lint`
- `npm run test`
- `npm run build`

---

## Acceptance Criteria

1. Enemy movement is visible and policy-driven across time slices.
2. Same content + same actions always yield same enemy trajectories.
3. No regression in paradox/win/detection ordering.
4. No schema migration required for existing content packs.

---

## Implementation Notes

Implemented in:
1. `frontend/src/game/levelObjects.ts`
2. `frontend/src/game/levelObjects.test.ts`
3. `frontend/src/game/gameSlice.test.ts`

Execution detail:
1. Enemy patrol motion is projected into cube occupancy during bootstrap/load/restart.
2. Projection is deterministic by absolute slice time `t`.
3. Detection continues to read enemy positions from `TimeCube` occupancy (no new pipeline stage).

---

## Out of Scope

1. Enemy chase/alert AI.
2. Dynamic obstacle-aware rerouting.
3. Procedural enemy behavior generation.
