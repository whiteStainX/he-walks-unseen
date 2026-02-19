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
- [x] Layer-aware input gating + intent preview
- [x] Render/runtime smoothing and chunking improvements
- [x] Accessibility baseline improvements
- [x] Settings panel (optional, non-destructive toggles)

### Exit Criteria
- Stable rendering and no major UI jank on typical hardware
- Deterministic gameplay behavior preserved
- Keyboard-only control path remains fully playable

---

## Phase 9: UI Upgrade 01 (HUD + Moebius Iso + Icon Packs)

**Goal:** Deliver the first major UI upgrade across HUD progressive disclosure, isometric readability style, and configurable board icon loading.
**Implementation Detail:** `docs/web-implementation/PHASE_09_UI_UPGRADE_01.md`
**Design Anchor:** `docs/web-design/UI_WINDOW_SYSTEM.md`

### Deliverables
- [x] Minimal-at-glance `COMMAND`/`STATE`/`LOG` with on-demand detail overlays
- [x] Moebius-style isometric readability pass (contour-first, slab + occlusion clarity)
- [x] Semantic icon-pack loading system (`SVG` first, `PNG` fallback) integrated with board render
- [x] Theme-driven active icon pack selection and graceful fallback behavior
- [x] Tests and docs alignment for all three parts

### Exit Criteria
- [x] Player-facing HUD stays compact by default and keyboard-first for detail views
- [x] Isometric helper is clearer and consistent with design direction
- [x] Board entities no longer depend on glyph text rendering
- [x] Missing icon assets never block gameplay
- [x] `npm run lint`, `npm run test`, and `npm run build` all pass

---

## Phase 10: Enemy Logic Data-Driven Extension

**Goal:** Make enemy movement/detection tuning content-driven with deterministic precedence and validation.
**Implementation Detail:** `docs/web-implementation/PHASE_10_ENEMY_LOGIC_DATA_DRIVEN.md`
**Design Detail:** `docs/web-design/ENEMY_LOGIC_V1.md`

### Deliverables
- [x] `BehaviorConfig` detection profile extension (`detectionProfiles`, `detectionAssignments`, `defaultDetectionProfile`)
- [x] Loader/runtime wiring for per-enemy detection overrides
- [x] Validation for invalid profile shapes and unknown references
- [x] Detection evaluator support for per-enemy config overrides with fallback
- [x] Public content example updated (`variant.behavior.json`)

### Exit Criteria
- [x] Enemy logic tuning can be done via data files without reducer branching
- [x] Invalid config fails fast at load time with structured errors
- [x] Existing packs still load without mandatory migration
- [x] `npm run lint`, `npm run test`, and `npm run build` pass

---

## Phase 11: Enemy Motion Execution (V1)

**Goal:** Execute behavior policies into TimeCube occupancy so enemies actually move across slices.
**Implementation Detail:** `docs/web-implementation/PHASE_11_ENEMY_MOTION_EXECUTION.md`
**Design Detail:** `docs/web-design/ENEMY_MOTION_EXECUTION_V1.md`

### Deliverables
- [x] Deterministic enemy motion projector by absolute time `t`
- [x] Bootstrap/load/restart integration for projected enemy occupancy
- [x] Detection integration verified against moved enemy positions
- [x] Tests for loop/ping-pong trajectory execution and reproducibility

### Exit Criteria
- [x] Enemy position is slice-dependent and policy-driven
- [x] Existing paradox/win/detection ordering is unchanged
- [x] Existing content packs remain compatible
- [x] `npm run lint`, `npm run test`, and `npm run build` pass

---

## Phase 12: Map Generation (V1)

**Goal:** Generate schema-valid, solvable maps with deterministic seeded output.
**Implementation Detail:** `docs/web-implementation/PHASE_12_MAP_GENERATION.md`
**Design Detail:** `docs/web-design/MAP_GENERATION_V1.md`
**Roadmap:** `docs/web-implementation/PHASE_12_LEVEL_GENERATION_ROADMAP.md`

