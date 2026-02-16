# Phase 12: Map Generation (V1)

> **Depends on:** `docs/web-design/MAP_GENERATION_V1.md`
> **Related:** `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`, `docs/web-design/ENEMY_LOGIC_V1.md`
> **Scope:** Deterministic generator + solvability validator + quality gate pipeline.

---

## Goal

Implement a generator that outputs playable, schema-valid content packs and rejects invalid/unsolved candidates.

Primary outcomes:
1. Seeded deterministic generation.
2. Solvability gating before acceptance.
3. Generated enemy/rift/object configs are fully data-driven.

---

## Status

- `Status`: In Progress (foundation implemented on 2026-02-16)

---

## Locked Rules

1. Reuse existing content contracts (no ad-hoc runtime-only map format).
2. Reuse existing loader/validator entry points for final acceptance.
3. Keep gameplay truth model and phase ordering unchanged.
4. No backend requirement for V1.

---

## Deliverables

1. Generator request/result interfaces.
2. Candidate constructor module (layout + placements + enemy/rift assignment).
3. Solvability validator module.
4. Quality scoring and rejection loop.
5. Fixture outputs and deterministic test coverage.

---

## Workstreams

### 12A. Interface and Module Boundaries

Implement:
1. `MapGenRequest`, `MapGenResult`, `MapGenDiagnostics`
2. generator options and defaults
3. stable seed handling

File targets:
1. `frontend/src/data/generation/contracts.ts` (new)
2. `frontend/src/data/generation/index.ts` (new)

Exit criteria:
1. API surface is stable and testable.

### 12B. Candidate Constructor

Implement deterministic candidate build:
1. map topology
2. static/dynamic placements
3. enemy instance + policy assignment
4. rift placement
5. content pack assembly

File targets:
1. `frontend/src/data/generation/generator.ts` (new)
2. `frontend/src/data/generation/random.ts` (new seeded PRNG helper)

Exit criteria:
1. identical seed + params => identical candidate content.

### 12C. Solvability Validator

Implement solver pass:
1. run deterministic search from start
2. detect win path existence
3. return solver stats (visited states, depth, found path length)

File targets:
1. `frontend/src/data/generation/solver.ts` (new)

Exit criteria:
1. unsolved candidates are rejected before publish.

### 12D. Quality Filter + Retry Loop

Implement:
1. scoring function
2. threshold checks
3. bounded retries (`maxAttempts`)
4. deterministic failure diagnostics when no candidate accepted

File targets:
1. `frontend/src/data/generation/quality.ts` (new)
2. `frontend/src/data/generation/index.ts` (orchestrator)

Exit criteria:
1. accepted maps pass both solvability and score threshold.

### 12E. Loader Integration + Fixtures

Implement:
1. generated output saved in content-pack-compatible JSON
2. fixture generation script/util
3. optional debug command to emit pack into `frontend/public/data/generated/`

File targets:
1. `frontend/src/data/generation/export.ts` (new)
2. `frontend/public/data/generated/` fixtures

Exit criteria:
1. generated pack loads via existing `loadBootContentFromPublic` path.

### 12F. Tests and Validation

Add tests for:
1. determinism by seed
2. schema validity
3. solver gating
4. quality rejection/acceptance logic

File targets:
1. `frontend/src/data/generation/*.test.ts` (new)

Exit criteria:
1. full suite green and deterministic.

---

## Execution Sequence

1. Define generator contracts and seeded RNG.
2. Build candidate constructor.
3. Build solver and wire gating.
4. Add quality scoring and retry orchestration.
5. Emit fixture packs and integrate load path.
6. Run lint/test/build and finalize docs.

---

## Test Plan

1. Unit:
- PRNG determinism
- topology generation invariants
- enemy policy assignment validity
2. Solver:
- known solvable fixture accepted
- known unsolvable fixture rejected
3. Integration:
- generated pack loads and boots game
4. Quality gates:
- `npm run lint`
- `npm run test`
- `npm run build`

---

## Acceptance Criteria

1. Generator emits schema-valid content packs.
2. Accepted outputs are solvable under runtime rules.
3. Enemy/rift/object config remains data-driven and contract-compliant.
4. Outputs are deterministic by seed/params.
5. Existing runtime modules require no reducer branching for generated content.

---

## Out of Scope

1. Story prompt to level compiler.
2. Multi-level campaign generation.
3. Online generation API/service.

---

## Foundation Notes

Implemented foundation modules:
1. `frontend/src/data/generation/contracts.ts`
2. `frontend/src/data/generation/profile.ts`
3. `frontend/src/data/generation/random.ts`
4. `frontend/src/data/generation/generator.ts`
5. `frontend/src/data/generation/solver.ts`
6. `frontend/src/data/generation/quality.ts`
7. `frontend/src/data/generation/index.ts`
8. `frontend/src/data/generation/random.test.ts`
9. `frontend/src/data/generation/solver.test.ts`
10. `frontend/src/data/generation/index.test.ts`
11. `frontend/src/data/generation/profile.test.ts`
12. `frontend/src/data/content/default.generation-profile.json`
13. `frontend/public/data/generation/default.profile.json`

Current behavior:
1. Seeded deterministic candidate generation is available.
2. Generation defaults are profile-driven (via validated generation profile).
3. Candidates are schema-validated, solvability-checked, and quality-gated.
4. Output is in-memory content-pack data; fixture export tooling remains next.
5. Rift placement generation is not implemented yet in this foundation pass.
