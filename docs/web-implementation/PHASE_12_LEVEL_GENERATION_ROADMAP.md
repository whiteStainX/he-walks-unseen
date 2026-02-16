# Phase 12 Level Generation Roadmap

> **Goal:** Move from generation foundation to fully data-driven, playable generated levels.
> **Related:** `docs/web-design/MAP_GENERATION_V1.md`, `docs/web-implementation/PHASE_12_MAP_GENERATION.md`, `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`

---

## 1. Completion Definition

This roadmap is complete when generated levels are:
1. Config-driven by external generation profile files.
2. Solvable under core gameplay rules (not only 2D static reachability).
3. Exportable/loadable through the existing content pack flow.

---

## 2. Current Baseline

Already done:
1. Seeded candidate generator exists.
2. Schema validation, basic solver gate, quality gate exist.
3. Enemy generation and behavior assignment exist.
4. Export script writes generated packs + updates manifest (`npm run gen:pack`).

Current gaps:
1. Core defaults are profile-driven, but topology/placement strategies are still code-fixed.
2. Rift generation is baseline-only; strategy tuning is still code-fixed.
3. Solver is interaction-aware but still bounded/approximate for generation throughput tuning.
4. Export workflow is CLI-only (`npm run gen:pack`); in-app generation UI does not exist yet.

---

## 3. Execution Phases

### Phase A: Generation Profile Contract

Deliverables:
1. `GenerationProfile` schema in `frontend/src/data/generation/contracts.ts`.
2. Profile loader + validator (`frontend/src/data/generation/profile.ts`).
3. One default profile JSON fixture (`frontend/public/data/generation/default.profile.json`).

Exit criteria:
1. Generator accepts profile input and avoids hardcoded constants.

### Phase B: Rift-Aware Candidate Construction

Deliverables:
1. Rift placement strategy module (`frontend/src/data/generation/rift.ts`).
2. Candidate assembly includes rift objects/config.
3. Validation for rift target bounds and conflict constraints.

Exit criteria:
1. Generated packs can include valid rift structures.

### Phase C: Solver Upgrade (Gameplay-Rule Aware)

Deliverables:
1. Replace simplified BFS with bounded state search using game actions.
2. Solver supports turn/time progression and rift transitions.
3. Initial support for push/pull in solvability checks (bounded depth/branching).

Exit criteria:
1. “Solvable” reflects real gameplay rules for generated packs.

### Phase D: Quality Model Upgrade

Deliverables:
1. Profile-driven quality targets (path length band, pressure, interaction count).
2. Deterministic reject diagnostics.
3. Difficulty profile mapping (`easy/normal/hard`) to score thresholds.

Exit criteria:
1. Accepted maps match configured difficulty characteristics.

### Phase E: Export + Load Integration

Deliverables:
1. Export utility to write generated pack files.
2. Generated pack registration in content manifest (`public/data/index.json`) flow.
3. Smoke test that generated pack loads through normal runtime loader.

Exit criteria:
1. Generated content is playable without code edits.

---

## 4. Test Strategy

1. Unit tests:
- profile parsing/validation
- seeded determinism
- rift placement invariants
2. Solver tests:
- known solvable fixtures accepted
- known unsolvable fixtures rejected
3. Integration tests:
- generated pack loads and boots in game state
4. Quality gates:
- `npm run lint`
- `npm run test`
- `npm run build`

---

## 5. Recommended Build Order

1. Profile contract + loader.
2. Refactor generator to consume profile.
3. Add rift generation.
4. Upgrade solver.
5. Upgrade scoring.
6. Add export/load integration.

---

## 6. Acceptance Checklist

- [ ] Generation fully driven by external profile data
- [x] Rift generation integrated and validated
- [x] Solver checks gameplay-rule solvability
- [x] Generated packs export and load via standard pipeline
- [x] Deterministic output by seed/profile
- [x] Full lint/test/build pass
