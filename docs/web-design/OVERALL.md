# Web Design Document: He Walks Unseen

## 1. Executive Summary

**"He Walks Unseen"** is a turn-based puzzle stealth game where **time is a spatial dimension**. The web rewrite preserves the core Space-Time Cube mechanics while delivering them via a modern web stack: **Vite + React + TypeScript**.

**Primary goal:** Provide a deterministic, data-driven puzzle experience in the browser with clear visual feedback for time-travel mechanics and causal detection.

---

## 2. Core Concept & Mechanics (Unchanged)

### 2.1 The Space-Time Cube
- **X/Y** = spatial plane (the room)
- **T (Z)** = time depth (discrete layers)
- The player is a 3D creature moving through this cube; other entities are 2D slices that persist across time unless moved.

### 2.2 Gameplay Loop
- **Turn-based puzzle.**
- **Goal:** Reach the exit in any valid time layer without paradox or detection.
- **Rifts:** Fixed links between specific `(x,y,t)` coordinates.
- **Propagation:** Changes at time `t` deterministically recompute `t+1...`.

### 2.3 Paradox Rules
- **Self-Intersection:** Player cannot occupy the same `(x,y,t)` twice.
- **Grandfather Paradox:** Any move that invalidates its own cause is disallowed.

### 2.4 Causal Detection
Enemies see the player through **backward light cones** (see `MATH_MODEL.md`).

---

## 3. Web Architecture

### 3.1 Stack
- **Framework:** React 19
- **Build Tool:** Vite
- **Language:** TypeScript
- **Rendering:** HTML Canvas (primary) with React UI overlays
- **State:** Immutable core logic; UI reads derived state
 - **State Management:** Redux Toolkit (explicit actions + predictable updates)
 - **Backend:** None (client-only)

### 3.2 Module Separation (Web)
- `core/`: pure logic (no React imports)
- `game/`: state container, actions, validation, propagation
- `render/`: canvas drawing + UI overlays
- `data/`: JSON/TOML parsing, level/theme loading
- `app/`: React wiring, routing, top-level layout

**Rule:** The core logic must remain UI-agnostic so it can be unit-tested independently and reused in non-UI contexts.

### 3.3 State Truth Model
- **Player truth (Phase 2):** `WorldLineState` is the authoritative player history (`path` + `visited` index).
- **Object truth (Phase 3+):** `TimeCube` occupancy becomes authoritative for non-player objects.
- **Rift transitions:** handled by reusable core resolver (`resolveRift`) before world-line extension.

Truth boundaries (exact rule):
1. Never derive player history from `TimeCube`.
2. Never validate object blocking from `WorldLineState`.
3. Rendering at slice `t` reads both sources:
   - player selves from `positionsAtTime(t)` on `WorldLineState`
   - objects from `TimeCube` occupancy at `t`
4. Reducer conflict rules decide outcomes when player/object share `(x, y, t)` (for example, blocked or win).

### 3.4 Detection Model (V1)
- **Discrete Delay**: enemy at `te` sees player at `te - k`
- Rationale: bounded cost, clear player intuition, deterministic UI feedback

---

## 4. UI & UX Principles (Web)

Detailed HUD and overlay specification:
- `docs/web-design/UI_WINDOW_SYSTEM.md`

### 4.1 Visual Goals
- Make temporal mechanics visually obvious
- Emphasize **past-turn selves**, **light cones**, and **time depth**
- Keep readability high at small grid sizes
- Favor **lines, shapes, and solid colors** for fast parsing

### 4.2 Visual Style
- **Main board:** flat 2D grid, crisp lines, solid fills, minimal gradients
- **Palette:** low saturation base with high-contrast accent colors
- **Icons:** simple geometric glyphs, no texture noise
- **Hints (optional):** an isometric cube view that shows the 3D structure using line/mesh plotting
  - Detailed spec: `PHASE_03_5_ISOMETRIC_TIMECUBE.md`

### 4.3 Input
- **Keyboard (intent-first):**
  - `F` opens/closes interaction mode selection
  - `1/2/3` selects directional mode (`Move`/`Push`/`Pull`)
  - WASD / Arrows apply the selected directional mode
  - `Space` applies Rift
  - `Enter` waits one turn
  - `R` restarts
- **Pointer:** optional click-to-move (future)

### 4.4 Layout (Web)
```
+-----------------------------------+------------------+
|             Canvas                |    Sidebar       |
|     (current time slice)          |  time/turn/etc   |
+-----------------------------------+------------------+
|             Bottom Bar (hints)                       |
+------------------------------------------------------+ 
```

---

## 5. Performance Model (Web)

### 5.1 What Gets Computed Per Turn
- **Render:** one time slice only (cheap)
- **Validate:** local checks (bounds, blocking, self-intersection)
- **Propagate:** only forward from the modified time slice
- **Detect:** bounded by explored time range `[T_min, T_max]`

### 5.2 Practical Constraints
- Avoid full-cube scans per action
- Use spatial indices for entity lookup
- Use time-indexed player positions for detection
- Start with **discrete delay detection** to keep checks bounded

**Conclusion:** JavaScript is sufficient if detection and propagation are bounded and indexed. The cost per turn stays stable even for larger grids.

---

## 6. Data-Driven Content

### 6.1 Formats
- Prefer **JSON** for web runtime
- **TOML** is allowed if shipped with a parser and preprocessed at build time

### 6.2 Loading Strategy
- Bundled levels/themes via Vite assets
- Hot-reload in dev via Vite HMR
- Optional user-level overrides via `localStorage` or import

---

## 7. Modularity and Configuration

### 7.1 Invariant (Core Rules)
- Cube-time geometry and world line rules
- Self-intersection and paradox constraints
- Propagation semantics

### 7.2 Configurable (Per Level / Theme)
- Grid size, time depth
- Detection model and parameters
- Entity placements and patrol paths
- UI theme and visual toggles

---

## 8. Procedural Generation (Future)

Goal: enable room layout + patrol + rift generation while guaranteeing solvability.

**Phased approach:**
- **Phase A:** scripted pattern generators (safe templates)
- **Phase B:** reverse construction (solution path → obstacles → tools)
- **Phase C:** detection-aware constraints (light cones, paradox limits)

This is out of MVP scope but should inform data formats and tooling.

---

## 9. Performance Targets (Web)
- 60 FPS grid rendering on typical laptops
- <2ms per move validation for standard grid sizes
- Smooth playback for fast action sequences

---

## 10. Non-Goals (Initial Web MVP)
- Multiplayer
- Procedural generation (deferred)
- Online sharing
- Mobile-first touch UX (defer to Phase 2)

---

## 11. References
- `MATH_MODEL.md` (core geometry and detection)
- `CORE_DATA.md` (TS data structures)
- `GAME_STATE.md` (action pipeline and validation)
- `RENDERING.md` (canvas/UI layout)
- `PHASE_03_5_ISOMETRIC_TIMECUBE.md` (isometric TimeCube panel)
