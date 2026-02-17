# Phase 8: Polish (Web)

> **Depends on:** `docs/web-implementation/PHASE_07_PARADOX.md`
> **Design References:** `docs/web-design/UI_WINDOW_SYSTEM.md`, `docs/web-design/RENDERING.md`, `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`
> **Enables:** stable public-playable build quality

---

## Goal

Improve responsiveness, readability, and accessibility without changing core game mechanics.

Phase 8 focuses on:
- layer-aware input gating + intent preview
- smoother render updates and better bundle/runtime performance
- accessibility improvements for keyboard and screen-reader usage
- optional system/settings panel for runtime toggles

---

## Status

- `Status`: Implemented (baseline)

Implemented in this pass:
- input state machine with layer-aware directional gating (no cross-layer auto-dispatch)
- board preview pipeline integrated (ready for intent-driven extensions)
- lazy-loaded isometric panel to reduce initial bundle weight
- accessibility baseline improvements (`role=\"status\"`, live updates, focusable overlays, keyboard layer closing)
- optional settings panel with local-storage persistence for UI toggles
- tests for input machine and preview module

---

## Locked Rules

1. No changes to core truth model:
- player truth stays `WorldLineState`
- object truth stays `TimeCube`
2. No new gameplay mechanics in this phase.
3. Input polish must remain deterministic (one committed interaction per reducer step).
4. Visual style remains minimal monochrome baseline unless a setting explicitly changes tokens.
5. Existing phase transitions and priorities remain unchanged (`Paradox -> Won -> Detected`).

---

## Scope

### In Scope

- Intent-first input gating at UI/input-layer boundary
- Board action preview (non-committed visual hint)
- Render update smoothing and avoid unnecessary redraw work
- Basic accessibility pass (labels, keyboard navigation, overlay focus behavior)
- Optional settings panel with non-destructive toggles
- Performance and regression checks

### Out of Scope

- New interactions or combat/AI mechanics
- Mobile-first redesign
- New narrative/story UI system
- Backend/services work

---

## Workstreams

## 8A. Input Gating + Preview

Deliverables:
1. Add a pure input state module with deterministic layer ownership.
2. Directional actions dispatch only in `Gameplay` layer; no hidden queued input.
3. Add board preview for next intended action target (move/push/pull) without mutating state.
4. Keep existing keymap stable.

Exit criteria:
- blocked layers never dispatch gameplay actions
- no duplicate action dispatch from key repeat
- preview is visually clear and disappears when intent is invalid/cleared

## 8B. Render/Runtime Performance

Deliverables:
1. Reduce unnecessary canvas redraw triggers for board and danger markers.
2. Keep isometric panel responsive while preserving board priority.
3. Add code-splitting for heavy optional render paths (for example, iso panel) to reduce initial chunk.
4. Capture simple performance budget checks in docs/review notes.

Exit criteria:
- smooth interaction updates on typical laptop hardware
- no obvious input-to-visual lag under normal play
- bundle warning risk is reduced via chunking strategy

## 8C. Accessibility

Deliverables:
1. Improve semantic labeling for command/state/log windows and overlays.
2. Ensure overlay keyboard usability (`L`/`Esc`) and predictable focus behavior.
3. Ensure status/phase text is available to assistive tech via live-region semantics where appropriate.
4. Verify contrast and readability remain compliant for the monochrome baseline.

Exit criteria:
- full run can be played keyboard-only
- overlay interactions are operable without pointer
- status updates are announced or readable without visual-only dependency

## 8D. Optional Settings Panel

Deliverables:
1. Add a minimal system/settings panel toggle.
2. Settings include only existing safe toggles (for example, danger preview default, iso visibility, key-hint density).
3. Persist settings in local storage with safe fallback defaults.

Exit criteria:
- settings apply immediately and survive reload
- gameplay determinism is unaffected by settings toggles

---

## Implementation Plan

1. Extract input-layer logic from `GameShell` into a pure state machine module.
2. Add preview model builder for board target hints.
3. Integrate preview rendering in board layer without changing object/player truth.
4. Add lazy-loading boundary for heavy optional render panel(s).
5. Add accessibility attributes and focus handling for overlay/system panel.
6. Add tests for input machine and preview behavior.
7. Run full lint/test/build and document measured outcomes.

---

## File Targets

App/Input:
- `frontend/src/app/GameShell.tsx`
- `frontend/src/app/inputStateMachine.ts` (new)
- `frontend/src/app/inputStateMachine.test.ts` (new)

Render:
- `frontend/src/render/board/GameBoardCanvas.tsx`
- `frontend/src/render/board/preview.ts` (new, optional)
- `frontend/src/render/iso/IsoTimeCubePanel.tsx` (lazy-load integration support if needed)

Style:
- `frontend/src/App.css`

Docs:
- `docs/web-implementation/PLAN.md`
- `docs/review/PHASE_08_POLISH_REVIEW.md` (to be added when implementation starts)

---

## Test Requirements

1. Input tests:
- layer priority prevents invalid dispatch
- deterministic directional dispatch behavior

2. Preview tests:
- intended target cell computation by mode/direction
- preview suppression when input layer blocks gameplay

3. Regression tests:
- existing reducer tests unchanged
- paradox/win/detection ordering unaffected

4. Build and quality:
- `npm run lint`
- `npm run test`
- `npm run build`

---

## Acceptance Criteria

1. Input feel is more responsive while preserving deterministic behavior.
2. Preview helps action planning without adding visual clutter.
3. UI remains single-screen and keyboard-first.
4. Accessibility baseline is materially improved.
5. Performance is stable for normal map sizes and no major UI jank is observed.

---

## Risks and Mitigations

1. Cross-layer inputs may leak gameplay actions.
- Mitigation: strict gameplay-layer gate for directional dispatch.

2. Preview rendering may diverge from actual validation rules.
- Mitigation: derive preview from shared movement helper contracts, not duplicated ad hoc logic.

3. Lazy-loading may cause temporary blank panels.
- Mitigation: add explicit fallback placeholder for deferred panels.
