# Phase 3.6: Isometric Organic Trajectories

> **Depends on:** `docs/web-implementation/PHASE_03_5_ISOMETRIC_TIMECUBE.md`
> **Design Reference:** `docs/web-design/PHASE_03_5_ISOMETRIC_TIMECUBE.md`
> **Scope:** Isometric panel rendering only (read-only, no gameplay-state mutation)

---

## Goal

Implement an organic, scientific-illustration style in the isometric panel while preserving exact discrete truth:
- smooth player/object trajectories for readability
- exact anchor markers at real `(x,y,t)` points
- explicit non-local/rift jump connectors
- static-object temporal pillars

---

## Status

- `Status`: Planned

---

## Locked Rules

1. `WorldLineState` and `TimeCube` remain authoritative truth.
2. Organic curves are render derivatives only.
3. Non-local jumps are never falsely smoothed.
4. Isometric camera remains fixed-angle (pan/zoom/reset allowed, no rotate).
5. Existing interaction/reducer behavior must remain unchanged.

---

## Deliverables

1. Trajectory derivation module for player anchors/segments (`organic` + `exact` modes).
2. Discontinuity classification (`local` vs `riftBridge`) from consecutive anchors.
3. Object temporal classification:
- static objects -> vertical pillars
- moving objects -> object trajectories + anchor ticks
4. Isometric render update using trajectory model:
- smooth curve for local player/object segments
- dashed connector for `riftBridge` segments
- visible anchor nodes on all tracks
5. Optional mode switch support in UI/settings (`Organic` default, `Exact` optional).
6. Unit tests for segmentation/classification logic.

---

## Workstreams

### 3.6A Trajectory Data Model

Create explicit render contracts:
- `IsoTrackPoint` (`x`, `y`, `t`, `turn`, `kind`)
- `IsoTrackSegment` (`from`, `to`, `segmentKind: 'local' | 'riftBridge'`)
- `IsoTrajectory` (`points`, `segments`, `mode`)

File targets:
- `frontend/src/render/iso/buildIsoViewModel.ts`
- `frontend/src/render/iso/trajectory.ts` (new)
- `frontend/src/render/iso/trajectory.test.ts` (new)

Exit criteria:
- derived trajectories are deterministic from same input state
- no mutation of `worldLine`/`cube`

### 3.6B Segmentation + Classification

Rules:
- consecutive points with `|Δt| === 1` and `manhattan(Δx,Δy) <= 1` => `local`
- otherwise => `riftBridge`

Rendering mapping:
- `local`: smooth spline/polyline depending on mode
- `riftBridge`: dashed straight connector

File targets:
- `frontend/src/render/iso/trajectory.ts`
- `frontend/src/render/iso/IsoTimeCubePanel.tsx`

Exit criteria:
- rift bridges are visually explicit
- smoothing does not cross discontinuities

### 3.6C Object Temporal Connections

Implement object timeline grouping by object id within selected iso window:
- static same `(x,y)` across available slices => pillar primitive
- moving => trajectory path + anchors

File targets:
- `frontend/src/render/iso/buildIsoViewModel.ts`
- `frontend/src/render/iso/objectTracks.ts` (new, optional)
- `frontend/src/render/iso/IsoTimeCubePanel.tsx`

Exit criteria:
- static and moving objects are distinguishable at a glance
- object trajectories remain visually secondary to player trajectory

### 3.6D Rendering + Tokens

Implement visual grammar:
- player anchors + dominant path
- lighter object anchors/paths
- dash pattern for `riftBridge`
- temporal fade tail for older points

Token wiring:
- use and/or extend tokens from `PHASE_03_5_ISOMETRIC_TIMECUBE.md` (`iso.path.*`)

File targets:
- `frontend/src/render/iso/IsoTimeCubePanel.tsx`
- `frontend/src/render/theme.ts`

Exit criteria:
- organic path is readable without losing discrete precision
- current-turn anchor remains obvious

### 3.6E Mode Toggle (Optional but Recommended)

Expose `Organic` (default) and `Exact` display mode:
- organic => spline on local segments
- exact => polyline only

File targets:
- `frontend/src/app/GameShell.tsx` (if toggle surfaced in settings)
- `frontend/src/app/inputStateMachine.ts` (only if new hotkey)
- `frontend/src/render/iso/IsoTimeCubePanel.tsx`

Exit criteria:
- mode switching is immediate and deterministic
- no effect on gameplay mechanics

---

## Execution Sequence

1. Build trajectory derivation module + tests.
2. Integrate player trajectory rendering with discontinuity handling.
3. Add object pillars/trajectories.
4. Add optional display mode toggle.
5. Tune tokens for readability.
6. Run full quality gates and write review notes.

---

## Test Plan

1. Trajectory derivation tests:
- anchors sorted by turn
- discontinuity classification correctness
- window clipping behavior

2. Object track tests:
- static detection to pillar
- moving detection to trajectory

3. Rendering regression checks (unit/snapshot where practical):
- organic vs exact mode path generation
- rift bridge rendered dashed

4. Quality gates:
- `npm run lint`
- `npm run test`
- `npm run build`

---

## Acceptance Criteria

1. Player worldline appears organic while exact anchor points remain visible.
2. Rift/non-local jumps are shown as explicit discontinuity connectors.
3. Static objects render as temporal pillars.
4. Moving objects render as lighter trajectories with anchor ticks.
5. Panel remains performant and readable with max 10-slice window.
6. Gameplay state/logic behavior remains unchanged.

---

## Review Output

Create review checklist after implementation:
- `docs/review/PHASE_03_6_ISOMETRIC_ORGANIC_REVIEW.md`

