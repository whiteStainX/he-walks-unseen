# Phase 6: Data Loading and Content Contracts (Web)

> **Depends on:** `docs/web-implementation/PHASE_05_DETECTION.md`
> **Design Reference:** `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`
> **Enables:** Phase 6.5+ generation tooling and Phase 7 paradox work on externalized content

---

## Goal

Ship a baseline content infrastructure where gameplay boots from validated external content files instead of hardcoded level bootstrap.

---

## Status

- `Status`: In Progress

Progress in current pass:
- contracts + default content pack fixtures added
- parser/validator baseline added
- loader baseline added and wired into bootstrap defaults
- default content pack mirrored under `public/data/`
- async public-data loader entrypoint added (`loadBootContentFromPublic`)
- behavior resolver module added (`Static`, `PatrolLoop`, `PatrolPingPong`, `ScriptedTimeline` position resolution)
- runtime pack switching added (`V` cycles `default` / `variant` from `public/data`)
- data-layer tests added

---

## Scope Lock

### In Scope (Phase 6 baseline)

1. Typed content contracts for:
- `LevelConfig`
- `BehaviorConfig`
- `ThemeConfig`
- `GameRulesConfig`

2. Parser + validator layer with structured errors.

3. Loader-backed bootstrap integration into game startup.

4. Enemy behavior policy selection loaded from data (at least static + patrol-loop baseline).

5. Fixture content pack under `frontend/public/data/` and integration tests.

### Out of Scope (defer)

1. Story-to-config natural language pipeline.
2. Full procedural generation and guaranteed-solvability runtime generator.
3. Advanced schema migrations beyond basic version checks.

---

## Implementation Plan

## 6A. Contracts and Schemas

Deliverables:
1. Add `frontend/src/data/contracts.ts` with canonical interfaces.
2. Add schema version field (`schemaVersion`) to all content roots.
3. Add JSON schema files under `frontend/public/data/schema/` (or `frontend/src/data/schema/`).

Exit criteria:
- content contracts are explicit and referenced by loader/parsers
- schema version is required and validated

## 6B. Parsing and Validation Layer

Deliverables:
1. Add `frontend/src/data/parse.ts` and `frontend/src/data/validate.ts`.
2. Define structured `ContentLoadError` union.
3. Validate cross-references:
- archetype keys
- behavior keys
- rift targets
- bounds/time-depth constraints

Exit criteria:
- invalid fixture files fail with actionable error messages
- no untyped `any` parsing path in loader

## 6C. Loader Integration

Deliverables:
1. Add `frontend/src/data/loader.ts` that loads and assembles content pack.
2. Replace hardcoded level bootstrap path in game initialization with loader-backed path.
3. Keep deterministic fallback strategy if content load fails (explicit failure status).

Exit criteria:
- app boots using external content files
- restarting preserves deterministic behavior

## 6D. Behavior Wiring

Deliverables:
1. Add behavior resolver module (pure): policy + time -> position.
2. Support baseline policy kinds:
- `Static`
- `PatrolLoop`
3. Wire resolver outputs into occupancy setup/update path.

Exit criteria:
- enemy policy choice is data-driven
- behavior change requires config edits, not reducer rewrites

## 6E. Tests and Fixtures

Deliverables:
1. Add data-layer unit tests for parse/validate/load contracts.
2. Add integration test for bootstrap using fixture content pack.
3. Add at least one invalid fixture for error-path assertions.

Exit criteria:
- `npm run lint`, `npm run test`, `npm run build` pass
- content loading failures are test-covered

---

## File Targets

Data layer:
- `frontend/src/data/contracts.ts`
- `frontend/src/data/parse.ts`
- `frontend/src/data/validate.ts`
- `frontend/src/data/loader.ts`
- `frontend/src/data/behaviorResolver.ts`

Fixtures:
- `frontend/public/data/levels/*.json`
- `frontend/public/data/behaviors/*.json`
- `frontend/public/data/themes/*.json`
- `frontend/public/data/rules/*.json`

Tests:
- `frontend/src/data/contracts.test.ts`
- `frontend/src/data/validate.test.ts`
- `frontend/src/data/loader.test.ts`

---

## Acceptance Criteria

1. Game boots from validated external content files.
2. Loader reports structured errors for invalid content.
3. Enemy movement policy is selected from behavior config.
4. Theme/rules values are loaded and applied.
5. Existing interaction and detection behavior is not regressed.

---

## Risks and Mitigations

1. Over-scoping Phase 6 with generator/story pipeline.
- Mitigation: lock Phase 6 to contracts + loader + baseline behavior wiring.

2. Hidden coupling between loader and reducer internals.
- Mitigation: keep loader output as typed DTOs mapped once at bootstrap boundary.

3. Invalid content causing unclear runtime failures.
- Mitigation: fail fast with explicit `ContentLoadError` and test invalid fixtures.
