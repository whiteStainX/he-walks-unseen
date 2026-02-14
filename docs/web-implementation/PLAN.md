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
- [x] Deterministic 10-slice window selector around current `t`
- [x] Derived isometric view model from `WorldLineState` + `TimeCube`
- [x] `three` + `@react-three/fiber` panel with orthographic isometric projection
- [x] Monochrome style alignment (white background, black lines, flat grayscale fills)
- [x] Responsive layout integration beside main board

### Exit Criteria
- [x] Isometric panel renders without scrolling on desktop
- [x] Windowing rules match design spec
- [x] Current `t` slice is clearly identifiable
- [x] Panel is read-only and does not mutate gameplay state
- [x] Existing move/rift/object behavior remains unchanged

---

## Phase 4: Add Interactions

**Goal:** Add interactions: push/pull, rifts, and action validation pipeline.
**Implementation Detail:** `docs/web-implementation/PHASE_04_INTERACTIONS.md`

### Deliverables
- [x] Action pipeline (handler execution + post-check orchestration)
- [x] Push/Pull interactions
- [x] Rift interactions fully wired
- [x] Interaction handler registry (modular per-action handlers)
- [x] Action history tracking
- [x] Sidebar displays time/turn/status/errors

### Exit Criteria
- [x] Player can move on-screen
- [x] Walls block movement
- [x] Sidebar updates on each action
- [x] New interaction can be added via handler+registry without reducer rewrite

---

## Phase 5: Detection + Past-Turn Selves

**Goal:** Implement detection model (V1) and `Detected` phase transition.
**Implementation Detail:** `docs/web-implementation/PHASE_05_DETECTION.md`

### Deliverables
- [x] Discrete-delay detection model (V1)
- [x] Detection config + detection report contracts
- [x] GamePhase updates to `Detected`
- [x] Light cone/danger preview overlay (optional)

### Exit Criteria
- [x] Detection triggers loss state (`Detected`)
- [x] Post-detected actions are blocked until restart
- [x] Existing win/restart behavior remains stable

---

## Phase 6: Data Loading

**Goal:** Load levels/themes from JSON assets.
**Design Detail:** `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`
**Implementation Detail:** `docs/web-implementation/PHASE_06_DATA_LOADING.md`

### Deliverables
- [x] Canonical content schemas (level, behavior, theme, rules)
- [x] Parser + validator with structured errors
- [x] JSON level format parser (baseline fixture-backed)
- [x] JSON theme loader (baseline fixture-backed)
- [x] Bundle default levels in `public/data/`

### Exit Criteria
- [x] Can switch levels without rebuild
- [x] Theme applies to canvas and UI
- [x] Enemy behavior parameters load from content files

---

## Phase 7: Paradox Detection

**Goal:** Implement committed-history paradox validation (grandfather class).
**Design Detail:** `docs/web-design/MATH_MODEL.md`, `docs/web-design/GAME_STATE.md`, `docs/web-design/CORE_DATA.md`
**Implementation Detail:** `docs/web-implementation/PHASE_07_PARADOX.md`

### Deliverables
- [x] Core paradox contracts (`ParadoxConfig`, `CausalAnchor`, `ParadoxReport`)
- [x] Anchor capture from successful interaction outcomes
- [x] Paradox evaluator with affected-time windowing
- [x] Reducer pipeline order update: `Paradox -> Won -> Detected`
- [x] `GamePhase` update to include `Paradox` + UI status/log surface
- [x] Unit tests for paradox edge cases and ordering

### Exit Criteria
- [x] Any action that violates committed anchors transitions the game to `Paradox`
- [x] `Paradox` blocks further actions until restart
- [x] If an action could both win and paradox, paradox takes priority
- [x] Existing detection and win behavior remains stable when no paradox exists

---

## Phase 8: Polish

**Goal:** Improve UX and performance.
**Implementation Detail:** `docs/web-implementation/PHASE_08_POLISH.md`

### Deliverables
- [ ] Input buffering + intent preview
- [ ] Render/runtime smoothing and chunking improvements
- [ ] Accessibility baseline improvements
- [ ] Settings panel (optional, non-destructive toggles)

### Exit Criteria
- Stable rendering and no major UI jank on typical hardware
- Deterministic gameplay behavior preserved
- Keyboard-only control path remains fully playable

---

## Future Phases (Optional)

- Full light cone model (distance-based)
- Alert/chase variants
- Level editor
- Shareable levels
- Mobile/touch support
