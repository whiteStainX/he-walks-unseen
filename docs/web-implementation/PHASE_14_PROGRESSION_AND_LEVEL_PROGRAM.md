# Phase 14: Progression and Level Program

> **Goal:** Move from pack infrastructure to a player-facing level program with progression, level selection, and curated difficulty flow.
> **Design Detail:** `docs/web-design/LEVEL_SYSTEM_FULL.md`
> **Related:** `docs/web-design/UI_WINDOW_SYSTEM.md`, `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`, `docs/web-implementation/PHASE_13_FULL_LEVEL_SYSTEM.md`

---

## Status

- `Status`: Completed

Progress:
1. 14A progression manifest contract implemented (`frontend/src/data/progression.ts` + tests).
2. Baseline progression manifest added at `frontend/public/data/progression/index.json`.
3. 14B runtime progression state + local persistence implemented (`useProgressionState` + helper tests).
4. 14C minimal progression/level selection overlay implemented (`ProgressionOverlay` + keyboard navigation).
5. 14D completion + unlock policy implemented (mark complete on win, unlock next, lock-gated selection).
6. 14E curated baseline documented and applied (current 3-slot coherent ramp with explicit 8-12 expansion target).

---

## Scope

In scope:
1. Progression manifest format and loader support.
2. Minimal level selection UI (pack browser) aligned with current HUD model.
3. Progression unlock/evaluation model (deterministic, local-only).
4. Curated level program baseline (initial ordered set and difficulty labels).
5. Authoring/validation workflow updates for progression files.

Out of scope:
1. Cloud saves/account sync.
2. Story scripting system.
3. Full visual redesign of current HUD.

---

## Workstreams

## 14A. Progression Manifest Contract

Implement:
1. Add progression manifest in `frontend/public/data/progression/index.json`.
2. Define schema with:
- `schemaVersion`
- progression tracks (for example `main`)
- ordered level entries by pack id
- optional unlock conditions
- optional metadata (`title`, `difficulty`, `tags`)
3. Add parser/validation for progression file shape and references.

File targets:
1. `frontend/src/data/progression.ts` (new)
2. `frontend/src/data/progression.test.ts` (new)
3. `frontend/public/data/progression/index.json` (new)

Exit criteria:
1. Progression manifest validates.
2. All progression entries reference existing packs.

## 14B. Runtime Progression State

Implement:
1. Add local progression state model:
- current selected track
- unlocked pack ids
- completed pack ids
- current pointer/index
2. Persist progression state in local storage.
3. Keep progression state independent from core simulation truth model.

File targets:
1. `frontend/src/app/shell/useProgressionState.ts` (new)
2. `frontend/src/app/shell/useUiSettings.ts` (only if shared persistence helpers are needed)

Exit criteria:
1. Progression state restores after reload.
2. Restart/reset gameplay does not wipe progression unintentionally.

## 14C. Level Selection UI (Minimal)

Implement:
1. Add a compact progression/level browser overlay.
2. Show:
- pack name/id
- class
- difficulty
- lock/completion state
3. Keyboard-first controls for selection and load (`G` open/close, arrows/WASD navigate, `Enter` load).
4. Keep current `V` cycling as fallback.

File targets:
1. `frontend/src/app/shell/ProgressionOverlay.tsx` (new)
2. `frontend/src/app/inputStateMachine.ts`
3. `frontend/src/app/shell/useKeyboardControls.ts`
4. `frontend/src/app/GameShell.tsx`
5. `frontend/src/App.css`

Exit criteria:
1. Player can choose level from overlay without editing manifest or using key cycle.
2. Overlay interaction remains deterministic and layer-safe.

## 14D. Completion and Unlock Policy

Implement:
1. Mark level completed on `Won`.
2. Unlock next entry in track by default.
3. Optional condition hooks (future-ready), but baseline unlock policy should remain simple and deterministic.
4. Enforce lock gating in progression overlay selection (`Enter` loads only unlocked entry, except current loaded pack).

File targets:
1. `frontend/src/app/shell/useProgressionState.ts`
2. `frontend/src/game/gameSlice.ts` (read-only phase signal usage only; avoid adding simulation-side branching)
3. `frontend/src/app/GameShell.tsx`

Exit criteria:
1. Winning a level updates completion and unlock state.
2. Newly unlocked levels appear immediately in progression UI.

## 14E. Curated Program Baseline

Implement:
1. Define first curated sequence (initial 8-12 packs target).
2. Provide clear difficulty ramp labels.
3. Document authoring expectations for each slot (mechanic focus, intended challenge profile).

File targets:
1. `frontend/public/data/progression/index.json`
2. `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`
3. `docs/web-design/LEVEL_SYSTEM_FULL.md` (if policy details are promoted to design layer)

Exit criteria:
1. There is a coherent playable progression path, not just independent packs.
2. Current baseline may be shorter than 8-12 while pack inventory is limited, but must document explicit expansion policy and slot expectations.

---

## Execution Sequence

1. 14A progression contract and parser.
2. 14B progression local state and persistence.
3. 14C minimal progression overlay UI.
4. 14D completion/unlock integration.
5. 14E curated program baseline population.
6. Final validation and docs sync.

---

## Test Plan

1. Data tests:
- progression schema validation
- invalid references rejected
2. App state tests:
- unlock flow on win
- persistence restore behavior
3. UI tests:
- overlay open/close
- keyboard navigation and selection
4. Regression tests:
- existing content loading and gameplay loop unchanged
5. Quality gates:
- `npm run lint`
- `npm run test -- --run`
- `npm run build`
- `npx tsc --noEmit`
- `npm run validate:pack -- --all`

---

## Acceptance Criteria

1. Player can browse/select levels from a progression UI.
2. Progression completion and unlock state persists locally.
3. Curated level sequence is explicit and playable end-to-end.
4. Existing deterministic gameplay behavior remains unchanged.
5. Docs and implementation stay aligned for continued level-program iteration.
