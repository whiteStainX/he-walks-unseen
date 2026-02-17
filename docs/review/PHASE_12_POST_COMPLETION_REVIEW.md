# Phase 12 Post-Completion Review

## Purpose

Prepare a structured review pass now that Phase 12 is complete, so next work can focus on:
1. design-layer iteration (icons + level design),
2. refactor targets (hardcoded logic + oversized files).

---

## Baseline Verification

Verified on current branch:
1. `npm run -s lint` (pass)
2. `npm run -s test -- --run` (pass)
3. `npm run -s build` (pass)
4. `npx tsc --noEmit` (pass)

---

## Progress Update

### 2026-02-17: C1 implemented

Implemented:
1. Runtime model now uses `boardWidth` + `boardHeight` (removed single `boardSize` field).
2. Bounds checks now accept rectangular dimensions (`isInBounds(position, width, height)`).
3. Interaction pipeline and rift resolution now use width/height.
4. Loader exposes width/height separately.
5. Board and iso renders now frame/draw rectangular boards.
6. Solver no longer rejects non-square maps.

Validation:
1. Added rectangular-map regression checks in:
- `frontend/src/data/loader.test.ts`
- `frontend/src/data/generation/solver.test.ts`
2. Re-ran quality gates:
- `npm run -s lint`
- `npm run -s test -- --run`
- `npm run -s build`
- `npx tsc --noEmit`

Remaining items:
1. C2+ refactors (large file split, hardcoded strategy extraction) remain pending.

### 2026-02-17: C2 implemented

Implemented:
1. Extracted UI settings persistence into `frontend/src/app/shell/useUiSettings.ts`.
2. Extracted content-pack manifest/load effects into `frontend/src/app/shell/useContentPackLoading.ts`.
3. Extracted keyboard/input orchestration into `frontend/src/app/shell/useKeyboardControls.ts`.
4. Extracted HUD and overlays into dedicated components:
- `frontend/src/app/shell/HudPanels.tsx`
- `frontend/src/app/shell/BottomHintsBar.tsx`
- `frontend/src/app/shell/LogOverlay.tsx`
- `frontend/src/app/shell/StateOverlay.tsx`
- `frontend/src/app/shell/SettingsOverlay.tsx`
5. Simplified `frontend/src/app/GameShell.tsx` to shell composition + derived view state orchestration.

Validation:
1. `npm run -s lint`
2. `npm run -s test -- --run`
3. `npm run -s build`
4. `npx tsc --noEmit`

Remaining items:
1. C3+ refactors remain pending.

### 2026-02-17: C3 implemented

Implemented:
1. Split isometric rendering into focused modules:
- `frontend/src/render/iso/IsoSlices.tsx`
- `frontend/src/render/iso/IsoTracks.tsx`
- `frontend/src/render/iso/IsoActors.tsx`
- `frontend/src/render/iso/IsoCameraControls.tsx`
- `frontend/src/render/iso/constants.ts`
- `frontend/src/render/iso/camera.ts`
2. Reduced `frontend/src/render/iso/IsoTimeCubePanel.tsx` to orchestration layer.
3. Moved major geometry/opacity/camera tuning values into theme config (`frontend/src/render/theme.ts` → `iso.view`).

Validation:
1. `npm run -s lint`
2. `npm run -s test -- --run`
3. `npm run -s build`
4. `npx tsc --noEmit`

Remaining items:
1. C4+ refactors remain pending.

### 2026-02-17: C4 implemented

Implemented:
1. Extracted shared content conversion into `frontend/src/data/contentAdapter.ts`:
- `buildLevelObjectsConfigFromContent`
- `deriveRulesDetectionConfig`
- `buildEnemyDetectionConfigByIdFromContent`
2. Reused adapter in:
- `frontend/src/data/loader.ts`
- `frontend/src/data/generation/solver.ts`
3. Removed duplicated conversion logic from both modules.

Validation:
1. `npm run -s lint`
2. `npm run -s test -- --run`
3. `npm run -s build`
4. `npx tsc --noEmit`

