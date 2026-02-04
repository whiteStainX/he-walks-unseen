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
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Rendering:** HTML Canvas (primary) with React UI overlays
- **State:** Immutable core logic; UI reads derived state

### 3.2 Module Separation (Web)
- `core/`: pure logic (no React imports)
- `game/`: state container, actions, validation, propagation
- `render/`: canvas drawing + UI overlays
- `data/`: JSON/TOML parsing, level/theme loading
- `app/`: React wiring, routing, top-level layout

**Rule:** The core logic must remain UI-agnostic so it can be unit-tested independently and reused in non-UI contexts.

---

## 4. UI & UX Principles (Web)

### 4.1 Visual Goals
- Make temporal mechanics visually obvious
- Emphasize **past-turn selves**, **light cones**, and **time depth**
- Keep readability high at small grid sizes

### 4.2 Input
- **Keyboard:** WASD / Arrows, Space (rift), R (restart)
- **Pointer:** optional click-to-move (future)

### 4.3 Layout (Web)
```
+-----------------------------------+------------------+
|             Canvas                |    Sidebar       |
|     (current time slice)          |  time/turn/etc   |
+-----------------------------------+------------------+
|             Bottom Bar (hints)                       |
+------------------------------------------------------+ 
```

---

## 5. Data-Driven Content

### 5.1 Formats
- Prefer **JSON** for web runtime
- **TOML** is allowed if shipped with a parser and preprocessed at build time

### 5.2 Loading Strategy
- Bundled levels/themes via Vite assets
- Hot-reload in dev via Vite HMR
- Optional user-level overrides via `localStorage` or import

---

## 6. Performance Targets (Web)
- 60 FPS grid rendering on typical laptops
- <2ms per move validation for standard grid sizes
- Smooth playback for fast action sequences

---

## 7. Non-Goals (Initial Web MVP)
- Multiplayer
- Procedural generation
- Online sharing
- Mobile-first touch UX (defer to Phase 2)

---

## 8. References
- `MATH_MODEL.md` (core geometry and detection)
- `CORE_DATA.md` (TS data structures)
- `GAME_STATE.md` (action pipeline and validation)
- `RENDERING.md` (canvas/UI layout)
