# Phase 3.5 Design: Isometric TimeCube View

> **Status:** Implemented baseline, iterating
> **Primary UI role:** Mental-model aid beside the main time-slice board
> **Scope type:** Read-only visualization (no gameplay mutation)

---

## 1. Goal

Add a secondary isometric TimeCube panel beside the main board to show local temporal context around the player's current time.

This view is explanatory, not authoritative:
- authoritative player truth remains `WorldLineState`
- authoritative object truth remains `TimeCube` occupancy

---

## 2. Layout Requirement

Place isometric view beside the existing main board/time-slice view.

Expected desktop composition:
- main board (current time slice) remains primary
- isometric cube preview remains secondary
- sidebar and controls remain visible without scrolling

Mobile fallback:
- collapse isometric panel below main board or hide behind toggle

---

## 3. Time Window Rule (Max 10 Units)

Let:
- `MAX_WINDOW = 10`
- `currentT` = player's current cube time
- `timeDepth` = total cube depth
- `windowLen = min(MAX_WINDOW, timeDepth)`

### Required behavior

1. If player is near latest time:
- show previous slices only up to `windowLen`
- example: latest time -> show last 10 slices

2. If player has only limited future:
- include all available future slices
- fill remaining slots with present/past
- example: 4 future available -> show `4` future + `6` present/past (total 10)

3. If future is abundant:
- cap future at `5` for a 10-window
- keep present near center

### Deterministic selector

```ts
type TimeWindow = { startT: number; endT: number; focusT: number };

function selectIsoWindow(currentT: number, timeDepth: number, maxWindow = 10): TimeWindow {
  const windowLen = Math.min(maxWindow, timeDepth);
  const availableFuture = Math.max(0, timeDepth - 1 - currentT);
  const maxFuture = Math.floor(maxWindow / 2); // 5 when maxWindow=10
  const futureCount = Math.min(availableFuture, maxFuture, windowLen - 1);
  const pastAndPresentCount = windowLen - futureCount;

  let startT = currentT - (pastAndPresentCount - 1);
  let endT = startT + windowLen - 1;

  if (startT < 0) {
    endT += -startT;
    startT = 0;
  }
  if (endT >= timeDepth) {
    const shift = endT - (timeDepth - 1);
    startT -= shift;
    endT = timeDepth - 1;
  }

  return { startT, endT, focusT: currentT };
}
```

---

## 4. Visual Semantics

Each rendered layer corresponds to one cube-time slice in `[startT, endT]`.

Encoding rules:
- current slice (`t = currentT`) emphasized with strongest outline
- past slices fade by age
- future slices fade by distance
- player selves rendered on matching layers from `positionsAtTime(t)`
- objects rendered from `objectsAtTime(t)`

No detection cones in this phase.
No interaction affordances in this phase.

---

## 5. Style Direction (Moebius-Inspired)

Target direction:
- simple contour lines
- strong 3D form readability
- clear occlusion and blocking
- low-noise grayscale rendering

This is not a comic imitation; it is a geometric readability contract.

### 5.1 Readability Goals

1. Player and objects must be distinguishable in under 2 seconds.
2. Time slices must be explicit volumes (not only outlines).
3. Users should not reconstruct slice depth mentally from wireframe clutter.

### 5.2 Geometry Rules

1. Slice slabs, not outline-only planes:
- every slice renders as a thin translucent slab
- slab fills are intentionally light so past/future traces stay visible through layers
- focus slice has strongest contour, not heavy fill
- non-focus slices fade by temporal distance

2. Contour-first linework:
- show outer edges and key internal boundaries only
- remove dense diagonal wireframe lines
- hidden edges are suppressed or heavily de-emphasized

3. Occlusion is mandatory:
- front entity geometry blocks back geometry
- slice slabs should not act as hard occluders (`depthWrite: false` policy)
- no x-ray style overlap by default
- depth order must communicate blocking cleanly

### 5.3 Entity Differentiation Rules

1. Player:
- strongest contour weight
- highest visual contrast in panel
- always distinct from object fill values

2. Objects:
- medium contour weight
- flatter fills than player
- consistent silhouettes by kind

3. Past selves:
- reduced opacity and line weight
- never compete with current-turn player

### 5.4 Tunable Parameters (Spec Defaults)

These are spec-level tokens and can be tuned later without changing direction:

