# Phase 3.5 Isometric Review

## Purpose

This file tracks a structured review of Phase 3.5 isometric TimeCube visualization before moving into Phase 4 interactions.
Use it as the single source of truth for findings, decisions, and follow-up actions.

---

## Review Workflow

1. Read one reference section at a time.
2. Add findings under the matching review notes section.
3. Convert accepted changes into action items.
4. Mark action items complete after code + tests + docs are updated.

---

## Core Reference Map

### 1) Time-window selector
- `frontend/src/render/iso/selectIsoWindow.ts:1`
- Focus: deterministic 10-slice windowing, boundary clamping, focus placement.

### 2) Isometric view-model builder
- `frontend/src/render/iso/buildIsoViewModel.ts:1`
- Focus: mapping from player/object truth sources into render-only `IsoCubeViewModel`.
- Key sections:
  - window selection call at `frontend/src/render/iso/buildIsoViewModel.ts:41`
  - player mapping at `frontend/src/render/iso/buildIsoViewModel.ts:46`
  - object mapping at `frontend/src/render/iso/buildIsoViewModel.ts:52`

### 3) Isometric panel renderer
- `frontend/src/render/iso/IsoTimeCubePanel.tsx:1`
- Focus: orthographic render strategy, edge-only blocks, layer visibility, world-line polyline.
- Key sections:
  - edge outlines for object/player blocks at `frontend/src/render/iso/IsoTimeCubePanel.tsx:64`
  - camera and zoom behavior at `frontend/src/render/iso/IsoTimeCubePanel.tsx:137`
  - world-line polyline at `frontend/src/render/iso/IsoTimeCubePanel.tsx:200`

---

## Integration Reference Map

### 4) App wiring and selectors
- `frontend/src/app/GameShell.tsx:42`
- Focus: view-model derivation, panel composition, window caption.
- Key sections:
  - `buildIsoViewModel(...)` memoization at `frontend/src/app/GameShell.tsx:56`
  - panel mount at `frontend/src/app/GameShell.tsx:143`

### 5) Layout behavior
- `frontend/src/App.css:84`
- Focus: board/isometric panel ratio, responsive fallback, no-scroll constraints.
- Key sections:
  - desktop split at `frontend/src/App.css:86`
  - panel sizing at `frontend/src/App.css:103`
  - mobile hide fallback at `frontend/src/App.css:151`

### 6) Theme alignment
- `frontend/src/render/theme.ts:12`
- Focus: monochrome style consistency for isometric panel tokens.

---

## Test Coverage Map

### 7) Window selector tests
- `frontend/src/render/iso/selectIsoWindow.test.ts:5`
- Focus:
  - latest-time behavior
  - limited-future split
  - centered behavior when future is abundant
  - boundary clamp behavior

### 8) View-model tests
- `frontend/src/render/iso/buildIsoViewModel.test.ts:58`
- Focus:
  - bounded window + focus
  - player/object mapping for target slice

### 9) Regression baseline
- `frontend/src/game/gameSlice.test.ts:12`
- Focus: existing gameplay behavior remains unchanged with iso panel added.

---

## Review Checklist

- [ ] Window selector logic matches Phase 3.5 design rules exactly.
- [ ] View-model strictly derives from `WorldLineState` + `TimeCube` (no logic drift).
- [ ] Isometric renderer remains read-only and does not mutate gameplay state.
- [ ] Visual style stays monochrome/minimal (no lighting effects or heavy wireframes).
- [ ] Isometric panel and main board layout balance is acceptable on desktop.
- [ ] Mobile fallback behavior is acceptable.
- [ ] Tests cover windowing and mapping edge cases sufficiently.
- [ ] Known limitations are explicitly recorded for Phase 4 handoff.

---

## Notes by Section

### Window selector notes
- _TBD_

### View-model notes
- _TBD_

### Isometric renderer notes
- _TBD_

### Integration/layout notes
- _TBD_

### Theme/style notes
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
