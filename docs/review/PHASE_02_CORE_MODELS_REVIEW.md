# Phase 2 Core Models Review

## Purpose

This file tracks a structured review of Phase 2 core models before moving deeper into Phase 3.
Use it as the single source of truth for review findings, decisions, and follow-up actions.

---

## Review Workflow

1. Read one reference section at a time.
2. Add findings under the matching review notes section.
3. Convert accepted changes into action items.
4. Mark action items complete after code + tests + docs are updated.

---

## Core Reference Map

### 1) Position primitives
- `frontend/src/core/position.ts:1`
- Focus: coordinate types, movement helper, bounds helper, distance helper.

### 2) World line model
- `frontend/src/core/worldLine.ts:3`
- Focus: `P_n` representation, self-intersection, normal vs rift extension, same-time query.

### 3) Rift reusable resolver
- `frontend/src/core/rift.ts:3`
- Focus: instruction model (`default | delta | tunnel`), configurable settings/resources, target resolution, validation order.

### 4) Time cube skeleton
- `frontend/src/core/timeCube.ts:1`
- Focus: current minimal structure and readiness for object occupancy in Phase 3.

---

## Integration Reference Map

### 5) Reducer integration
- `frontend/src/game/gameSlice.ts:30`
- Focus: how core models are consumed by reducer actions.
- Key sections:
  - `movePlayer2D` at `frontend/src/game/gameSlice.ts:85`
  - `applyRift` at `frontend/src/game/gameSlice.ts:135`
  - `configureRiftSettings` at `frontend/src/game/gameSlice.ts:185`

### 6) Test coverage
- `frontend/src/core/worldLine.test.ts:12`
- `frontend/src/core/rift.test.ts:16`
- `frontend/src/game/gameSlice.test.ts:5`

---

## Review Checklist

- [ ] Position model is minimal and sufficient.
- [ ] WorldLine invariants are correct and complete.
- [ ] Rift resolver API is reusable for future mechanics.
- [ ] Reducer validation order is correct and deterministic.
- [ ] Error/status messaging is precise enough for debugging.
- [ ] Tests cover the required edge cases for Phase 2.
- [ ] Known limitations are explicitly documented for Phase 3.

---

## Notes by Section

### Position model notes
- _TBD_

### WorldLine notes
- _TBD_

### Rift resolver notes
- _TBD_

### Reducer integration notes
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
- Phase 3 can begin with explicit known limitations recorded.
