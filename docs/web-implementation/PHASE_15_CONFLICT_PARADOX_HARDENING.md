# Phase 15: Conflict + Paradox Hardening (LOS + Anchor Safety)

> **Design Detail:** `docs/web-design/PHASE_15_CONFLICT_PARADOX_HARDENING.md`
> **Related:** `docs/web-implementation/PHASE_05_DETECTION.md`, `docs/web-implementation/PHASE_07_PARADOX.md`, `docs/web-design/MATH_MODEL.md`

---

## Goal

Harden detection/paradox correctness and scalability while keeping deterministic gameplay and existing truth boundaries.

Primary outcomes:
1. Anchor lifecycle stays correct under unrestricted time travel (`strict-no-prune`).
2. Detection transitions to LOS-first model with dedicated `BlocksVision` occlusion semantics.
3. Old radius-only detection path is removed to avoid dual-rule confusion.
4. Phase ordering remains unchanged: `Paradox -> Won -> Detected`.

---

## Status

- `Status`: In Progress

Progress:
1. 15A anchor canonicalization + dedup/index integration implemented.
2. Pipeline now merges anchors through canonical rules before paradox evaluation.
3. Remaining: 15B/15C/15D/15E.

---

## Locked Decisions

1. Anchor lifecycle policy: `strict-no-prune`.
2. LOS occlusion source: dedicated `BlocksVision` (do not alter movement blocking semantics).
3. LOS geometry: diagonal allowed if robustness gates pass.
4. Enemy profile defaults: migrate to LOS model and remove old radius-default runtime path.

---

## Scope

In scope:
1. Detection evaluator migration to LOS checks with distance + delay constraints.
2. Paradox anchor dedup/index hardening without semantic pruning.
3. Content/runtime/doc alignment to remove radius-model ambiguity.
4. Test expansion for LOS and anchor equivalence/performance safety.

Out of scope:
1. New paradox rules (time-floor locks, irreversible eras).
2. Probabilistic or stochastic sensing.
3. AI state-machine upgrades (alert/chase).

---

## Workstreams

## 15A. Paradox Anchor Hardening (No Prune)

Implement:
1. Add requirement-key canonicalization:
- `PlayerAt:x,y,t`
- `ObjectAt:objectId,x,y,t`
2. Deduplicate anchors by requirement key while preserving earliest `sourceTurn`.
3. Add time-index assist structure for faster `checkedFromTime` filtering.
4. Keep full correctness: no pruning by turn count or current time.

File targets:
1. `frontend/src/core/paradox.ts`
2. `frontend/src/game/interactions/pipeline.ts`
3. `frontend/src/game/interactions/types.ts` (if auxiliary indexed state fields are needed)
4. `frontend/src/core/paradox.test.ts`
5. `frontend/src/game/gameSlice.test.ts`

Exit criteria:
1. Same paradox outcomes as baseline for existing tests.
2. No paradox false negatives introduced by dedup/index logic.

Implementation status:
1. Completed in current pass.

## 15B. LOS Utility (Deterministic Grid Trace)

Implement:
1. Add deterministic LOS line traversal utility for 2D tile grids.
2. Support orthogonal + diagonal traces.
3. Use robust grid stepping (supercover/Bresenham-style).
4. Define exact endpoint and blocker-inclusion policy in code comments/tests.

File targets:
1. `frontend/src/core/detection.ts` (or `frontend/src/core/detection/los.ts` if split)
2. `frontend/src/core/detection.test.ts`

Exit criteria:
1. LOS traversal is deterministic and test-covered for diagonal and corner cases.

## 15C. Detection Evaluator Migration (LOS-First)

Implement:
1. Keep `delayTurns` and `maxDistance` checks.
2. Replace radius-only visibility rule with LOS + occlusion rule.
3. Preserve per-enemy config override precedence.
4. Keep event/report contract stable where practical.
5. Remove radius-default runtime path (single active model).

Occlusion rule:
1. Cells containing objects with `BlocksVision` block sight.
2. `BlocksMovement` alone must not imply vision blocking.

File targets:
1. `frontend/src/core/detection.ts`
2. `frontend/src/core/detection.test.ts`
3. `frontend/src/data/behaviorResolver.ts` (only if config defaults need explicit migration)
4. `frontend/src/game/interactions/pipeline.ts` (if status wording/report needs update)
5. `frontend/src/game/gameSlice.test.ts`

Exit criteria:
1. Detection behavior is LOS-based across runtime and tests.
2. Existing deterministic phase ordering remains unchanged.

## 15D. Data/Fixture and Contract Alignment

Implement:
1. Verify canonical archetypes used as occluders include `BlocksVision` where intended.
2. Keep movement-only blockers unchanged unless explicitly authored with `BlocksVision`.
3. Update fixture behavior/rules only where needed to keep expected challenge level after LOS migration.
4. Remove outdated doc references to radius-default model.

File targets:
1. `frontend/public/data/*.level.json` (only if occluder intent needs correction)
2. `frontend/public/data/*.behavior.json` (only if profile defaults require tuning)
3. `docs/web-implementation/PHASE_05_DETECTION.md`
4. `docs/web-design/ENEMY_LOGIC_V1.md`
5. `docs/web-design/PHASE_15_CONFLICT_PARADOX_HARDENING.md` (status alignment only)

Exit criteria:
1. Content semantics are clear: vision blocking is explicit and data-driven.
2. Docs do not describe an old default model.

## 15E. Regression + Robustness Gates

Required tests:
1. LOS blocked/unblocked tests with walls and non-vision blockers.
2. Diagonal LOS cases (clear, blocked, corner-touch).
3. Delay + LOS combined correctness.
4. Anchor dedup/index equivalence against baseline paradox outcomes.
5. Priority checks still hold: paradox overrides win/detection.

Quality gates:
1. `npm run lint`
2. `npm run test -- --run`
3. `npm run build`
4. `npx tsc --noEmit`
5. `npm run validate:pack -- --all`

Exit criteria:
1. All gates pass.
2. No behavior nondeterminism introduced.

---

## Execution Sequence

1. 15A anchor dedup/index hardening.
2. 15B LOS traversal utility and tests.
3. 15C evaluator migration to LOS-only path.
4. 15D fixture + docs alignment.
5. 15E full regression and quality gates.

---

## Acceptance Criteria

1. Paradox anchor handling remains correct with no prune assumptions.
2. Detection model is LOS-based with explicit `BlocksVision` occlusion.
3. Radius-only default path is removed and no longer documented as active behavior.
4. Existing deterministic action outcomes and phase ordering remain stable.
5. All quality gates pass.
