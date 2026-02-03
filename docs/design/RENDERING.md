# Rendering Design

> **Module:** `src/render/`
> **Status:** Implemented (Phase 4)

This document describes the terminal rendering layer (Ratatui) and how it maps
`GameState` into a visible grid + sidebar layout. Rendering is a pure view:
no gameplay mutation occurs inside render functions.

---

## Goals

- Visualize the current time slice of the Space-Time Cube.
- Display minimal game info (time, turn, level, last outcome, status).
- Provide a stable input loop for movement and restart.
- Keep rendering independent from core logic and data loading.

**Non-Goals (Phase 4):**
- Vision cone rendering
- Data-driven themes (Phase 6)
- Full preview (Phase 6)
- Animations

---

## Module Layout

```
src/render/
├── mod.rs       # Module exports
├── app.rs       # RenderApp + input handling
├── grid.rs      # Grid rendering for current time slice
├── sidebar.rs   # Info panel rendering
├── preview.rs   # Placeholder overlay
└── theme.rs     # Theme palette
```

---

## High-Level Model

```
GameState (read-only) ──────► RenderApp::render()
      │                          │
      ├─ world_line              ├─ grid (current time slice)
      ├─ cube                     ├─ sidebar (time/turn/status)
      └─ config                   └─ bottom bar (controls)

RenderState (UI-only) stores:
- last_outcome
- status message
- preview toggle
```

**Render order:** Grid → Sidebar → Bottom Bar → Preview overlay (drawn on top of the grid).

**Invariant:** Rendering never mutates `GameState`. All state changes are done in
`RenderApp::update()` by applying a pending `Action`.

---

## RenderApp (App Loop + UI State)

`RenderApp` owns:
- `game: GameState`
- `render_state: RenderState`
- `should_quit: bool`
- `pending_action: Option<Action>`
- `theme: Theme`

### RenderState

```rust
struct RenderState {
    show_preview: bool,
    last_outcome: Option<ActionOutcome>,
    status: Option<String>,
}
```

### Input Mapping (Phase 4)

| Key | Action |
|-----|--------|
| `W/A/S/D` | Move | 
| `Arrow Keys` | Move |
| `Space` | Use rift |
| `R` | Restart |
| `P` | Toggle preview |
| `Q` or `Esc` | Quit |

**Input semantics:**
- Only `KeyEventKind::Press` events are handled (no repeats/holds).
- `handle_key()` queues one `pending_action`; `update()` applies it immediately in the main loop.

### Update Flow

1. `handle_key()` sets `pending_action` or toggles UI state.
2. `update()` applies the action via `apply_action()`.
3. On success:
   - Replace `game` with the returned state.
   - Store `last_outcome`.
   - Clear `status`.
4. On error:
   - Set `status` to an error string.
   - `game` remains unchanged.

**Status lifecycle:** status messages persist until the next successful action.

### Status Messages

Mapping from `ActionError`:
- `GameNotActive` → "Not active"
- `MoveBlocked` → "Blocked"
- `NoRiftHere` → "No rift"
- `InvalidRiftTarget` → "Invalid rift"
- `NothingToPush` → "Nothing to push"
- `PushBlocked` → "Push blocked"
- `PushChainTooLong` → "Push chain too long"
- `NothingToPull` → "Nothing to pull"
- `NotPullable` → "Not pullable"
- `Internal` → "Internal error"

---

## Layout

Screen is split into:

```
┌───────────────────────────┬──────────────┐
│         Grid              │   Sidebar    │
│                           │              │
├───────────────────────────┴──────────────┤
│             Bottom Bar (controls)        │
└──────────────────────────────────────────┘
```

- **Grid**: renders the current time slice.
- **Sidebar**: time/turn/level/status/outcome.
- **Bottom bar**: key hints and mode info.

---

## Grid Rendering

### Coordinate Mapping
- Game uses `(x, y)` where `(0,0)` is top-left.
- Terminal uses `(col, row)`; mapped as:
  - `row = y`
  - `col = x`

