# Phase 3 Objects Review

## Purpose

This file tracks a structured review of Phase 3 object and occupancy models before moving into Phase 4 interactions.
Use it as the single source of truth for findings, decisions, and follow-up actions.

---

## Review Workflow

1. Read one reference section at a time.
2. Add findings under the matching review notes section.
3. Convert accepted changes into action items.
4. Mark action items complete after code + tests + docs are updated.

---

## Core Reference Map

### 1) Component primitives
- `frontend/src/core/components.ts:3`
- Focus: marker/data components and reusable `hasComponent(...)`.

### 2) Object contracts and registry
- `frontend/src/core/objects.ts:10`
- Focus: `ObjectArchetype`, `ObjectInstance`, `ObjectRegistry`, `resolveObjectInstance(...)`.

### 3) TimeCube occupancy model
- `frontend/src/core/timeCube.ts:5`
- Focus: slice storage, spatial index, placement, occupancy queries, and blocking/exit helpers.
- Key sections:
  - `placeObjects(...)` at `frontend/src/core/timeCube.ts:128`
  - `objectsAt(...)` at `frontend/src/core/timeCube.ts:147`
  - `isBlocked(...)` at `frontend/src/core/timeCube.ts:170`
  - `hasExit(...)` at `frontend/src/core/timeCube.ts:176`

---

## Integration Reference Map

### 4) Level bootstrap and configuration
- `frontend/src/game/levelObjects.ts:4`
- Focus: default archetypes/instances, bootstrap flow, and failure shape.

### 5) Reducer integration and truth boundaries
- `frontend/src/game/gameSlice.ts:35`
- Focus: dual truth model in reducer behavior:
  - player truth via `worldLine`
  - object truth via `cube` occupancy
- Key sections:
  - object bootstrap at `frontend/src/game/gameSlice.ts:49`
  - movement blocking at `frontend/src/game/gameSlice.ts:101`
  - win check at `frontend/src/game/gameSlice.ts:136`
  - move/wait/rift integration at `frontend/src/game/gameSlice.ts:156`

### 6) Render integration
- `frontend/src/render/GameBoardCanvas.tsx:8`
- Focus: draw order and data-driven object rendering:
  - objects first: `frontend/src/render/GameBoardCanvas.tsx:59`
  - past selves next: `frontend/src/render/GameBoardCanvas.tsx:79`
  - current self on top: `frontend/src/render/GameBoardCanvas.tsx:87`
- UI selector wiring: `frontend/src/app/GameShell.tsx:40`

---

## Test Coverage Map

### 7) Core object tests
- `frontend/src/core/objects.test.ts:5`
- Focus: known/unknown archetypes, instance override merge behavior.

### 8) TimeCube tests
- `frontend/src/core/timeCube.test.ts:31`
- Focus: occupancy indexing, blocked/exit queries, slice retrieval.

### 9) Reducer behavior tests
- `frontend/src/game/gameSlice.test.ts:12`
- Focus:
  - wall blocking
  - empty-cell movement
  - exit -> `Won`
  - post-win input guard + restart recovery

---

## Review Checklist

- [ ] Component model is minimal and extensible for Phase 4.
- [ ] Object registry and instance resolution are deterministic.
- [ ] TimeCube occupancy queries are correct for `(x,y,t)` access.
- [ ] Reducer keeps truth boundaries clean (`WorldLineState` vs `TimeCube`).
- [ ] Win condition behavior is explicit and consistent.
- [ ] Render layering matches the design contract.
- [ ] Tests cover required Phase 3 edge cases.
- [ ] Known limitations are recorded for Phase 4.

---

## Notes by Section

### Component model notes
- _TBD_

### Registry and objects notes
- _TBD_

### TimeCube occupancy notes
- _TBD_

### Reducer integration notes
- _TBD_

### Render integration notes
- _TBD_

### Test coverage notes
- _TBD_

---

## Decisions Log

| ID | Decision | Status | Notes |
|----|----------|--------|-------|
| D-01 | _TBD_ | Proposed | |

Status values: `Proposed`, `Accepted`, `Rejected`, `Implemented`.

---

## Action Items

| ID | Action | Owner | Status |
|----|--------|-------|--------|
| A-01 | _TBD_ | _TBD_ | Open |

Status values: `Open`, `In Progress`, `Done`.

---

## Exit Criteria for Review

- All checklist items are resolved.
- All accepted actions are implemented.
- Tests/lint pass after each accepted change.
- Phase 4 can begin with explicit known limitations recorded.
