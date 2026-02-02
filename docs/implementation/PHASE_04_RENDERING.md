# Phase 4: Basic Rendering (TUI)

> **Depends on:** Phase 3 (Game State & Movement)
> **Enables:** Phase 5 (Light Cone Vision), Phase 6 (Data Loading)

---

## Overview

This phase builds the terminal UI using Ratatui. The goal is to render the current time slice, show a minimal sidebar, and wire input to actions. Rendering is data-driven from `GameState` and stays independent of core logic.

**Goal:** Answer these questions:
- "What does the world look like at time t?"
- "What actions are available right now?"
- "How do I display future UI hooks (preview, time stack)?"

**Non-Goals (Phase 4):**
- Vision cone rendering (Phase 5)
- Data-driven themes (Phase 6)
- Full move preview (Phase 6)
- Animations (Phase 10)

---

## File Structure

```
src/render/
├── mod.rs           # Module exports
├── app.rs           # Ratatui app loop + state bridge
├── grid.rs          # Grid rendering for current time slice
├── sidebar.rs       # Time stack + info panel
├── preview.rs       # Move preview overlay (placeholder in Phase 4)
└── theme.rs         # Theme definition + styles

src/main.rs          # Wire render app to game state
```

---

## Critical Design Decisions

### Rendering is a Pure View (and Updates are Separate)

Rendering reads `GameState` and produces UI output. It does **not** mutate game state.
State mutation occurs only in `RenderApp::update`, never in `render()`.

```
render(state: &GameState, frame: &mut Frame)
```

**Rationale:**
- No cross-dependency from `core` → `render`
- Easier testing (render from mock state)
- Stable, deterministic UI output

### UI State Separation

`RenderState` stores UI-only state (focus, preview toggles, etc.) separate from `GameState`.

```rust
struct RenderState {
    show_preview: bool,
    last_action: Option<ActionOutcome>,
    status_message: Option<String>,
}
```

### Layered Rendering

The grid is rendered in layers with a clear order:

1. Floor / empty
2. Static entities (walls, exit)
3. Dynamic entities (boxes, enemies)
4. Player
5. Preview overlay (if enabled)

This avoids drawing conflicts and ensures player visibility.

**Note:** The entity selection rules below implement this layering order.

### Coordinate Mapping

Terminal coordinates are `(col, row)` while the game uses `(x, y)`:

```
Terminal row = y
Terminal col = x
```

Top-left of the grid is `(0,0)` in game space.

### Clipping & Bounds

Grid rendering must:
- Clip drawing to the grid area size
- Skip entities out of bounds (do not panic)
- Prefer stable output over perfect density

---

## 1. Render App (`src/render/app.rs`)

Top-level Ratatui application. Bridges input → game actions → rendering.

### Types

```rust
use crate::game::{GameState, Action, ActionOutcome, ActionError};

pub struct RenderApp {
    game: GameState,
    render_state: RenderState,
    should_quit: bool,
}

pub struct RenderState {
    pub show_preview: bool,
    pub last_outcome: Option<ActionOutcome>,
    pub status: Option<String>,
}
```

### Methods

```rust
impl RenderApp {
    pub fn new(game: GameState) -> Self;
    pub fn should_quit(&self) -> bool;
    pub fn handle_key(&mut self, key: KeyCode);
    pub fn update(&mut self) -> Result<(), ActionError>;
    pub fn render(&self, frame: &mut Frame);
}
```

### Render Pipeline

```
RenderApp::render(frame):
  1. Layout: split frame into grid + sidebar + bottom bar
  2. Render grid (current slice)
  3. Render sidebar (time + status)
  4. Render bottom bar (help + preview hint)
```

### Input Mapping (Phase 4)

| Key | Action |
|-----|--------|
| `W/A/S/D` | Move |
| `Space` | Use rift (if available) |
| `Q` / `Esc` | Quit |
| `R` | Restart |
| `P` | Toggle preview (placeholder) |

### Status Messages

`RenderState.status` is set on action errors:
- `MoveBlocked` → "Blocked"
- `NoRiftHere` → "No rift"
- `PushBlocked` → "Push blocked"
- `PushChainTooLong` → "Push chain too long"
 - `NothingToPush` → "Nothing to push"
 - `NothingToPull` → "Nothing to pull"
 - `NotPullable` → "Not pullable"
 - `GameNotActive` → "Not active"

