# UI Window System Spec (Vintage RPG Style, Web)

> **Purpose:** Define a clean, informative, extensible HUD inspired by vintage RPG command windows.
> **Scope:** `frontend/src/app/`, `frontend/src/render/`, input overlays, future story/dialog overlays.
> **References:** `docs/web-design/OVERALL.md`, `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`

---

## 1. Design Intent

The board remains the visual focus. UI elements provide command clarity and state readability without visual noise.

Constraints:
- no drop shadows
- white background base
- black lines and solid fills
- grayscale accents only (color can be introduced later as a controlled extension)
- no page scrolling in normal gameplay layouts

---

## 2. Windowed HUD Pattern

Use framed rectangular windows with thin separators, inspired by classic RPG UIs.

Window style baseline:
- background: white
- border: 2px solid black
- radius: 0px
- shadow: none
- separator lines: 1px solid black
- selected row: black fill with white text or 15% gray fill

---

## 3. Layout Grid (Desktop First)

Viewport:
- app root: `height: 100vh`
- overflow: hidden

Main layout:
- left panel: gameplay area (board + iso view), target `70%` width
- right panel: HUD stack, target `30%` width
- bottom strip: compact key hints, fixed height `40px`

Gameplay area:
- board and iso view sized to equal visual weight
- board should use most of available height

HUD stack order:
1. `CommandWindow` (top, fixed)
2. `StateWindow` (middle, fixed)
3. `LogWindow` (bottom, flexible, fills remaining height)

Mobile fallback:
- keep the same windows, but collapse to vertical stack
- board first, windows below
- keep each window title visible at all times

---

## 4. Window Specs

### 4.1 CommandWindow

Purpose:
- show active directional mode and available command modes
- make key-driven control self-explanatory

Content:
- active mode row: `Mode: Move | Push | Pull`
- command rows:
  - `F` open/close command menu
  - `1` select Move
  - `2` select Push
  - `3` select Pull
  - `Space` Rift
  - `Enter` Wait
  - `R` Restart

Behavior:
- when command menu is open, highlight selectable rows
- directional actions are paused until a selection is made or menu closes

### 4.2 StateWindow

Purpose:
- expose model state needed for tactical play

Required fields:
- `Turn (n)`
- `Time (t)`
- `Phase`
- `Rift delta`
- `Push chain max`
- `World line length`
- `Objects on slice`

### 4.3 LogWindow

Purpose:
- show recent outcomes with minimal noise

Rules:
- display last `5` entries
- newest entry at top
- each entry: `Turn`, `Action`, short outcome text
- use monospace alignment for readability

---

## 5. Typography and Tokens

Font roles:
- HUD/metrics: monospace family
- long-form story text: readable serif or humanist sans (defined when story system is introduced)

Token baseline:
- `--ui-bg: #ffffff`
- `--ui-fg: #111111`
- `--ui-muted: #6a6a6a`
- `--ui-line: #111111`
- `--ui-fill-selected: #111111`
- `--ui-fill-alt: #efefef`

Spacing:
- base unit: `4px`
- window padding: `8px`
- row gap: `4px`

---

## 6. Input Layer State Machine

Input is mode-driven and layer-aware.

States:
1. `Gameplay`
2. `ActionMenu`
3. `StoryDialog` (future)
4. `SystemMenu` (future pause/settings/help)

Priority:
- highest: `SystemMenu`
- then: `StoryDialog`
- then: `ActionMenu`
- lowest: `Gameplay`

Transitions:
- `Gameplay -> ActionMenu`: `F`
- `ActionMenu -> Gameplay`: `F` or `Escape` or mode selected (`1/2/3`)
- `Gameplay -> StoryDialog`: scripted event trigger (future)
- any state -> `SystemMenu`: pause key (future)

Ownership rule:
- only the active input layer may consume directional keys
- inactive layers must not process movement inputs

---

## 7. Extensibility Rules

To add a new interaction mode:
1. Add action handler in interaction registry.
2. Add mode entry to `CommandWindow`.
3. Add key mapping in input layer state machine.
4. Add log formatting rule for the new action outcome.

To add story overlays:
1. Reuse the same window frame tokens.
2. Mount overlay in higher input layer (`StoryDialog`).
3. Freeze gameplay input while dialog layer is active.

---

## 8. Acceptance Criteria

1. Players can understand controls by reading `CommandWindow` alone.
2. Active mode is always visible.
3. No gameplay scroll on desktop.
4. Input conflicts are prevented by input-layer ownership.
5. Future story dialogs can be added without redesigning base HUD.
