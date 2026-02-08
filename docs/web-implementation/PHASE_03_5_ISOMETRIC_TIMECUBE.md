# Phase 3.5: Isometric TimeCube Panel (Web)

> **Depends on:** `docs/web-implementation/PHASE_03_OBJECTS.md`
> **Enables:** `docs/web-implementation/PLAN.md` Phase 4 (interactions)
> **Design References:** `docs/web-design/PHASE_03_5_ISOMETRIC_TIMECUBE.md`, `docs/web-design/RENDERING.md`

---

## Goal

Add a read-only isometric TimeCube panel beside the main board to improve temporal understanding while preserving current gameplay behavior.

This phase does not change move/rift/object rules. It only adds an explanatory visualization.

---

## Status

- `Status`: Planned
- `Dependencies`: Installed (`three`, `@react-three/fiber`, `@react-three/drei`, `@types/three`)

---

## Locked Rules

1. Authoritative state remains unchanged:
- player truth: `WorldLineState`
- object truth: `TimeCube` occupancy
2. Isometric panel is read-only.
3. Window size is capped at 10 time slices.
4. Visual style stays monochrome minimal:
- white background
- black lines
- flat grayscale fills
- no shadows/bloom/texture/post-processing

---

## Scope

### In Scope

- Add isometric render panel to layout
- Add deterministic 10-slice window selector
- Add derived isometric view model from existing state
- Render player selves and objects by slice in isometric space
- Keep main board and controls unchanged

### Out of Scope

- Click interaction in isometric panel
- Detection overlays in isometric panel
- Camera animation polish
- Any gameplay mutation from isometric view

---

## Interface-First Contracts

### Core selector contract

`frontend/src/render/iso/selectIsoWindow.ts`

```ts
type TimeWindow = { startT: number; endT: number; focusT: number };

function selectIsoWindow(currentT: number, timeDepth: number, maxWindow?: number): TimeWindow
```

Rules:
- `maxWindow` defaults to `10`
- never returns out-of-range `t`
- prioritizes centering focus when future depth allows

### View model contract

`frontend/src/render/iso/buildIsoViewModel.ts`

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
    render: { fill?: string; stroke?: string; glyph?: string };
  }>;
};

type IsoCubeViewModel = {
  startT: number;
  endT: number;
  focusT: number;
  slices: IsoWindowSlice[];
};
```

Builder inputs:
- `currentT`
- `timeDepth`
- `worldLine`
- `cube`

### Render contract

`frontend/src/render/IsoTimeCubePanel.tsx`

Props:
- `viewModel: IsoCubeViewModel`
- `boardSize: number`

Behavior:
- orthographic isometric camera
- object layers + player layers rendered by `t`
- focus slice visually emphasized

---

## Implementation Plan

1. Add `render/iso` module:
- `selectIsoWindow.ts`
- `buildIsoViewModel.ts`
- `selectIsoWindow.test.ts`
- `buildIsoViewModel.test.ts`

2. Add `IsoTimeCubePanel.tsx` with `react-three-fiber`:
- orthographic camera
- line/box primitives only
- no lighting effects

3. Extend theme for isometric panel tokens:
- reuse monochrome palette values from existing theme source

4. Integrate into `GameShell` layout:
- main board remains primary
- isometric panel beside it on desktop
- responsive fallback on narrow widths

5. Add lightweight UI info:
- displayed window range (`startT..endT`)
- focus time (`currentT`)

6. Verify no reducer/core gameplay changes are introduced.

---

## Test Requirements

1. Selector tests (`selectIsoWindow`):
- latest-time behavior (last 10 slices)
- limited-future behavior (example: 4 future + 6 present/past)
- centered behavior when future >= 5
- small `timeDepth < 10`

2. View model tests:
- includes correct slice count
- maps player selves to correct `t`
- maps objects from `objectsAtTime(t)` correctly

3. Integration sanity:
- panel renders without affecting existing movement/rift behavior
- lint and tests pass

---

## Acceptance Criteria

1. Isometric panel renders beside main board on desktop.
2. 10-slice window logic matches design rules.
3. Focus slice is clearly highlighted.
4. Player/object layers match state at each displayed `t`.
5. Existing game actions behave identically to pre-Phase 3.5.
6. `npm run lint` and `npm run test` pass.

---

## Risks and Mitigations

1. Bundle weight increase from 3D stack
- Mitigation: keep panel module isolated; consider lazy-loading if needed

2. Visual drift from baseline style
- Mitigation: enforce unlit materials and existing monochrome tokens

3. Performance regressions on low-end devices
- Mitigation: cap to 10 slices and keep geometry minimal