Messages decay after one successful action.

---

## 2. Grid Rendering (`src/render/grid.rs`)

Renders the current time slice.

### Types

```rust
pub struct GridView<'a> {
    pub state: &'a GameState,
    pub theme: &'a Theme,
}
```

### Rendering Rules

- Grid size uses `TimeCube.width`/`height`
- Only the current time slice is rendered (from `GameState::current_time()`)
- Player drawn from `GameState::player_position()`
- Entities use symbols based on `EntityType`

### Symbol Mapping (Phase 4)

| EntityType | Glyph |
|------------|-------|
| Player | `@` |
| Wall | `█` |
| Exit | `>` |
| Rift | `O` |
| Box | `□` |
| Enemy | `E` |
| Floor / Empty | `.` |

### Render Algorithm (Pseudo)

```
for y in 0..height:
  for x in 0..width:
    cell = '.'
    if wall at (x,y,t): cell = '█'
    if exit at (x,y,t): cell = '>'
    if rift at (x,y,t): cell = 'O'
    if box at (x,y,t): cell = '□'
    if enemy at (x,y,t): cell = 'E'
    if player at (x,y,t): cell = '@'
    draw cell
```

### Entity Selection Rules

If multiple entities share a cell:
1. Player overrides all
2. Box overrides enemy/rift/exit
3. Enemy overrides rift/exit
4. Rift overrides exit
5. Exit overrides wall
6. Wall overrides floor

---

## 3. Sidebar (`src/render/sidebar.rs`)

Displays time info and status.

### Contents
- Current time `t`
- Current turn number
- Last action outcome (short summary)
- Level name (from `GameConfig`)

### Outcome Summary Mapping

| Outcome | Display |
|---------|---------|
| `Moved` | `Moved → (x,y,t)` |
| `Waited` | `Wait` |
| `Rifted` | `Rift → (x,y,t)` |
| `Pushed` | `Pushed N` |
| `Pulled` | `Pulled` |
| `Restarted` | `Restarted` |
| `Won` | `Won!` |

---

## 4. Preview (`src/render/preview.rs`)

Phase 4 only shows a **placeholder overlay**. The real preview is Phase 6.

```rust
pub fn render_preview_overlay(area: Rect, frame: &mut Frame, enabled: bool);
```

### Placeholder Behavior

If `enabled == true`, render a subtle border/label:
```
[Preview]
```

---

## 5. Theme (`src/render/theme.rs`)

Defines UI colors and styles.

```rust
pub struct Theme {
    pub bg: Color,
    pub fg: Color,
    pub wall: Color,
    pub player: Color,
    pub enemy: Color,
    pub exit: Color,
    pub rift: Color,
    pub box_: Color,
    pub accent: Color,
}

impl Theme {
    pub fn default() -> Self;
}
```

### Default Theme (Phase 4)

- Background: `Color::Black`
- Foreground: `Color::Gray`
- Walls: `Color::DarkGray`
- Player: `Color::Cyan`
- Enemy: `Color::Red`
- Exit: `Color::Green`
- Rift: `Color::Magenta`
- Box: `Color::Yellow`
- Accent: `Color::Blue`

---

## Module Exports

### `src/render/mod.rs`

```rust
pub mod app;
pub mod grid;
pub mod sidebar;
pub mod preview;
pub mod theme;

pub use app::RenderApp;
```

---

## Implementation Order

```
1. theme.rs      ─── Define colors and styles
2. grid.rs       ─── Render current time slice
3. sidebar.rs    ─── Time + status panel
4. preview.rs    ─── Placeholder overlay
5. app.rs        ─── Input loop + render wiring
6. main.rs       ─── Wire app + run loop
```

---

## Detailed Execution Plan

This plan is concrete and executable. Each step lists required files, methods, and tests.

### Step 1: Render Module Scaffold

**Files**
- `src/render/mod.rs`

**Implementation**
1. Create module exports for `app`, `grid`, `sidebar`, `preview`, `theme`.
2. Re-export `RenderApp`.

**Checks**
- Compiles with empty module stubs.

---

### Step 2: Theme

**Files**
- `src/render/theme.rs`

**Implementation**
1. Define `Theme` struct with fields: `bg`, `fg`, `wall`, `player`, `enemy`, `exit`, `rift`, `box_`, `accent`.
2. Implement `Theme::default()` using the palette in this doc.

