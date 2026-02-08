# Web Implementation Plan: He Walks Unseen

> **Design Reference:** `docs/web-design/OVERALL.md`
> **Math Reference:** `docs/web-design/MATH_MODEL.md`
> **Agent Guide:** `AGENTS.md`

---

## Overview

This plan uses an **iterative progression**: start minimal, then add time travel, then objects, then an isometric TimeCube aid, then interactions. Each phase delivers a playable increment, keeps core logic UI-agnostic, and prioritizes deterministic gameplay.

---

## Phase 1: Minimal Board + Movement

**Goal:** Create the React + Vite shell and a minimal board with player movement. No time travel yet.
**Implementation Detail:** `docs/web-implementation/PHASE_01_MINIMAL_BOARD.md`

### Deliverables
- [x] Vite + React + TypeScript app boots
- [x] Canvas renders a square board
- [x] Basic layout: canvas + sidebar + bottom bar
- [x] Player renders on board
- [x] Player moves in 2D (no time axis)
- [x] Input loop wired (keyboard events only)
- [x] Redux Toolkit store scaffolded

### Exit Criteria
- [x] `npm run dev` renders a layout
- [x] Pressing `Q` logs or flags quit in state
- [x] No TypeScript errors

---

## Phase 2: Add Time Travel

**Goal:** Introduce the time axis and rift-based time travel.
**Implementation Detail:** `docs/web-implementation/PHASE_02_TIME_TRAVEL.md`

### Deliverables
- [x] `Position`, `SpatialPos`, `WorldLine` with non-monotonic `t`
- [x] `TimeSlice`, `TimeCube`
- [x] Rift moves enabled (`ApplyRift` + `ConfigureRiftSettings`)
- [x] Self-intersection prevention in time
- [x] Unit tests for world line and time travel

### Exit Criteria
- [x] Player can move in space with automatic `t + 1` progression
- [x] Player can rift to valid past/future `(x, y, t)` according to Phase 2 constraints
- [x] Self-intersection at `(x, y, t)` is always blocked
- [x] Sidebar reflects `n` and `t` separately
- [x] Lint passes and Phase 2 tests pass

---

## Phase 3: Add Objects

**Goal:** Add objects (walls, exits, boxes, enemies without detection yet).
**Implementation Detail:** `docs/web-implementation/PHASE_03_OBJECTS.md`

### Deliverables
- [x] Reusable entity/component system (walls, exits, boxes, enemies)
- [x] Configurable object registry and placements
- [x] Blocking rules and occupancy queries
- [x] Time-persistent object propagation baseline
- [x] Basic win condition (exit)

### Exit Criteria
- [x] Movement respects object occupancy constraints
- [x] Entering exit tile sets `Won` phase
- [x] Object rendering is data-driven from archetypes
- [x] Invalid moves return typed errors
- [x] Deterministic outcomes

---

## Phase 3.5: Add Isometric TimeCube View

**Goal:** Add a read-only isometric panel that visualizes a local temporal window (max 10 slices) beside the main board.
**Implementation Detail:** `docs/web-implementation/PHASE_03_5_ISOMETRIC_TIMECUBE.md`

### Deliverables
- [ ] Deterministic 10-slice window selector around current `t`
- [ ] Derived isometric view model from `WorldLineState` + `TimeCube`
- [ ] `three` + `@react-three/fiber` panel with orthographic isometric projection
- [ ] Monochrome style alignment (white background, black lines, flat grayscale fills)
- [ ] Responsive layout integration beside main board

### Exit Criteria
- [ ] Isometric panel renders without scrolling on desktop
- [ ] Windowing rules match design spec
- [ ] Current `t` slice is clearly identifiable
- [ ] Panel is read-only and does not mutate gameplay state
- [ ] Existing move/rift/object behavior remains unchanged

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