Remaining items:
1. C5+ refactors remain pending.

### 2026-02-17: C5 implemented

Implemented:
1. Extended generation profile contract with data-driven tuning blocks:
- `solverGate` (generation solver bounds/feature switches)
- `qualityWeights` (quality scoring weights/caps)
- `strategies` (wall target + patrol path/policy selectors)
2. Updated profile validation and default fixtures:
- `frontend/src/data/generation/profile.ts`
- `frontend/src/data/content/default.generation-profile.json`
- `frontend/public/data/generation/default.profile.json`
3. Updated generation runtime to consume profile tuning:
- `frontend/src/data/generation/index.ts` now uses `solverGate` and `qualityWeights`
- `frontend/src/data/generation/generator.ts` now uses `strategies`
- `frontend/src/data/generation/quality.ts` now uses profile-provided weights
4. Expanded tests for strategy/quality/solver-gate behavior:
- `frontend/src/data/generation/index.test.ts`
- `frontend/src/data/generation/profile.test.ts`

Validation:
1. `npm run -s lint`
2. `npm run -s test -- --run`
3. `npm run -s build`
4. `npx tsc --noEmit`

Remaining items:
1. C6+ refactors remain pending.

---

## Docs Findings

### D1 (High): Phase 6 design doc is stale and contradicts current implementation

Evidence:
1. `docs/web-design/PHASE_06_CONTENT_SYSTEM.md:282`
2. `docs/web-design/PHASE_06_CONTENT_SYSTEM.md:283`
3. `docs/web-design/PHASE_06_CONTENT_SYSTEM.md:287`

Current behavior:
1. Doc still says parsing/validation/data layer are not ready.
2. Doc still says generator/solvability runtime do not exist.
3. These are now implemented and tested.

Impact:
1. Design decisions may be made against outdated assumptions.
2. Misleads further planning for icon/level design work.

Recommendation:
1. Add a `Current Reality (Post-Phase-12)` section in this doc.
2. Move old “Not ready yet” text into a historical note.
3. Link to `docs/web-implementation/PHASE_12_MAP_GENERATION.md` and `docs/web-implementation/PHASE_12_LEVEL_GENERATION_ROADMAP.md`.

Execution order: 1

### D2 (Medium): UI window spec still labels implemented behavior as “proposed/open”

Evidence:
1. `docs/web-design/UI_WINDOW_SYSTEM.md:134`
2. `docs/web-design/UI_WINDOW_SYSTEM.md:148`
3. `docs/web-design/UI_WINDOW_SYSTEM.md:182`

Current behavior:
1. `StateOverlay` and `Tab` transition are implemented.
2. Spec still lists them as planned/open decision.

Impact:
1. Creates ambiguity during future UX iteration.

Recommendation:
1. Move implemented items from “Proposed/Open Decisions” to “Current Contract”.
2. Keep only unresolved UX decisions in open items.

Execution order: 2

### D3 (Medium): No dedicated authoring doc for level design workflow (manual + generated)

Evidence:
1. Existing details are split across `README.md`, `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`, and generation docs.
2. No single “how to design levels” guide exists.

Impact:
1. Slows design-layer iteration for room layout/object placement/enemy tuning.
2. Increases risk of editing wrong file or breaking contracts.

Recommendation:
1. Add `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md` with:
- canonical files (`*.level.json`, `*.behavior.json`, `*.rules.json`, `*.theme.json`),
- validation constraints,
- deterministic playtest loop,
- generated-pack workflow via `npm run gen:pack`.

Execution order: 3

### D4 (Medium): No dedicated icon-pack authoring guideline

Evidence:
1. `docs/web-design/UI_WINDOW_SYSTEM.md` defines intent, but not an actionable authoring pipeline.
2. Icon schema exists in code (`frontend/src/data/contracts.ts`) but is not documented for designers.

Impact:
1. Harder to focus on icon design in a contract-safe way.

