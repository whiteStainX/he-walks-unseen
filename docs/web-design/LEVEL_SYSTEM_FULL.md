# Full Level System Design (Web)

> **Purpose:** Define the target architecture for a complete, data-driven level system beyond baseline single-pack play.
> **Scope:** Level data contracts, authoring flow, validation/solvability pipeline, progression structure, and runtime loading model.
> **Related:** `docs/web-design/MATH_MODEL.md`, `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`, `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`, `docs/web-design/MAP_GENERATION_V1.md`, `docs/web-design/ENEMY_LOGIC_V1.md`

---

## 1. Target Outcome

The full level system should support:
1. Hand-authored puzzle levels.
2. Deterministic generated levels.
3. Hybrid workflows (generated base + curated edits).
4. Consistent runtime behavior under the existing truth model:
- player truth = `WorldLineState`
- object/enemy truth = `TimeCube`

---

## 2. Design Principles

1. Data-first: level behavior is configured in content files, not reducer branches.
2. Deterministic: same pack + same inputs = same results.
3. Contract-safe: schema and validator gate all loadable content.
4. Modular: level composition, behavior policies, and rendering metadata are separable.
5. Author-friendly: clear workflow for manual and generated content.

---

## 3. System Boundary

## 3.1 In Scope

1. Pack-level data model (`level`, `behavior`, `rules`, `theme`, icon binding).
2. Pack registry and selection flow.
3. Validation and solvability checks.
4. Difficulty metadata and quality thresholds.
5. Authoring workflows and generation pipeline.

## 3.2 Out of Scope (for now)

1. Narrative scripting runtime.
2. Online backend service.
3. Multiplayer/state sync.

---

## 4. Canonical Runtime Contract

Each playable pack is keyed by `<packId>` and includes:
1. `frontend/public/data/<packId>.level.json`
2. `frontend/public/data/<packId>.behavior.json`
3. `frontend/public/data/<packId>.rules.json`
4. `frontend/public/data/<packId>.theme.json`
5. Manifest entry in `frontend/public/data/index.json`

Current validator/loader entry points:
1. `frontend/src/data/validate.ts`
2. `frontend/src/data/loader.ts`
3. `frontend/src/data/contentAdapter.ts`

---

## 5. Full-Level Composition Model

A full level is composed of these layers:
1. Geometry layer:
- board dimensions
- time depth
- start anchor
2. Object layer:
- archetypes + components
- placed instances
- render symbol bindings
3. Behavior layer:
- movement policies
- policy assignments
- detection profiles and overrides
4. Rule layer:
- rift defaults
- interaction defaults
- detection defaults
5. Presentation layer:
- theme vars
- icon pack binding

This keeps simulation, balancing, and visual styling independently tunable.

---

## 6. Validation and Solvability Gates

## 6.1 Validation Gate (must pass)

1. Schema version and shape checks.
2. Map bounds and start validity.
3. Archetype/instance references.
4. Behavior assignment references.
5. Rift target validity and conflict checks.
6. Icon slot reference validity.

## 6.2 Solvability/Quality Gate (pack class dependent)

For generated and promoted packs:
1. Deterministic solver pass.
2. Quality threshold pass.
3. Export compatibility pass.

For curated packs:
1. Validation gate always required.
2. Solver gate optional but strongly recommended for regression safety.

---

## 7. Level Classes

Define explicit pack classes for lifecycle clarity:
1. `curated`: manually authored puzzle level.
2. `generated`: direct generator output.
3. `hybrid`: generated base with manual edits.
4. `experimental`: loadable only in dev workflows.

Suggested manifest extension (future):
1. `class`
2. `difficulty`
3. `tags`
4. `source` metadata (`seed`, `profileId`, `author`)

---

## 8. Difficulty Model (System-Level)

Difficulty should combine:
1. Declarative settings:
- detection range/delay
- push/pull constraints
- rift defaults
2. Structural pressure:
- topology density
- enemy policy pressure
- interaction richness
3. Measured metrics:
- shortest solution length
- solver visited nodes
- quality score

This allows both intentional design and measurable tuning.

---

## 9. Progression Structure (Future-Compatible)

Introduce an optional progression manifest that groups pack ids:
1. episodes or chapters
2. unlock conditions
3. recommended order

Runtime constraint:
1. progression metadata must not change core simulation determinism.
2. progression only controls selection and presentation.

---

## 10. Tooling Roadmap (Full Level System)

1. Schema hardening:
- formalize pack-class metadata
- formalize progression manifest schema
2. Validation tooling:
- add dedicated validation CLI for arbitrary pack ids
3. Generation tooling:
- expand strategy families and profile presets
- support hybrid export metadata
4. Authoring UX:
- optional in-app authoring assistant for non-programmatic iteration
5. CI quality gates:
- validate all registered packs
- run deterministic solver/quality checks for selected pack classes

---

## 11. Acceptance Criteria (Full System)

The full level system is considered ready when:
1. All registered packs load through one contract-safe pipeline.
2. Curated and generated packs coexist without runtime branching complexity.
3. Level tuning is primarily data edits, not reducer logic edits.
4. Difficulty labeling is consistent with measured solver/quality behavior.
5. Authoring documentation is sufficient for repeatable creation and iteration.

---

## 12. Immediate Next Step

Current follow-up implementation target:
1. Execute progression and level-program implementation in:
- `docs/web-implementation/PHASE_14_PROGRESSION_AND_LEVEL_PROGRAM.md`
2. Add progression manifest + runtime selection/unlock loop.
3. Keep progression metadata strictly presentation/select-flow only (no simulation-logic branching).
