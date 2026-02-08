# Phase 1: Minimal Board + Movement (Web)

> **Depends on:** Web foundation (Vite + React + TypeScript)
> **Enables:** Phase 2 (Time axis + rift travel)
> **Design Reference:** `docs/web-design/OVERALL.md`, `docs/web-design/MATH_MODEL.md`

---

## Overview

Phase 1 establishes a playable 2D baseline:
- Single square board rendered on canvas
- One player entity that moves in 2D
- Turn counter increments per move
- No time axis in gameplay yet

This phase intentionally excludes cube-time mechanics so the input/render/state loop is stable before temporal complexity is added.

Note: this file documents the Phase 1 baseline snapshot. Current runtime code has advanced into Phase 2 (`WorldLineState` + rift flow).

---

## Scope

### In Scope
- React app shell with single-screen layout
- Redux Toolkit store and typed hooks
- Keyboard movement (`WASD` + arrow keys)
- Boundary blocking
- Restart action
- Sidebar + bottom bar status UI
- Minimal monochrome visual style (white background, black lines/fills)

### Out of Scope
- Time travel and rifts
- Multi-slice cube state
- World line and paradox checks
- Enemies, objects, interactions
- Detection logic

---

## Implemented Modules

### Core
- `frontend/src/core/position.ts`
  - `Position2D`
  - `Direction2D`
  - `movePosition()`
  - `isInBounds()`

### Game State
- `frontend/src/game/gameSlice.ts`
  - `GameState`: `boardSize`, `player`, `turn`, `status`
  - Actions: `movePlayer`, `restart`, `setStatus`
- `frontend/src/game/store.ts`
  - Root Redux store
- `frontend/src/game/hooks.ts`
  - Typed selectors and dispatch

### Rendering + App Shell
- `frontend/src/render/GameBoardCanvas.tsx`
  - Canvas-based board render
  - Player square render
  - Grid lines intentionally removed
- `frontend/src/app/GameShell.tsx`
  - Keyboard input handling
  - Layout wiring (board, sidebar, footer)
- `frontend/src/App.tsx`, `frontend/src/main.tsx`
  - App mount and Redux provider

### Styling
- `frontend/src/index.css`
  - Global tokens and monochrome palette
  - No page scrolling (`overflow: hidden`)
- `frontend/src/App.css`
  - Single-screen app layout
  - No drop shadows
- `frontend/src/render/theme.ts`
  - Centralized theme object
  - CSS variable application + canvas colors

---

## Controls

- `W/A/S/D` or arrow keys: move player
- `R`: restart player position and turn
- `Q` / `Esc`: status message only (no app quit behavior in browser)

---

## Data and Invariants (Phase 1)

1. `turn` is monotonic increasing for successful moves.
2. Player position always stays in board bounds.
3. One player instance exists in state.
4. Rendering reads state only; gameplay updates occur via Redux actions.

---

## Validation Checklist

- `npm run dev` shows:
  - Board panel
  - Sidebar with player state
  - Bottom bar control hints
- Movement updates player coordinates and turn count
- Boundary movement does not change position and updates status
- `npm run lint` passes

---

## Known Gaps Before Phase 2

1. No tests yet for movement reducer behavior.
2. Theme object exists, but no theme switching mechanism yet.

---

## Phase 2 Entry Criteria

Before adding time travel:
1. Keep Phase 1 controls and layout stable.
2. Introduce `Position` with cube-time (`t`) alongside turn (`n`) semantics.
3. Add world-line prefix model (`P_n`) and realized slice semantics (`S_n(t)`) per `MATH_MODEL.md`.