Recommendation:
1. Add `docs/web-design/ICON_PACK_AUTHORING.md` with:
- slot naming contract,
- required/optional slots,
- SVG constraints,
- fallback behavior and validation errors.

Execution order: 4

---

## Code Findings

### C1 (High): Runtime is still square-board-only while content contract is width/height

Evidence:
1. `frontend/src/core/position.ts:27`
2. `frontend/src/game/interactions/types.ts:58`
3. `frontend/src/data/loader.ts:136`
4. `frontend/src/game/levelObjects.ts:206`
5. `frontend/src/data/generation/solver.ts:228`
6. `frontend/src/app/GameShell.tsx:664`

Current behavior:
1. Core/game/render paths use `boardSize` (single dimension).
2. Loader maps only `width -> boardSize`.
3. Bootstrap creates cube as `createTimeCube(boardSize, boardSize, ...)`.
4. Solver rejects non-square maps.

Impact:
1. Rectangular maps can validate at content level but fail at runtime/solver.
2. Blocks richer level design space and future generator targets.

Recommendation:
1. Introduce `BoardDimensions { width, height }` in interaction/game state and loader.
2. Replace `isInBounds(position, boardSize)` with `isInBounds(position, width, height)` (or dimensions object).
3. Migrate board render + iso render + preview logic to width/height.
4. Remove solver square-map guard.

Execution order: 1 (code)

### C2 (Medium): `GameShell` is oversized and mixes multiple responsibilities

Evidence:
1. `frontend/src/app/GameShell.tsx` (~794 lines)
2. Keyboard dispatch block concentrated at `frontend/src/app/GameShell.tsx:323`
3. Overlay/hud rendering in same file at `frontend/src/app/GameShell.tsx:510`

Current behavior:
1. Single file owns input, async loading, theming side-effects, and all panel/overlay JSX.

Impact:
1. Slower iteration for UX/design changes.
2. Higher regression risk in keyboard/input layer.

Recommendation:
1. Extract hooks:
- `useKeyboardControls`
- `useContentPackLoader`
- `useUiSettings`
2. Extract components:
- `HudPanels`
- `StateOverlay`
- `LogOverlay`
- `SettingsOverlay`

Execution order: 2 (code)

### C3 (Medium): `IsoTimeCubePanel` is oversized and strongly hardcoded

Evidence:
1. `frontend/src/render/iso/IsoTimeCubePanel.tsx` (~573 lines)
2. Hardcoded geometry/camera constants at `frontend/src/render/iso/IsoTimeCubePanel.tsx:17`
3. Object render focus gating at `frontend/src/render/iso/IsoTimeCubePanel.tsx:453`

Current behavior:
1. Rendering policy + camera controls + geometry constants are tightly coupled in one component.

Impact:
1. Hard to iterate Moebius style and readability tuning quickly.

Recommendation:
1. Split into:
- `iso/constants.ts`
- `iso/IsoCameraControls.tsx`
- `iso/IsoSlices.tsx`
- `iso/IsoTracks.tsx`
- `iso/IsoActors.tsx`
2. Promote visual constants to configurable theme block.

Execution order: 3 (code)

### C4 (Medium): Content->core conversion logic is duplicated (loader and solver)

Evidence:
1. `frontend/src/data/loader.ts:20`
2. `frontend/src/data/generation/solver.ts:25`
3. `frontend/src/data/loader.ts:51`
4. `frontend/src/data/generation/solver.ts:41`

Current behavior:
1. Two separate implementations of `toCoreComponent` and `toLevelObjectsConfig`.

Impact:
1. Divergence risk when component/policy contracts evolve.

Recommendation:
1. Extract shared adapter module:
- `frontend/src/data/contentAdapter.ts`
2. Reuse in both loader and generation solver.

Execution order: 4 (code)

### C5 (Medium): Generation tuning is still partially hardcoded in code

Evidence:
1. Solver gate options hardcoded in orchestrator:
- `frontend/src/data/generation/index.ts:79`
2. Quality weights hardcoded:
- `frontend/src/data/generation/quality.ts:19`
3. Topology/patrol strategy hardcoded:
- `frontend/src/data/generation/generator.ts:193`
- `frontend/src/data/generation/generator.ts:214`
- `frontend/src/data/generation/generator.ts:320`

