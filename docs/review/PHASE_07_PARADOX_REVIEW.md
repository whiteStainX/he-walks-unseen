# Phase 7 Paradox Review

## Purpose

This file tracks a structured review of Phase 7 paradox validation before moving to the next phase.
Use it as the single source of truth for findings, decisions, and follow-up actions.

---

## Review Workflow

1. Read one reference section at a time.
2. Add findings under the matching review notes section.
3. Convert accepted changes into action items.
4. Mark action items complete after code + tests + docs are updated.

---

## Core Reference Map

### 1) Paradox contracts and evaluator
- `frontend/src/core/paradox.ts:1`
- Focus: `CausalAnchor`, `ParadoxReport`, violation reasons, `evaluateParadoxV1(...)`.

### 2) World-line membership check
- `frontend/src/core/worldLine.ts:20`
- Focus: `positionKey(...)`, `visited` index contract, player anchor validation assumptions.

### 3) TimeCube object presence checks
- `frontend/src/core/timeCube.ts:154`
- Focus: `objectsAt(...)` and `getObjectById(...)` behavior used by object anchor checks.

---

## Game Loop Reference Map

### 4) Interaction contracts with paradox fields
- `frontend/src/game/interactions/types.ts:1`
- Focus:
  - `GamePhase` includes `Paradox`
  - `InteractionState` paradox fields
  - history metadata (`anchors`, `affectedFromTime`)

### 5) Pipeline ordering and anchor capture
- `frontend/src/game/interactions/pipeline.ts:1`
- Focus:
  - commit anchor builder
  - post-check order `Paradox -> Won -> Detected`
  - deterministic status transitions

### 6) Reducer state lifecycle
- `frontend/src/game/gameSlice.ts:1`
- Focus:
  - paradox defaults/config
  - restart/content-load reset behavior
  - persistence fields (`lastParadox`, `causalAnchors`)

---

## UI Reference Map

### 7) State-window paradox metrics
- `frontend/src/app/GameShell.tsx:74`
- Focus:
  - paradox section visibility
  - reported anchor/violation counts
  - phase/status consistency with reducer state

---

## Test Coverage Map

### 8) Core evaluator tests
- `frontend/src/core/paradox.test.ts:1`
- Focus:
  - satisfied anchors
  - `PlayerMissing`, `ObjectMissing`, `ObjectMismatch`
  - `checkedFromTime` window behavior

### 9) Reducer and pipeline tests
- `frontend/src/game/gameSlice.test.ts:260`
- Focus:
  - transition to `Paradox`
  - post-paradox input guard
  - restart clearing paradox state
  - paradox priority over win/detection

---

## Review Checklist

- [ ] Paradox contracts are minimal, clear, and reusable.
- [ ] Anchor semantics are explicit and deterministic.
- [ ] `checkedFromTime` windowing behavior matches design intent.
- [ ] Pipeline ordering is correct and test-covered.
- [ ] Reducer reset semantics clear paradox state correctly.
- [ ] UI surfaces paradox state without confusion.
- [ ] Detection behavior remains unchanged when no paradox exists.
- [ ] Known Phase 7 limitations are documented for future iteration.

---

## Notes by Section

### Core evaluator notes
- _TBD_

### Pipeline integration notes
- _TBD_

### Reducer lifecycle notes
- _TBD_

### UI notes
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
- Tests/lint/build pass after each accepted change.
- Next phase begins with explicit known limitations recorded.
