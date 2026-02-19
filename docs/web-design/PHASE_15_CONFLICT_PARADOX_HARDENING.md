# Phase 15 Design: Conflict + Paradox Hardening

> **Purpose:** Define a safe hardening path for detection/conflict and paradox validation before additional mechanic complexity.
> **Scope:** `frontend/src/core/detection.ts`, `frontend/src/core/paradox.ts`, `frontend/src/game/interactions/pipeline.ts`
> **Related:** `docs/web-design/MATH_MODEL.md`, `docs/web-implementation/PHASE_05_DETECTION.md`, `docs/web-implementation/PHASE_07_PARADOX.md`

---

## 1. Current Baseline (Confirmed)

1. Action conflicts are blocked pre-commit:
- bounds/time boundary
- blocking occupancy
- world-line self-intersection
- push/pull relocation conflicts
2. Post-action phase priority is deterministic:
- `Paradox` -> `Won` -> `Detected`
3. Detection V1:
- delayed observation (`currentTime - delayTurns`)
- Manhattan radius, no LOS/occlusion
4. Paradox V1:
- commit causal anchors (`PlayerAt`, moved `ObjectAt`)
- evaluate anchors from affected time window

---

## 2. Hardening Goal

1. Preserve deterministic behavior and current math model semantics.
2. Improve scalability of paradox checks without weakening correctness.
3. Move detection to LOS-first model and retire radius-only model to avoid parallel rule confusion.
4. Keep movement blocking behavior unchanged while adding dedicated vision blocking semantics.

---

## 3. Track A: Paradox Anchor Lifecycle

## 3.1 Risk

Anchor count grows with turns. Runtime cost and memory can trend upward on long sessions.

## 3.2 Important Constraint

With unrestricted backward travel, **unsafe pruning can break paradox correctness**.  
If the player can still affect old times, anchors for those times are still required.

## 3.3 Recommended Hardening Sequence

1. **A1 (safe, no semantics change):**
- anchor indexing by `t` for faster filtered scan
- anchor deduplication by requirement key:
  - `PlayerAt:x,y,t`
  - `ObjectAt:objectId,x,y,t`
- keep earliest `sourceTurn` among duplicates
2. **A2 (safe, optional):**
- cap duplicate history metadata only (not causal requirement truth)
3. **A3 (conditional pruning):**
- only if design introduces an explicit immutable time floor (for example timeline lock)
- then prune anchors with `requirement.t < immutableFloor`

## 3.4 Not Allowed (without new game rule)

1. Turn-count based pruning only
2. Current-time window pruning only

Both can silently miss paradoxes after deep backward travel.

---

## 4. Track B: Detection Model Transition (LOS Required)

## 4.1 Locked Decision

1. Radius-only detection model is retired for runtime behavior.
2. LOS detection is the single active detection model.
3. Existing movement semantics remain unchanged.

## 4.2 Proposed Contract Extension

Add to detection config:
1. Keep `delayTurns` and `maxDistance`.
2. Add LOS controls if needed (`rayMode`, future tuning).
3. Use dedicated occlusion source: `BlocksVision` component.

LOS evaluation:
1. still apply `delayTurns`
2. still apply `maxDistance`
3. require line trace between enemy current position and observed player past position
4. do not infer vision blocking from `BlocksMovement`

## 4.3 LOS Rule (V1)

1. 2D tile raycast on the evaluated slice.
2. Support orthogonal + diagonal lines via deterministic grid stepping (supercover/Bresenham-style).
3. Any occluder tile on the segment blocks detection.
4. If diagonal implementation fails robustness gates, fallback must be explicit in docs/tests (not silent).

---

## 5. Validation Matrix (Implementation Gate)

1. Existing detection/paradox tests unchanged and still passing.
2. New tests:
- anchor dedup/index equivalence to baseline report
- long-run turn simulation with stable paradox outcomes
- LOS blocked/unblocked cases
- LOS + delay interaction
3. Priority regression:
- paradox still overrides win/detection

---

## 6. Decisions Locked

1. Anchor lifecycle policy:
- `strict-no-prune`
2. LOS occlusion source:
- dedicated `BlocksVision` (clean separation from movement blocking)
3. LOS geometry:
- allow diagonal sight lines if robustness gates pass
4. Enemy profile defaults:
- move to LOS model and remove old radius-mode defaults to avoid dual-rule confusion

---

## 7. Deliverables for Next Action Phase

1. Implementation plan doc (`docs/web-implementation/PHASE_15_CONFLICT_PARADOX_HARDENING.md`)
2. Minimal safe batch:
- A1 anchor indexing + dedup
- LOS model migration (including `BlocksVision` support)
- removal of radius-default runtime path
- full regression tests