Current behavior:
1. Profile data drives some defaults, but major generation behavior is code-fixed.

Impact:
1. Limits data-driven level design tuning.
2. Requires code edits for balance iteration.

Recommendation:
1. Extend generation profile contract with:
- solver gate presets,
- quality weight block,
- topology strategy selectors.
2. Keep current defaults but source them from profile.

Execution order: 5 (code)

### C6 (Medium): Runtime fallback map is hardcoded and can mask content issues

Evidence:
1. `frontend/src/game/levelObjects.ts:7`
2. `frontend/src/game/gameSlice.ts:86`

Current behavior:
1. If content bootstrap fails, game can run against embedded fallback objects.

Impact:
1. Can hide pack/loader issues during content iteration.

Recommendation:
1. Keep fallback only for explicit dev mode, otherwise fail fast with clear UI error.
2. Make fallback selection explicit via config flag.

Execution order: 6 (code)

### C7 (Low): Input state machine contains unused queued-input pathway

Evidence:
1. `frontend/src/app/inputStateMachine.ts:15`
2. `frontend/src/app/inputStateMachine.ts:101`
3. `frontend/src/app/inputStateMachine.ts:123`

Current behavior:
1. `queuedDirectional` exists but is never set by `pushDirectionalInput`.
2. `flushDirectionalInput` currently has no practical effect.

Impact:
1. Adds conceptual noise in input behavior.

Recommendation:
1. Either remove queue fields/functions, or implement real buffering behavior.

Execution order: 7 (code)

### C8 (Low): Board rendering has fixed pixel canvas size

Evidence:
1. `frontend/src/render/board/GameBoardCanvas.tsx:28`

Current behavior:
1. `CANVAS_SIZE = 560` is fixed.

Impact:
1. Limits flexibility for responsive layouts and future icon scaling.

Recommendation:
1. Move canvas size policy to layout/theme config or container-measured sizing.

Execution order: 8 (code)

### C9 (Low): UI header still references old phase label

Evidence:
1. `frontend/src/app/GameShell.tsx:514`

Current behavior:
1. Header says `Phase 9: HUD + Isometric + Icon System` although project is past Phase 12.

Impact:
1. Minor confusion during review/testing.

Recommendation:
1. Replace with neutral label (for example current pack name + build channel).

Execution order: 9 (code)

---

## Big Files to Split (Priority List)

1. `frontend/src/app/GameShell.tsx` (~794)
2. `frontend/src/data/validate.ts` (~618)
3. `frontend/src/render/iso/IsoTimeCubePanel.tsx` (~573)
4. `frontend/src/data/generation/generator.ts` (~494)
5. `frontend/src/App.css` (~492)
6. `frontend/src/data/generation/solver.ts` (~390)
7. `frontend/src/data/loader.ts` (~384)
8. `frontend/src/core/timeCube.ts` (~378)
9. `frontend/src/data/generation/profile.ts` (~370)
10. `frontend/src/game/gameSlice.ts` (~316)

---

## Design-Focus Development Path (Icons + Level Design)

Use this sequence so design can move quickly while refactor risk stays controlled:
1. Fix rectangular-board model (C1) first.
2. Write authoring docs (`LEVEL_AUTHORING_WORKFLOW`, `ICON_PACK_AUTHORING`) after D1/D2 cleanup.
3. Extract `contentAdapter` shared module (C4) to stabilize contracts.
4. Then focus on pure design iteration:
- icon packs in `frontend/public/data/icons/`,
- hand-authored packs in `frontend/public/data/*.json`,
- generated variants via `npm run gen:pack`.

---

## Execution Checklist

- [x] Run full docs audit and record findings
- [x] Run full code audit and record findings
- [x] Identify hardcoded-to-config migration candidates
- [x] Identify top oversized files and module split plan
- [x] Confirm lint/test/build baseline before handoff
