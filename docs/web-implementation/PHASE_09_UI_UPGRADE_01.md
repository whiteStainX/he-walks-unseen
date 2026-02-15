# Phase 9: UI Upgrade 01 (HUD + Moebius Iso + Icon Packs)

> **Depends on:** `docs/web-implementation/PHASE_08_POLISH.md`
> **Primary Design Reference:** `docs/web-design/UI_WINDOW_SYSTEM.md`
> **Supporting References:** `docs/web-design/RENDERING.md`, `docs/web-design/PHASE_03_5_ISOMETRIC_TIMECUBE.md`

---

## Goal

Deliver the first major UI upgrade as one coherent pass across three linked parts:

1. Minimal-at-glance HUD windows with on-demand deeper views.
2. Clear Moebius-style 3D helper rendering for time-slice reasoning.
3. Configurable board icon loading system (SVG-first, PNG fallback).

This phase is a UI/data presentation upgrade. Core game logic and truth models do not change.

---

## Status

- `Status`: Planned

---

## Locked Scope

In scope:
- `COMMAND`, `STATE`, `LOG` progressive disclosure behavior.
- Isometric readability and style refinement.
- Icon pack contracts, loading, and board render integration.

Out of scope:
- New mechanics, enemy behavior logic changes, or backend work.
- Story/narrative systems.
- User-upload UI for custom icon packs (infrastructure only in this phase).

---

## Locked Decisions

1. Main map and iso panel remain visual priority over all HUD windows.
2. Default HUD surface is compact; deeper information is overlay/menu driven.
3. Isometric panel follows contour-first Moebius direction with explicit occlusion.
4. Board entity rendering is icon/symbol based, not ASCII glyph based.
5. Icon packs resolve by semantic slots and degrade gracefully when assets fail.

---

## Deliverables

### Part A: Minimal + Zoom-In HUD

1. Compact Level-0 `COMMAND`, `STATE`, `LOG` aligned with `UI_WINDOW_SYSTEM.md`.
2. `F` action menu remains primary command expansion path.
3. State detail overlay implemented (or finalized) as on-demand view.
4. Diagnostics remain hidden from default player HUD.

### Part B: Moebius-Style Isometric Panel

1. Slice slab rendering and contour-first linework refinement.
2. Reduced visual clutter from dense wireframe artifacts.
3. Improved object/player differentiation in iso view.
4. Preserved keyboard-first, single-screen layout behavior.

### Part C: Icon Loading System

1. Icon-pack data contracts and validation in data layer.
2. Default monochrome icon pack under `public/data/`.
3. Theme-driven active icon pack selection.
4. Cached/rasterized board icon rendering path with deterministic fallback.

---

## Workstreams

### 9A. HUD Progressive Disclosure

Implementation tasks:
1. Audit `GameShell` default window content against Level-0 contract.
2. Implement/finish state-detail overlay (`Tab` or finalized key).
3. Ensure `Esc` and layer ownership rules are deterministic in input state machine.
4. Remove any remaining always-on debug/internal metrics from compact windows.

Primary file targets:
- `frontend/src/app/GameShell.tsx`
- `frontend/src/app/inputStateMachine.ts`
- `frontend/src/App.css`

Exit criteria:
- at-a-glance HUD is readable in 2-3 seconds
- deeper info is reachable without crowding gameplay surface

### 9B. Isometric Moebius Refinement

Implementation tasks:
1. Refine edge-only contour rendering and slab opacity tokens.
2. Increase separation cues for player vs objects vs historical traces.
3. Ensure full slice window visibility (no accidental cropping).
4. Keep performance stable and avoid style regressions on resize.

Primary file targets:
- `frontend/src/render/iso/IsoTimeCubePanel.tsx`
- `frontend/src/render/iso/*`
- `frontend/src/render/theme.ts`

Exit criteria:
- iso panel is readable without requiring mental reconstruction of slice bounds
- visual language matches Moebius direction from design docs

### 9C. Icon Pack Contracts + Loading + Render

Implementation tasks:
1. Add/extend contracts:
- `ThemeConfig.iconPackId`
- archetype render `symbol?: string` (deprecate `glyph`)
- `IconPackConfig` with semantic `slots`
2. Add parser/validator + typed loader support for icon packs.
3. Ship default icon manifest + SVG assets.
4. Integrate board icon resolver/cache and fallback primitive draw path.
5. Update default content to semantic symbols.

Primary file targets:
- `frontend/src/data/contracts.ts`
- `frontend/src/data/parse.ts`
- `frontend/src/data/validate.ts`
- `frontend/src/data/loader.ts`
- `frontend/src/data/content/default.level.json`
- `frontend/src/data/content/default.theme.json`
- `frontend/public/data/icons/default.pack.json`
- `frontend/public/data/icons/*.svg`
- `frontend/src/render/board/GameBoardCanvas.tsx`
- `frontend/src/render/board/iconPack.ts` (new)
- `frontend/src/render/board/iconCache.ts` (new)

Exit criteria:
- no object rendering depends on `fillText` glyph drawing
- missing icon asset does not crash gameplay

### 9D. QA + Docs Alignment

Implementation tasks:
1. Add/update tests for HUD layering, iso rendering rules, and icon loading/fallback.
2. Run quality gates (`lint`, `test`, `build`).
3. Produce review checklist doc for this phase.
4. Align implementation notes with `UI_WINDOW_SYSTEM.md` wording.

Primary file targets:
- `frontend/src/data/*.test.ts`
- `frontend/src/render/board/*.test.ts`
- `frontend/src/app/*.test.ts`
- `docs/review/PHASE_09_UI_UPGRADE_01_REVIEW.md` (new)

---

## Execution Sequence

1. Finalize HUD contract implementation (Part A).
2. Finalize iso style/render pass (Part B).
3. Implement icon contract + loader + renderer (Part C).
4. Run QA and publish review notes (Part D).

This order keeps player-facing UX stable first, then upgrades board symbol system.

---

## Test Plan

1. HUD/input tests:
- layer transitions and key ownership
- overlay open/close determinism

2. Iso tests:
- window visibility and no-crop behavior
- player/object differentiation markers

3. Icon/data tests:
- valid icon pack parse
- invalid manifest errors
- missing slot/asset fallback behavior

4. Regression tests:
- no changes to phase ordering (`Paradox -> Won -> Detected`)
- no core movement/interaction behavior drift

5. Quality gates:
- `npm run lint`
- `npm run test`
- `npm run build`

---

## Acceptance Criteria

1. Compact HUD shows only decision-critical info by default.
2. Player can zoom into command/state/log details on demand, keyboard-first.
3. Isometric panel follows Moebius-inspired line/occlusion style and is materially more readable.
4. Board entities render through semantic icon slots with a default externalized icon pack.
5. Asset load failures degrade gracefully with deterministic fallback rendering.