### Deliverables
- [x] Generator request/result contracts and seeded RNG foundation
- [x] Candidate constructor (layout + objects + enemies + rifts)
- [x] Deterministic solvability validator
- [x] Quality scoring + bounded retry loop
- [x] Fixture output + loader-path compatibility checks
- [x] Export CLI flow writes generated packs to `frontend/public/data/` and registers them in manifest

### Exit Criteria
- [x] Accepted generated packs are schema-valid and solvable
- [x] Same seed + params produce identical output
- [x] No gameplay reducer special-casing for generated content
- [x] Generated packs are loadable through standard manifest (`frontend/public/data/index.json`) without code edits
- [x] `npm run lint`, `npm run test`, and `npm run build` pass

---

## Future Phases (Optional)

- Full light cone model (distance-based)
- Alert/chase variants
- Level editor
- Shareable levels
- Mobile/touch support

---

## Phase 13: Full Level System

**Goal:** Build full level-system infrastructure (curated + generated + hybrid lifecycle, pack metadata, validation tooling).
**Implementation Detail:** `docs/web-implementation/PHASE_13_FULL_LEVEL_SYSTEM.md`
**Design Detail:** `docs/web-design/LEVEL_SYSTEM_FULL.md`

### Deliverables
- [x] Manifest metadata extension with backward compatibility
- [x] Pack validation CLI for single/all packs
- [x] Pack-class quality policy (`curated/generated/hybrid/experimental`)
- [x] Generation export metadata support for hybrid workflow
- [x] Minimal runtime UI surfacing of pack class/difficulty

### Exit Criteria
- [ ] Existing packs load unchanged
- [x] Extended manifest entries parse/validate correctly
- [x] `npm run validate:pack -- --all` gates manifest packs deterministically
- [x] Generated/hybrid packs enforce configured solver/quality policy
- [x] `npm run lint`, `npm run test`, and `npm run build` pass

---

## Phase 14: Progression and Level Program

**Goal:** Build player-facing progression and level-selection flow on top of Phase 13 pack infrastructure.
**Implementation Detail:** `docs/web-implementation/PHASE_14_PROGRESSION_AND_LEVEL_PROGRAM.md`
**Design Detail:** `docs/web-design/LEVEL_SYSTEM_FULL.md`

### Deliverables
- [x] Progression manifest contract and parser
- [x] Runtime progression state with local persistence
- [x] Minimal progression/level selection overlay (keyboard-first)
- [x] Completion-driven unlock flow
- [x] Curated level-program baseline (ordered sequence)

### Exit Criteria
- [x] Player can browse/select levels from progression UI
- [x] Unlock/completion state persists across reloads
- [x] Existing gameplay determinism remains unchanged
- [x] `npm run lint`, `npm run test`, `npm run build`, and `npm run validate:pack -- --all` pass

---

## Phase 15: Conflict + Paradox Hardening

**Goal:** Harden conflict/paradox correctness and migrate detection to LOS-based model with explicit vision occlusion.
**Implementation Detail:** `docs/web-implementation/PHASE_15_CONFLICT_PARADOX_HARDENING.md`
**Design Detail:** `docs/web-design/PHASE_15_CONFLICT_PARADOX_HARDENING.md`

### Deliverables
- [ ] Anchor dedup/index hardening with strict no-prune lifecycle
- [ ] LOS detection utility with diagonal support and robust tests
- [ ] Detection migration to LOS-only runtime path
- [ ] `BlocksVision`-based occlusion semantics aligned in data and docs
- [ ] Full regression/quality gate pass

### Exit Criteria
- [ ] Paradox outcomes remain correct under long-run play (no prune regressions)
- [ ] Detection behavior is LOS-based and deterministic
- [ ] Phase ordering remains `Paradox -> Won -> Detected`
- [ ] `npm run lint`, `npm run test`, `npm run build`, `npx tsc --noEmit`, and `npm run validate:pack -- --all` pass
