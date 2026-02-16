# Map Generation Design (V1)

> **Purpose:** Define a deterministic, data-driven map generation system that emits valid content packs.
> **Scope:** Generator contract, solvability validation, and quality gates.
> **Related:** `docs/web-design/MATH_MODEL.md`, `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`, `docs/web-design/ENEMY_LOGIC_V1.md`, `docs/web-design/ENEMY_MOTION_EXECUTION_V1.md`

---

## 1. Goal

Generate playable levels algorithmically while preserving the project’s truth model and deterministic runtime behavior.

Primary outcomes:
1. Generator outputs content compatible with existing loader contracts.
2. Generated levels are validated and solvable.
3. Enemy/rift/object placements are configurable via generation parameters.

---

## 2. Non-Negotiable Constraints

1. Truth model is unchanged:
- player truth = `WorldLineState`
- object/enemy truth = `TimeCube`
2. Output must conform to content schemas (`LevelConfig`, `BehaviorConfig`, `ThemeConfig`, `GameRulesConfig`).
3. Generation is deterministic for a fixed seed + params.
4. Unsolvable outputs are rejected, not auto-shipped.

---

## 3. V1 System Boundary

Included:
1. Seeded procedural generation for map layout + placements.
2. Enemy policy assignment generation (`Static`, `PatrolLoop`, `PatrolPingPong`).
3. Rift placement generation (baseline anchor/delta form).
4. Deterministic solvability validator.
5. Quality scoring + reject loop.

Not included:
1. Natural-language story-to-level compiler.
2. Adaptive enemy AI generation.
3. Cloud service or backend-only generation dependency.

---

## 4. Generator Inputs

`MapGenRequest` (conceptual):
1. `seed: string | number`
2. `board`: width, height, timeDepth
3. `difficulty`: target complexity band
4. `budgets`:
- max walls
- max dynamic objects
- max enemies
- max rifts
5. `featureFlags`:
- allowPull
- allowPushChains
- allowFutureRifts
6. `styleProfile` (optional):
- corridor-heavy / room-heavy / mixed

---

## 5. Generator Outputs

`MapGenResult`:
1. `contentPack`:
- `level`
- `behavior`
- `theme` (optional default binding)
- `rules`
2. `metadata`:
- seed
- generation parameters
- solver stats
- quality score
3. `diagnostics` (for rejected attempts):
- rejection reason
- failed constraints

---

## 6. Pipeline

1. Candidate construction:
- place start + exit
- generate traversable topology
- place static blockers
- place dynamic objects
- place enemies + assign policies
- place rifts

2. Validation:
- schema + bounds + reference checks (existing validators)
- extra generation sanity checks (no impossible spawn, no null policy paths)

3. Solvability:
- run deterministic solver over generated content
- require at least one valid solution path

4. Quality filter:
- score candidate
- reject if below threshold

5. Emit:
- return accepted content pack + metadata

---

## 7. Solvability Contract (V1)

A generated level is solvable when:
1. At least one legal action sequence reaches `Won`.
2. The sequence does not end in `Paradox` or `Detected` before win.
3. Sequence length is within configured upper bound.

Solver requirements:
1. Deterministic search order.
2. Configurable depth/branch limits.
3. Stable result for same input seed + params.

---

## 8. Quality Metrics (V1)

Use simple numeric scores first:
1. Path viability score:
- shortest known solution length in target band.
2. Interaction richness:
- includes at least one non-trivial interaction (push/pull/rift).
3. Detection pressure:
- not trivial safe stroll, not instant unavoidable detection.
4. Spatial diversity:
- avoid degenerate open box with minimal constraints.

Outputs below threshold are rejected and regenerated.

---

## 9. Data-Driven Enemy and Rift Generation

Enemy generation:
1. place enemy instances into `level.instances`
2. generate behavior policies into `behavior.policies`
3. bind via `behavior.assignments`
4. optional detection tuning via:
- `detectionProfiles`
- `detectionAssignments`
- `defaultDetectionProfile`

Rift generation:
1. emit as object/archetype instances and/or explicit rift entries per schema evolution
2. validate all targets in bounds and time-valid

---

## 10. Runtime Integration Model

1. Generator can run:
- offline script (current path: `frontend/scripts/export-generated-pack.ts` via `npm run gen:pack`), or
- in-browser utility mode for local play
2. Runtime consumes generated pack through existing content loader and manifest (`frontend/public/data/index.json`).
3. No gameplay reducer special-casing for generated content.

---

## 11. Acceptance Criteria (V1)

1. Generator produces schema-valid packs.
2. Accepted packs pass solver solvability check.
3. Same seed + params produce identical output.
4. Generated packs run without code changes in existing boot/content pipeline.
5. Tests cover determinism, solver validity, and rejection logic.
