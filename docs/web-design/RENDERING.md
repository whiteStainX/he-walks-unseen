# Rendering Design (Web)

> **Module target:** `frontend/src/render/`
> **Status:** Web rewrite

This document describes how the web UI renders the Space-Time Cube using React + Canvas, with UI overlays for state, controls, and previews.

---

## Goals

- Render current time slice clearly
- Visualize past-turn selves and detection zones
- Keep rendering independent of core logic
- Maintain 60 FPS on typical hardware

---

## Rendering Stack

### Core Rendering
- **HTML Canvas** for the grid
- **React components** for HUD windows, bottom bar, and overlays
- **Optional:** isometric TimeCube panel (`three` + `@react-three/fiber`) per `PHASE_03_5_ISOMETRIC_TIMECUBE.md`
- **Optional:** switch to WebGL/Pixi later if needed

If WebGL is used for the isometric panel, preserve current visual language:
- white background
- black outlines
- flat grayscale fills
- no shadows, bloom, gradients, or textured materials

For the isometric panel specifically, follow the readability-first style contract:
- contour-first linework (no dense wireframe diagonals)
- explicit slice slabs (thin opaque planes) instead of outline-only layers
- strict occlusion/blocking cues (front objects hide back objects)
- clear player/object visual hierarchy
- fixed-angle camera with pan/zoom/reset controls (rotation locked)
- tunable opacity/line tokens defined in `PHASE_03_5_ISOMETRIC_TIMECUBE.md`

### Component Layout
```
<App>
  <GameLayout>
    <GameCanvas />
    <HudWindows />
    <BottomBar />
    <OverlayLayer />
  </GameLayout>
</App>
```

### Render Module Organization
- Place feature-specific rendering code under `frontend/src/render/<feature>/` (for example `board/`, `iso/`).
- Keep shared rendering utilities at `frontend/src/render/` (for example `theme.ts`).

---

## Render Flow

1. React state updates on action
2. Canvas redraws current slice
3. UI overlays update (status, turn, warnings)

**Invariant:** Render functions do not mutate `GameState`.

**Truth sources at render time:**
- Player selves are derived from `WorldLineState` (`positionsAtTime(currentT)`).
- Non-player objects are read from `TimeCube` occupancy at `currentT`.

---

## Grid Rendering (Canvas)

### Coordinate Mapping
- Game `(x,y)` maps to canvas `(col,row)`
- Cell size fixed (e.g. 24px), scaled for window

### Draw Order
1. Floor
2. Walls/Static
3. Dynamic entities (boxes, enemies)
4. Past-turn selves
5. Current-turn self
6. Preview overlays (danger zones)

### Entity Priority (if multiple)
1. Player (current)
2. Box
3. Enemy
4. Rift
5. Exit
6. Wall
7. Floor

---

## Past-Turn Selves

When multiple positions share the same cube-time:
- **Current-turn self:** bright color
- **Past-turn selves:** dim color

Render by querying `worldLine.positionsAtTime(t)` and sorting by turn index.

---

## Light Cone / Danger Overlays

Render as semi-transparent shapes on the grid:
- **Instant zone:** solid red
- **Causal zone:** gradient or dim red

Only drawn when detection preview is enabled.

---

## HUD Windows (React)

Display:
- `CommandWindow` (mode + key commands)
- `StateWindow` (`t`, turn, phase, core stats)
- `LogWindow` (status line + log overlay hint)

---

## Bottom Bar (React)

Display input hints and mode indicators.

Example:
```
F Menu | 1/2/3 Mode | WASD/Arrows Direction | Space Rift | Enter Wait | L Log | P Danger | V Pack | [ ] Rift +/- | - = Push Max +/- | R Restart
```

---

## Themes

Theme data (colors/symbols) should be loaded from JSON and applied to:
- Canvas drawing styles
- React UI classnames

---

## Related Documents
- `CORE_DATA.md`
- `GAME_STATE.md`
- `MATH_MODEL.md`
- `PHASE_03_5_ISOMETRIC_TIMECUBE.md`