**Tests**
- `test_theme_default_colors` (optional; can be omitted if redundant).

---

### Step 3: Grid Rendering

**Files**
- `src/render/grid.rs`

**Implementation**
1. Define `GridView<'a>` with `state: &'a GameState`, `theme: &'a Theme`.
2. Implement `render_grid(area, frame, state, theme)` (or `GridView::render`).
3. Compute `current_t = state.current_time()`.
4. Retrieve `slice = state.cube().slice(current_t)`.
5. For each visible cell:
   - Apply selection rules (player > box > enemy > rift > exit > wall > floor).
   - Draw symbol with theme color.
6. Clip drawing to `area` dimensions.

**Tests**
- `test_grid_symbol_mapping_player_overrides`
- `test_grid_symbol_mapping_wall`
- `test_grid_symbol_mapping_enemy`

---

### Step 4: Sidebar

**Files**
- `src/render/sidebar.rs`

**Implementation**
1. Define `SidebarView` or `render_sidebar(area, frame, state, render_state, theme)`.
2. Display:
   - Current time `t`
   - Turn number
   - Level name
   - Last action outcome summary (mapping table)
   - Status message (if any)
3. Use theme accent for headers, fg for text.

**Tests**
- `test_sidebar_shows_time_and_turn`
- `test_sidebar_outcome_summary`
- `test_status_message_on_error`

---

### Step 5: Preview Placeholder

**Files**
- `src/render/preview.rs`

**Implementation**
1. `render_preview_overlay(area, frame, enabled)`:
   - If `enabled == false`, no-op.
   - If `enabled == true`, draw a small label `[Preview]` with accent color.

**Tests**
- `test_preview_toggle`

---

### Step 6: RenderApp

**Files**
- `src/render/app.rs`

**Implementation**
1. Define `RenderApp` and `RenderState`.
2. `handle_key(key)` maps key → action:
   - `W/A/S/D` → `Action::Move`
   - `Space` → `Action::UseRift`
   - `R` → `Action::Restart`
   - `P` → toggle preview
   - `Q/Esc` → set `should_quit`
3. `update()` applies action using `apply_action`.
4. On `ActionError`, set `RenderState.status`.
5. On success:
   - Update `game` with result state
   - Update `last_outcome`
   - Clear status message
6. `render(frame)`:
   - Layout → grid + sidebar + bottom bar
   - Call `grid`, `sidebar`, `preview`

**Tests**
- `test_status_message_on_error`
- `test_preview_toggle`

---

### Step 7: Main Loop Integration

**Files**
- `src/main.rs`

**Implementation**
1. Build a minimal `GameState` (hardcoded level for Phase 4).
2. Construct `RenderApp`.
3. Replace placeholder rendering with `RenderApp::render`.
4. Input loop calls `handle_key` and `update`.

**Checks**
- `cargo run` shows grid, sidebar, help bar.
- `W/A/S/D` moves player.
- `R` restarts.
- `Q` exits.

---

### Step 8: Tests + Clippy

**Commands**
- `cargo test`
- `cargo clippy`

---

## Tests

Render tests are lightweight and focus on layout logic (no pixel-perfect testing):

- `test_grid_symbol_mapping_player_overrides`
- `test_grid_symbol_mapping_wall`
- `test_sidebar_shows_time_and_turn`
- `test_status_message_on_error`
- `test_preview_toggle`

Tests can use mocked `GameState` to avoid heavy setup.

---

## Exit Criteria

- [ ] Grid renders the current time slice
- [ ] Player glyph visible and moves with actions
- [ ] Walls and exit render correctly
- [ ] Sidebar shows current time + turn
- [ ] `R` restarts level
- [ ] `Q` quits cleanly
- [ ] No clippy warnings

---

## Example Usage (Main Loop Sketch)

```rust
let mut app = RenderApp::new(game_state);
loop {
    terminal.draw(|f| app.render(f))?;
    if app.should_quit() { break; }
    if event::poll(Duration::from_millis(16))? {
        if let Event::Key(key) = event::read()? {
            app.handle_key(key.code);
        }
    }
}
```

---

## Performance Considerations

- Grid render should be O(width × height)
- Avoid allocations per cell (reuse buffers where possible)
- Skip rendering off-screen areas

---

## Related Documents

- [Phase 3 Implementation Plan](PHASE_03_GAME_STATE.md)
- [Core Data Design](../design/CORE_DATA.md)
