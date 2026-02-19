# Level Difficulty Model (Web)

> **Purpose:** Define a deterministic, data-driven difficulty model that supports author intent, generation quality gates, and progression sequencing.
> **Scope:** pack metadata, solver-derived metrics, progression ramp policy, generated-pack promotion rules.
> **Related:** `docs/web-design/LEVEL_SYSTEM_FULL.md`, `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`, `docs/web-design/MAP_GENERATION_V1.md`, `docs/web-implementation/PHASE_12_MAP_GENERATION.md`, `docs/web-implementation/PHASE_14_PROGRESSION_AND_LEVEL_PROGRAM.md`

---

## 1. Goals

1. Keep difficulty deterministic and explainable.
2. Separate measured challenge from author intent.
3. Make generated-pack promotion to progression rule-based.
4. Keep labels stable enough for player trust.

---

## 2. Model Overview

Difficulty is composed of two layers:

1. **Measured Difficulty**: computed from solver/runtime metrics.
2. **Design Intent**: author-declared label and mechanic focus.

Runtime/progression uses the measured layer as baseline, with controlled author override.

---

## 3. Difficulty Outputs

Each pack should expose:

1. `difficultyTier`: `easy | normal | hard | expert`
2. `difficultyScore`: `0..100`
3. `difficultyVector` (five dimensions, each `0..100`):
- `spatialPressure`
- `temporalPressure`
- `detectionPressure`
- `interactionComplexity`
- `paradoxRisk`
4. `difficultySource`: `measured | authored-override`
5. `difficultyNote` (required when override is used)

---

## 4. Measured Metrics (Deterministic)

Core metrics:

1. `shortestSolutionLength`
2. `visitedNodes`
3. `deadEndRatio`
4. `requiredRiftCount`
5. `requiredPushPullCount`
6. `enemyExposureEvents` (under deterministic simulation profile)
7. `paradoxFragilityCount` (number of near-paradox states encountered in search)

Normalization:

1. Convert each metric to `0..100` using model-config thresholds (not hardcoded in evaluator logic).
2. Keep thresholds and weights versioned to avoid silent tier drift.
3. Source of truth should be a data file (for example `frontend/public/data/difficulty.model.v1.json`).

---

## 5. Score Construction

Baseline weighted formula:

1. `difficultyScore = 0.20*path + 0.20*branch + 0.15*temporal + 0.20*detection + 0.15*interaction + 0.10*paradox`

Where:

1. `path` derives from `shortestSolutionLength`.
2. `branch` derives from `visitedNodes` + `deadEndRatio`.
3. `temporal` derives from `requiredRiftCount` + time-depth pressure.
4. `detection` derives from exposure and enemy profile pressure.
5. `interaction` derives from push/pull/rift operation density.
6. `paradox` derives from fragility indicators.

Initial tier mapping:

1. `0..24` => `easy`
2. `25..49` => `normal`
3. `50..74` => `hard`
4. `75..100` => `expert`

---

## 6. Author Intent Policy

Author may override `difficultyTier` only if:

1. measured tier differs by at most one step, or
2. `difficultyNote` explains why the measured model is misleading for player perception.

Minimum review bar for override:

1. Tier delta `<= 1`:
- allowed with required `difficultyNote`.
2. Tier delta `> 1`:
- requires explicit review flag plus evidence note (for example solver trace/playtest rationale).

Hard rule:

1. `generated` packs promoted into main progression must keep measured tier unless explicitly reviewed and reclassified as `hybrid` or `curated`.

---

## 7. Progression Ramp Policy

Default ramp policy for `main` track:

1. non-decreasing tier sequence.
2. cooldown slots are allowed by default:
- max one-tier drop
- no consecutive cooldown slots
- intended for pacing recovery, not ramp reset
3. `expert` should not appear before at least one `hard` slot is completed.

This policy is progression-level, not gameplay-runtime logic.

---

## 8. Generated Pack Promotion Rules

For `generated` pack to be eligible for progression insertion:

1. must pass schema + solvability + quality gates.
2. must have stable measured difficulty across repeated solver runs.
3. must include computed `difficultyScore` and `difficultyVector`.
4. must satisfy target slot tier window.

If manually tuned after generation:

1. reclassify as `hybrid`.
2. recompute metrics before insertion.

---

## 9. Data Contract Direction

Manifest direction (`frontend/public/data/index.json` entry):

1. keep existing `difficulty` label.
2. add optional `difficultyMeta`:
- `score`
- `vector`
- `source`
- `note`
- `modelVersion`

Progression entry direction (`frontend/public/data/progression/index.json`):

1. keep `difficulty`.
2. optional `difficultyTarget` for slot design expectation.
3. optional `difficultyFlavor` for player-facing poetic framing (presentation-only, never used in scoring).

---

## 10. Tooling Requirements

1. Add deterministic evaluator command:
- `npm run eval:difficulty -- --pack-id <id>`
2. Add batch mode:
- `npm run eval:difficulty -- --all`
3. Emit machine-readable output for CI and docs sync.

---

## 11. Locked Decisions

1. Metric normalization thresholds/weights are tunable via versioned model config, not hardcoded.
2. Cooldown slots are allowed by default under strict constraints (one-tier drop, non-consecutive).
3. Difficulty internals are player-visible; optional poetic flavor text is supported.
4. Override review bar:
- delta `<= 1` tier requires note
- delta `> 1` tier requires explicit review flag + evidence note

---

## 12. Next Step

Create implementation plan:

1. `docs/web-implementation/PHASE_16_LEVEL_DIFFICULTY_MODEL.md`

Initial implementation target:

1. evaluator + score output
2. metadata wiring
3. progression ramp validator
