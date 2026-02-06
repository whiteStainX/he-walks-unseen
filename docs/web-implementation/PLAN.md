# Web Implementation Plan: He Walks Unseen

> **Design Reference:** `docs/web-design/OVERALL.md`
> **Math Reference:** `docs/web-design/MATH_MODEL.md`
> **Agent Guide:** `docs/web-design/AGENTS.md`

---

## Overview

This plan uses an **iterative progression**: start minimal, then add time travel, then objects, then interactions. Each phase delivers a playable increment, keeps core logic UI-agnostic, and prioritizes deterministic gameplay.

---

## Phase 1: Minimal Board + Movement

**Goal:** Create the React + Vite shell and a minimal board with player movement. No time travel yet.
**Implementation Detail:** `docs/web-implementation/PHASE_01_MINIMAL_BOARD.md`

### Deliverables
- [ ] Vite + React + TypeScript app boots
- [ ] Canvas renders a square grid
- [ ] Basic layout: canvas + sidebar + bottom bar
- [ ] Player renders on grid
- [ ] Player moves in 2D (no time axis)
- [ ] Input loop wired (keyboard events only)
- [ ] Redux Toolkit store scaffolded

### Exit Criteria
- `npm run dev` renders a layout
- Pressing `Q` logs or flags quit in state
- No TypeScript errors

---

## Phase 2: Add Time Travel

**Goal:** Introduce the time axis and rift-based time travel.

### Deliverables
- [ ] `Position`, `SpatialPos`, `WorldLine` with non-monotonic `t`
- [ ] `TimeSlice`, `TimeCube`
- [ ] Rift moves enabled
- [ ] Self-intersection prevention in time
- [ ] Unit tests for world line and time travel

### Exit Criteria
- Core tests pass with `vitest`
- Can create a cube and query entities by `(x,y,t)`

---

## Phase 3: Add Objects

**Goal:** Add objects (walls, exits, boxes, enemies without detection yet).

### Deliverables
- [ ] Entity/component system (walls, exits, boxes, enemies)
- [ ] Blocking rules and basic collisions
- [ ] Propagation engine for time-persistent objects
- [ ] Basic win condition (exit)

### Exit Criteria
- Movement updates cube and world line
- Invalid moves return typed errors
- Deterministic outcomes

---

## Phase 4: Add Interactions

**Goal:** Add interactions: push/pull, rifts, and action validation pipeline.

### Deliverables
- [ ] Action pipeline (validate → apply → propagate → check)
- [ ] Push/Pull interactions
- [ ] Rift interactions fully wired
- [ ] Action history tracking
- [ ] Sidebar displays time/turn/status/errors

### Exit Criteria
- Player can move on-screen
- Walls block movement
- Sidebar updates on each action

---

## Phase 5: Detection + Past-Turn Selves

**Goal:** Implement detection model and world line visualization.

### Deliverables
- [ ] Discrete-delay detection model (V1)
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
