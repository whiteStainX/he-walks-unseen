# UI Window System Spec (Web)

> **Purpose:** Define the current UI layout contract and the immediate UX-polish baseline.
> **Scope:** `frontend/src/app/`, `frontend/src/render/`, input layers, overlays.
> **References:** `docs/web-design/OVERALL.md`, `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`

---

## 1. Design Intent

The board remains the main focus. HUD and overlays support planning and readability with minimal visual noise.

Constraints:
- no drop shadows
- white background base
- black lines and solid fills
- grayscale accents only
- desktop layout stays one screen (no page scroll)

---

## 2. Implemented Component Map

Current top-level UI components in `GameShell`:

1. `HeaderBar`
- title + phase/status subtitle

2. `BoardPanel`
- `GameBoardCanvas` (always visible)
- `IsoTimeCubePanel` (optional, lazy-loaded, settings-controlled)
- isometric caption row

3. `HudStack`
- `CommandWindow`
- `StateWindow`
- `LogWindow`

4. `BottomHintsBar`
- full or compact hint set (settings-controlled)

5. Overlays
- `LogOverlay` (`L`)
- `SettingsOverlay` (`M`)

---

## 3. Layout Contract

### 3.1 Desktop (default)

Main grid:
- left gameplay column: `7fr`
- right HUD column: `3fr` (minimum `300px`)

Gameplay sub-grid:
- with iso enabled: board `1.2fr`, iso `1fr`
- with iso disabled: single board column

HUD order:
1. `CommandWindow`
2. `StateWindow`
3. `LogWindow`

Bottom hints:
- single row container, wraps when needed

### 3.2 Responsive behavior

At `<=1100px`:
- layout becomes vertical (`board` above `hud`)
- HUD windows shown in 3-column row

At `<=900px`:
- iso panel hidden
- HUD becomes single column stack
- page-level scroll is allowed on small screens

---

## 4. Window Specs

### 4.1 CommandWindow

Purpose:
- mode visibility + control discoverability

Required content:
- active directional mode (`Move` / `Push` / `Pull`)
- mode rows with keys `1/2/3`
- key summary: direction, rift, wait, settings

Behavior:
- `F` toggles action menu layer
- mode rows highlight when menu is active

### 4.2 StateWindow

Purpose:
- tactical state for planning

Required blocks:
- core: turn, time, depth, phase, mode
- tools: rift delta, push max, pull, danger
- snapshot: objects on slice, player coordinate, pack, board size

Note:
- detection/paradox internals are model diagnostics and are intentionally hidden from default player-facing HUD.

### 4.3 LogWindow

Purpose:
- immediate status only (compact)

Rules:
- in-window status line only
- full history in `LogOverlay`
- log entries ordered newest first

### 4.4 SettingsOverlay

Purpose:
- runtime UI toggles only (no gameplay logic changes)

Current toggles:
- show/hide iso panel
- compact/full bottom hints
- default danger preview

Persistence:
- local storage key: `he-walks-unseen.ui-settings.v1`

---

## 5. Input Layer Contract

Input is layer-aware and intent-first.

Current layers:
1. `Gameplay`
2. `ActionMenu`
3. `LogOverlay`
4. `SystemMenu` (settings)

Active transitions:
- `F`: `Gameplay <-> ActionMenu`
- `L`: `Gameplay <-> LogOverlay`
- `M`: `Gameplay <-> SystemMenu`
- `Esc`: close active non-gameplay layer

Ownership rule:
- only `Gameplay` layer dispatches movement/rift/wait/restart actions
- directional keys are ignored for gameplay dispatch in non-gameplay layers
- no cross-layer auto-dispatch queue in current baseline

---

## 6. Board Preview Contract

`GameBoardCanvas` may render a non-committed action preview marker.

Rules:
- preview is read-only (no state mutation)
- preview validity mirrors key reducer constraints used for interaction planning:
  - bounds/time boundary
  - blocked cell checks
  - push chain limit
  - pull enabled/disabled
  - self-intersection prevention

Rendering:
- dashed preview box on target cell
- blocked preview uses cross marker

---

## 7. Accessibility Baseline

Current accessibility requirements:
- overlays use `role="dialog"` + `aria-modal="true"`
- status line uses live region semantics (`role="status"`, `aria-live="polite"`)
- overlay containers are focusable and focused on open
- full gameplay remains keyboard-operable

---

## 8. Immediate Polish Targets (Next Iteration)

Use this file as basis for visual/UX improvements:

1. Reduce cognitive load in `StateWindow`
- collapse less-critical metrics behind a compact/expanded mode

2. Strengthen board-first hierarchy
- keep board area visually dominant when both board and iso are shown

3. Improve overlay affordance
- clearer layer indicator (active overlay label in header or command window)

4. Improve preview readability
- differentiate preview by mode (`Move`/`Push`/`Pull`) without breaking monochrome style

5. Mobile ergonomics
- reduce vertical density in HUD when stacked on small screens

---

## 9. Acceptance Criteria

1. Component boundaries and layout behavior are explicit and testable.
2. Desktop remains single-screen during normal play.
3. Input-layer ownership prevents interaction conflicts.
4. Overlay behavior is keyboard-consistent.
5. This spec can be used directly for the next UX iteration without re-deriving current structure.