### Bounds
- Rendering clips to the grid area size.
- Out-of-bounds positions are skipped.
- Only the visible `inner.width × inner.height` region is drawn; entities outside are not rendered.

### Entity Selection Rules

When multiple entities share a cell:
1. Player overrides all
2. Box overrides enemy/rift/exit
3. Enemy overrides rift/exit
4. Rift overrides exit
5. Exit overrides wall
6. Wall overrides floor

**Resolution algorithm:** all entities at a cell are scanned and the highest-priority
entity type is selected; player is forced on top using `GameState::player_position()`.

### Glyph Mapping

| EntityType | Glyph | Color |
|------------|-------|-------|
| Player | `@` | `theme.player` |
| Wall | `█` | `theme.wall` |
| Exit | `>` | `theme.exit` |
| Rift | `O` | `theme.rift` |
| Box | `□` | `theme.box_` |
| Enemy | `E` | `theme.enemy` |
| Floor/Empty | `.` | `theme.fg` |

### Implementation Note
- Player is rendered directly from `GameState::player_position()` to ensure
  visibility even if entity layering changes.
- Non-ASCII glyphs (`█`, `□`) are used; terminals without full Unicode support
  may render imperfectly. ASCII fallbacks can be added later via theme/config.

---

## Sidebar Rendering

Sidebar content lines:
- `Level: <level_name>`
- `t = <current_time>`
- `Turn: <turn>`
- `Outcome: <last_outcome>`
- `Status: <error>`

### Outcome Summary Mapping

| Outcome | Text |
|---------|------|
| `Moved` | `Moved → (x,y,t)` |
| `Waited` | `Wait` |
| `Rifted` | `Rift → (x,y,t)` |
| `Pushed` | `Pushed N` |
| `Pulled` | `Pulled` |
| `Restarted` | `Restarted` |
| `Won` | `Won!` |
| `Detected` | `Detected` |

---

## Preview Overlay (Phase 4)

Preview is a placeholder only:
- If enabled, shows `[Preview]` label in the top-right of the grid area.
- No action prediction yet (Phase 6).

---

## Theme

Default palette (Phase 4):
- Background: `Black`
- Foreground: `Gray`
- Walls: `DarkGray`
- Player: `Cyan`
- Enemy: `Red`
- Exit: `Green`
- Rift: `Magenta`
- Box: `Yellow`
- Accent: `Blue`

`Theme` implements `Default` and is stored inside `RenderApp`.

**Theme usage boundary:** Phase 4 applies colors to glyphs and borders only.
The background is not explicitly filled.

---

## Implementation Constraints

- Rendering must not access `core` directly except through `GameState`.
- No mutation inside `render()`.
- Grid rendering is O(width × height).
- The render layer does not surface `ActionResult.propagation` (reserved for Phase 5+ UI).

---

## Tests

Rendering tests focus on deterministic logic, not pixel output:
- Grid selection order (player override, enemy > rift, etc.)
- Sidebar outcome summary formatting
- Preview toggle does not panic
- No snapshot or pixel-diff testing is performed in Phase 4.

---

## Phase 4 Demo State (Main)

`src/main.rs` constructs a small demo cube:
- Border walls
- One player
- One exit
- One pushable box
- One rift
- Time depth sized for multiple turns

This will be replaced by data loading in Phase 6.

---

## Time Depth and Move Limits

Movement (including `Wait`) is constrained by time depth:

```
0 <= t < time_depth
```

Once the player reaches the last time slice, no further moves are valid.
This is a common limitation in the Phase 4 demo because it uses a fixed
`time_depth` when building the sample cube.

---

## Restart Behavior

Restart resets `GameState` to the initial cube and world line and returns the
game to `Playing` phase. The render layer assumes restart produces a playable
state (no lingering `GameNotActive` errors).

---

## Known Deferred Features

- Vision cone rendering (Phase 5)
- Time-stack visualization
- Move previews
- Undo/redo UI
- Themed palettes from config
- Animations
