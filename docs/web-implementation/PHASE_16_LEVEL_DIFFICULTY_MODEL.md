# Phase 16: Level Difficulty Model

> **Design Detail:** `docs/web-design/LEVEL_DIFFICULTY_MODEL.md`
> **Related:** `docs/web-design/LEVEL_SYSTEM_FULL.md`, `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`, `docs/web-implementation/PHASE_12_MAP_GENERATION.md`, `docs/web-implementation/PHASE_14_PROGRESSION_AND_LEVEL_PROGRAM.md`

---

## Goal

Implement a deterministic, data-driven difficulty system that:
1. computes measured difficulty (`score`, `vector`, `tier`),
2. supports controlled author override,
3. integrates with progression sequencing and generated-pack promotion.

---

## Status

- `Status`: In Progress
- `Completed`: 16A Difficulty model config contract + validator + baseline model file
- `Completed`: 16B Deterministic evaluator (`score`, `vector`, suggested tier) with test coverage
- `Completed`: 16D Override policy core (`policy.ts` + tests)
- `Next`: 16E progression ramp validator, then 16C metadata/loader wiring

---

## Locked Inputs

From design:
1. Thresholds/weights are tunable and versioned in config (not hardcoded in evaluator logic).
2. Cooldown slots in `main` progression are allowed with constraints:
- max one-tier drop
- no consecutive cooldown slots
3. Difficulty internals are player-visible.
4. Optional player-facing `difficultyFlavor` is supported as presentation metadata.
5. Override review bar:
- delta `<= 1` tier: note required
- delta `> 1` tier: review flag + evidence note required

---

## Scope

In scope:
1. Difficulty model config contract and loader.
2. Deterministic evaluator for pack difficulty metrics.
3. Metadata wiring to manifest/progression files.
4. Progression ramp validator (including cooldown constraints).
5. Author-override policy validation.
6. Runtime UI surface for difficulty internals.

Out of scope:
1. Story/narrative generation.
2. Online telemetry-based dynamic difficulty.
3. Non-deterministic AI playtesting.

---

## Workstreams

## 16A. Difficulty Model Config Contract

Implement:
1. Define `DifficultyModelConfig` contract:
- `modelVersion`
- metric normalization thresholds
- score weights
- tier boundaries
- cooldown/ramp policy
- override policy rules
2. Add baseline config file:
- `frontend/public/data/difficulty.model.v1.json`

File targets:
1. `frontend/src/data/contracts.ts`
2. `frontend/src/data/validate.ts`
3. `frontend/src/data/validate.test.ts`
4. `frontend/public/data/difficulty.model.v1.json`

Exit criteria:
1. Config validates with structured errors.
2. Evaluator can run from config only.

## 16B. Deterministic Difficulty Evaluator

Implement:
1. Compute normalized metrics:
- path pressure
- branch pressure
- temporal pressure
- detection pressure
- interaction complexity
- paradox risk
2. Compute:
- `difficultyScore` (`0..100`)
- `difficultyVector`
- suggested `difficultyTier`
3. Ensure deterministic output for same pack + same model config.

File targets:
1. `frontend/src/data/difficulty/evaluator.ts` (new)
2. `frontend/src/data/difficulty/evaluator.test.ts` (new)
3. `frontend/src/data/generation/solver.ts` (reuse hooks as needed, no behavior drift)

Exit criteria:
1. Repeated runs produce identical result.
2. Score/tier mapping matches model config.

## 16C. Metadata Wiring

Implement:
1. Extend pack manifest metadata:
- `difficultyMeta.score`
- `difficultyMeta.vector`
- `difficultyMeta.source`
- `difficultyMeta.note`
- `difficultyMeta.modelVersion`
2. Extend progression entries with optional:
- `difficultyTarget`
- `difficultyFlavor`
3. Keep backward compatibility for packs/entries without new fields.

File targets:
1. `frontend/src/data/loader.ts`
2. `frontend/src/data/loader.test.ts`
3. `frontend/public/data/index.json` (optional staged update)
4. `frontend/public/data/progression/index.json` (optional staged update)

Exit criteria:
1. Loader accepts old and new metadata shapes.
2. New metadata surfaces in runtime without breaking boot.

## 16D. Override Policy Validation

Implement:
1. Validation for authored override vs measured tier:
- delta `<= 1` requires note
- delta `> 1` requires review flag + evidence note
2. Keep policy as validation/tooling concern, not simulation logic.

File targets:
1. `frontend/src/data/difficulty/policy.ts` (new)
2. `frontend/src/data/difficulty/policy.test.ts` (new)

Exit criteria:
1. Invalid overrides fail fast in validator/CLI path.
2. Policy enforcement is deterministic and documented.

Implementation note:
1. Core override policy module and tests are completed in 16D.
2. Manifest/loader/CLI wiring is completed in 16C where `difficultyMeta` fields are introduced.

## 16E. Progression Ramp Validator

Implement:
1. Validate `main` track ramp:
- non-decreasing baseline
- allow cooldown only by one tier
- no consecutive cooldown slots
2. Validate `expert` gating:
- at least one `hard` slot before first `expert`

File targets:
1. `frontend/src/data/progression.ts`
2. `frontend/src/data/progression.test.ts`
3. `frontend/scripts/validate-pack.ts` (if integration is CLI-level)

Exit criteria:
1. Ramp violations return explicit errors.
2. Existing progression continues to load when valid.

## 16F. Tooling + Runtime Surface

Implement:
1. Add evaluator CLI:
- `npm run eval:difficulty -- --pack-id <id>`
- `npm run eval:difficulty -- --all`
2. Display player-visible difficulty internals in UI overlay:
- tier
- score
- vector
- flavor (if present)

File targets:
1. `frontend/scripts/eval-difficulty.ts` (new)
2. `frontend/package.json` (script entry)
3. `frontend/src/app/shell/StateOverlay.tsx` (or progression overlay surface)
4. `frontend/README.md`

Exit criteria:
1. Difficulty eval can run for one/all packs.
2. Player can view difficulty internals in runtime UI.

---

## Execution Sequence

1. 16A config contract and validator.
2. 16B evaluator core.
3. 16D override policy checks.
4. 16E progression ramp validator.
5. 16C metadata wiring.
6. 16F tooling + UI surface.
7. Full validation and docs sync.

---

## Test Plan

1. Evaluator determinism tests.
2. Threshold/weight config boundary tests.
3. Override policy tests (delta and evidence requirements).
4. Progression cooldown/ramp policy tests.
5. Loader backward compatibility tests.
6. CLI snapshot-style tests for stable outputs.

Quality gates:
1. `npm run lint`
2. `npm run test -- --run`
3. `npm run build`
4. `npx tsc --noEmit`
5. `npm run validate:pack -- --all`

---

## Acceptance Criteria

1. Difficulty output is deterministic and config-driven.
2. Override policy is enforced with explicit validation errors.
3. Progression ramp policy is machine-validated.
4. Difficulty internals are visible to players in runtime UI.
5. Existing packs remain loadable (backward compatible path).
