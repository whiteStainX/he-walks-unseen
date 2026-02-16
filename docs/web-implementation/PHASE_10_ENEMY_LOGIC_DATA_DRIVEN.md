# Phase 10: Enemy Logic Data-Driven Implementation

> **Depends on:** `docs/web-design/ENEMY_LOGIC_V1.md`
> **Related:** `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`, `docs/web-design/MATH_MODEL.md`
> **Scope:** Enemy movement/detection configuration and resolver pipeline only.

---

## Goal

Implement a concrete, data-driven enemy logic layer so enemy behavior can be tuned by content files without code changes.

Primary outcomes:
1. Enemy movement policy resolution is fully config-driven.
2. Detection config supports rule-level defaults plus per-enemy profile overrides.
3. Validation catches all enemy config errors at load time.
4. Runtime, tests, and future generator share the same resolution precedence.

---

## Status

- `Status`: Completed (2026-02-16)

---

## Locked Rules

1. Keep truth model unchanged:
- player truth = `WorldLineState`
- object/enemy truth = `TimeCube`
2. Keep pipeline ordering unchanged:
- `Paradox -> Won -> Detected`
3. No behavior randomness in V1.
4. No chase/alert state machine in this phase.
5. No React dependency in core enemy resolver logic.

---

## Deliverables

1. Extended behavior contracts:
- `detectionProfiles?`
- `detectionAssignments?`
- `defaultDetectionProfile?`
2. Resolver for enemy movement profile and detection profile precedence.
3. Validation rules + structured error kinds for new behavior fields.
4. Loader integration that materializes resolved per-enemy config.
5. Detection evaluation updated to consume per-enemy effective config.
6. Tests for determinism, precedence, and invalid config rejection.

---

## Workstreams

### 10A. Data Contract Extensions

Implement:
1. Extend `BehaviorConfig` in `frontend/src/data/contracts.ts`:
- keep `policies` and `assignments`
- add optional detection profile fields
2. Add new error kinds:
- `UnknownDetectionProfileReference`
- `InvalidDetectionProfile`

File targets:
- `frontend/src/data/contracts.ts`

Exit criteria:
- all new fields are typed and backward-compatible (optional)

### 10B. Validation + Parsing

Implement:
1. Validate detection profile shapes (`enabled`, `delayTurns`, `maxDistance`).
2. Validate detection assignment references.
3. Validate default detection profile reference.
4. Keep existing behavior validation intact.

File targets:
- `frontend/src/data/validate.ts`
- `frontend/src/data/validate.test.ts`

Exit criteria:
- invalid behavior config fails at load with deterministic error kind

### 10C. Resolver Layer

Implement pure resolver helpers:
1. `resolveBehaviorPolicy(behaviorConfig, enemyId)`
2. `resolveEnemyDetectionConfig(behaviorConfig, enemyId, rulesDefaultDetection)`
3. Optional helper for batch resolution across all enemies at a time slice

Resolution precedence:
1. per-enemy detection assignment
2. behavior default detection profile
3. rules default detection config

File targets:
- `frontend/src/data/behaviorResolver.ts`
- `frontend/src/data/behaviorResolver.test.ts`

Exit criteria:
- precedence behavior is explicit and tested

### 10D. Loader + Runtime Wiring

Implement:
1. Extend loaded content shape to include resolved enemy behavior metadata needed by runtime.
2. Keep backward compatibility for packs without detection profiles.
3. Ensure reducer/runtime reads resolved config without branch explosion.

File targets:
- `frontend/src/data/loader.ts`
- `frontend/src/data/loader.test.ts`
- `frontend/src/game/gameSlice.ts` (if state field additions are required)
- `frontend/src/game/interactions/pipeline.ts` (only if detection input assembly changes)

Exit criteria:
- runtime behavior matches data contract and does not regress phase ordering

### 10E. Detection Integration

Implement:
1. Keep core `evaluateDetectionV1` pure.
2. Feed per-enemy effective config where applicable.
3. Preserve current detected status and event semantics.

File targets:
- `frontend/src/core/detection.ts`
- `frontend/src/core/detection.test.ts`
- `frontend/src/game/gameSlice.test.ts`

Exit criteria:
- same state/action history yields deterministic detection outcomes

### 10F. Fixtures + Content Examples

Implement:
1. Add/adjust fixture packs showing:
- global detection only
- per-enemy override via detection profiles
2. Add at least one example where two enemies use different ranges.

File targets:
- `frontend/public/data/*.behavior.json`
- `frontend/src/data/content/*.behavior.json`

Exit criteria:
- sample content demonstrates data-driven enemy tuning

---

## Execution Sequence

1. Contract updates (`10A`).
2. Validation updates (`10B`).
3. Resolver updates (`10C`).
4. Loader + runtime wiring (`10D`).
5. Detection integration (`10E`).
6. Fixture updates (`10F`).
7. Full test/build verification.

---

## Test Plan

1. Contract/validation tests:
- reject unknown detection profile refs
- reject invalid detection profile values
- accept missing optional fields (backward compatibility)

2. Resolver tests:
- movement assignment resolution
- detection precedence chain correctness

3. Runtime tests:
- per-enemy overrides change detection outcomes as expected
- unchanged behavior for packs without new fields
- phase ordering still `Paradox -> Won -> Detected`

4. Quality gates:
- `npm run lint`
- `npm run test`
- `npm run build`

---

## Acceptance Criteria

1. Enemy movement and detection tuning is achievable via content files only.
2. Invalid enemy config fails during load with actionable error types.
3. Per-enemy detection override precedence is deterministic and documented.
4. Existing packs remain loadable without mandatory migration.
5. No gameplay-order regressions.

---

## Implementation Notes

Implemented in:
1. `frontend/src/data/contracts.ts`
2. `frontend/src/data/validate.ts`
3. `frontend/src/data/validate.test.ts`
4. `frontend/src/data/behaviorResolver.ts`
5. `frontend/src/data/behaviorResolver.test.ts`
6. `frontend/src/data/loader.ts`
7. `frontend/src/data/loader.test.ts`
8. `frontend/src/core/detection.ts`
9. `frontend/src/core/detection.test.ts`
10. `frontend/src/game/interactions/types.ts`
11. `frontend/src/game/interactions/pipeline.ts`
12. `frontend/src/game/gameSlice.ts`
13. `frontend/src/game/gameSlice.test.ts`
14. `frontend/public/data/variant.behavior.json`

Key runtime detail:
1. `enemyDetectionConfigById` stores resolved behavior-level overrides only.
2. Enemies without explicit behavior-level detection overrides still use runtime `detectionConfig` as fallback.

---

## Out of Scope

1. Alert/chase FSM.
2. LOS cone occlusion.
3. Enemy communication/group tactics.
4. Procedural map generator implementation.
