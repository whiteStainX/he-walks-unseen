# Web Implementation Plan: He Walks Unseen

> **Design Reference:** `docs/web-design/OVERALL.md`
> **Math Reference:** `docs/web-design/MATH_MODEL.md`
> **Agent Guide:** `docs/web-design/AGENTS.md`

---

## Overview

This plan adapts the original Rust/TUI phases to a **Vite + React + TypeScript** web app. Each phase delivers a playable increment, keeps core logic UI-agnostic, and prioritizes deterministic gameplay.

---

## Phase 1: Web Foundation

**Goal:** Create the React + Vite shell and a minimal canvas render loop.

### Deliverables
- [ ] Vite + React + TypeScript app boots
- [ ] Canvas renders a blank grid area
- [ ] Basic layout: canvas + sidebar + bottom bar
- [ ] Input loop wired (keyboard events only)

### Exit Criteria
- `npm run dev` renders a layout
- Pressing `Q` logs or flags quit in state
- No TypeScript errors

---

## Phase 2: Core Data Structures (TS)

**Goal:** Port the Space-Time Cube model into pure TypeScript (no React imports).

### Deliverables
- [ ] `Position`, `SpatialPos`, `WorldLine`
- [ ] `Entity`, `Component` (discriminated unions)
- [ ] `TimeSlice`, `TimeCube`
- [ ] Unit tests for self-intersection, bounds, indexing

### Exit Criteria
- Core tests pass with `vitest`
- Can create a cube and query entities by `(x,y,t)`

---

## Phase 3: Game State & Actions

**Goal:** Implement action pipeline (validate → apply → propagate).

### Deliverables
- [ ] `GameState`, `Action`, `ActionResult`
- [ ] Validation for move/wait/rift/push/pull
- [ ] Propagation engine (basic)
- [ ] Action history tracking

### Exit Criteria
- Movement updates cube and world line
- Invalid moves return typed errors
- Deterministic outcomes

---

## Phase 4: Web Rendering

**Goal:** Render the current time slice in canvas with basic styling.

### Deliverables
- [ ] Canvas grid renderer
- [ ] Entity glyphs/colors (basic theme)
- [ ] Sidebar displays time/turn/status
- [ ] Keyboard controls map to actions

### Exit Criteria
- Player can move on-screen
- Walls block movement
- Sidebar updates on each action

---

## Phase 5: Detection + Past-Turn Selves

**Goal:** Implement detection model and world line visualization.

### Deliverables
- [ ] Discrete-delay detection model
- [ ] Light cone preview overlay (optional)
- [ ] Past-turn self rendering (dim)
- [ ] GamePhase updates to `Detected`

### Exit Criteria
- Detection triggers loss state
- Past-turn selves visible when rifting

---

## Phase 6: Data Loading

**Goal:** Load levels/themes from JSON assets.

### Deliverables
- [ ] JSON level format parser
- [ ] JSON theme loader
- [ ] Bundle default levels in `public/data/`

### Exit Criteria
- Can switch levels without rebuild
- Theme applies to canvas and UI

---

## Phase 7: Paradox Detection

**Goal:** Implement grandfather paradox validation.

### Deliverables
- [ ] Propagation consistency checks
- [ ] Paradox errors surface to UI
- [ ] Unit tests for paradox edge cases

### Exit Criteria
- Invalid paradox moves rejected
- GamePhase updates to `Paradox`

---

## Phase 8: Polish

**Goal:** Improve UX and performance.

### Deliverables
- [ ] Input buffering and preview
- [ ] Smooth rendering loop
- [ ] Accessibility improvements
- [ ] Settings panel (optional)

### Exit Criteria
- Stable 60 FPS on typical hardware
- No major UI jank

---

## Future Phases (Optional)

- Full light cone model (distance-based)
- Alert/chase variants
- Level editor
- Shareable levels
- Mobile/touch support