| Token | Default | Purpose |
|------|---------|---------|
| `iso.slice.opacity.focus` | `0.08` | focus slab fill opacity |
| `iso.slice.opacity.near` | `0.05` | near-slice slab opacity |
| `iso.slice.opacity.far` | `0.02` | far-slice slab opacity |
| `iso.slice.line.focus` | `2.2` | focus slab edge width |
| `iso.slice.line.normal` | `1.2` | non-focus edge width |
| `iso.entity.line.player` | `2.4` | player contour weight |
| `iso.entity.line.object` | `1.4` | object contour weight |
| `iso.entity.opacity.pastSelf` | `0.45` | past-self visual attenuation |
| `iso.hiddenEdge.opacity` | `0.15` | hidden edge visibility |
| `iso.slice.thickness` | `0.16` | slab thickness in iso world units |
| `iso.slice.depthWrite` | `false` | prevents slab fill from hiding past traces |

Palette policy:
- default is grayscale only
- optional single accent channel for player is allowed as a configurable token, off by default

### 5.5 View Control Contract

The isometric panel camera remains fixed-angle for mental-model consistency.

Allowed view interaction:
- pan (drag)
- zoom in/out (`+` / `-` buttons, wheel/pinch)
- reset (`Reset` button)

Disallowed in baseline:
- free rotation
- perspective camera mode

Reset behavior:
- restore canonical camera position and target
- restore computed default zoom for current board/time-window framing

---

## 6. Library Decision

## Candidates

1. `three` + `@react-three/fiber`
- Pros:
  - true 3D scene with orthographic camera (clean isometric presentation)
  - natural mapping from `(x,y,t)` to 3D coordinates
  - integrates with React component model
  - supports React 19 via `@react-three/fiber` v9
- Cons:
  - adds WebGL stack and scene-management complexity

2. `pixi.js`
- Pros:
  - excellent 2D performance
  - strong line/shape drawing APIs
- Cons:
  - no native 3D camera model; isometric effect must be manually projected

3. Canvas 2D only
- Pros:
  - no new dependency
  - minimal bundle cost
- Cons:
  - manual projection and depth layering are harder to maintain

## Recommendation

Use `three` + `@react-three/fiber` for Phase 3.5 isometric panel.

Rationale:
- the feature is explicitly a 3D explanatory view
- orthographic projection aligns with a clean scientific/isometric style
- React-first integration keeps render architecture consistent

### Visual Guardrails (Must Match Current Style)

Even with WebGL, visual language must stay minimal and diagrammatic:

1. Background and palette
- white background
- black outline strokes
- flat grayscale fills for objects
- no saturated color accents in Phase 3.5

2. Geometry style
- simple boxes/planes/line segments only
- no rounded/organic meshes
- no texture maps

3. Material and lighting
- use unlit materials (`MeshBasicMaterial`, `LineBasicMaterial`)
- no physically based shading
- no shadows
- no bloom/glow/post-processing

4. Camera and composition
- orthographic camera only
- fixed isometric angle
- no perspective distortion
- support pan/zoom/reset controls, but keep rotation locked

5. Theme source of truth
- colors should map to existing theme tokens from current monochrome baseline
- do not introduce an independent visual system for the isometric panel

6. Rendering priority
- readability over realism
- every `(x,y,t)` layer must remain visually separable at a glance

---

## 7. Data Contract (Render Input)

```ts
type IsoWindowSlice = {
  t: number;
  isFocus: boolean;
  playerSelves: Array<{ x: number; y: number; turn: number }>;
  objects: Array<{
    id: string;
    x: number;
    y: number;
    kind: string;
    render: { fill?: string; stroke?: string; symbol?: string };
  }>;
};

type IsoCubeViewModel = {
  startT: number;
  endT: number;
  focusT: number;
  slices: IsoWindowSlice[];
};
```

Builder rule:
- build from selectors only
- do not mutate `GameState`

---

## 8. Performance Constraints

- recompute view model only when `currentT`, `worldLine`, or `cube` changes
- cap slices at 10 always
- keep geometry simple (boxes/planes/lines, no heavy materials)

Target:
- no noticeable input latency increase versus main-board-only mode

---

## 9. Out of Scope (Phase 3.5)

- click-to-seek time
- tunnel/rift authoring from isometric panel
- detection overlays
- animation polish beyond simple transitions

---

## 10. Acceptance Criteria

1. Isometric panel renders beside main board on desktop.
2. Time window follows the 10-slice rules above.
3. Current slice is visually identifiable.
4. Player selves and objects are visible on correct layers.
5. Main gameplay behavior remains unchanged.
6. Occlusion/contour hierarchy makes blocking and depth readable without dense wireframes.
7. Users can pan/zoom/reset the isometric helper without changing gameplay state.
8. Slice slabs indicate time layers without obscuring past/future traces.

---

## 11. Related Documents

- `docs/web-design/OVERALL.md`
- `docs/web-design/RENDERING.md`
- `docs/web-design/MATH_MODEL.md`
