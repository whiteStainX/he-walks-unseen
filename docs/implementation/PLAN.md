# Implementation Plan: He Walks Unseen

> **Design Reference:** `docs/design/OVERALL.md`
> **Code Reference:** `CLAUDE.md`

---

## Overview

The implementation is divided into **6 phases**, each building on the previous. Each phase delivers a working (though incomplete) game that can be tested.

---

## Phase 1: Foundation

**Goal:** Project skeleton, build system, basic runnable TUI.

### Deliverables
- [ ] Cargo workspace setup
- [ ] Dependencies configured (ratatui, crossterm, serde, toml)
- [ ] Basic `main.rs` with terminal setup/teardown
- [ ] Empty game loop (renders blank screen, handles quit)
- [ ] CI-ready: `cargo build`, `cargo test`, `cargo clippy` all pass

### Files Created
```
Cargo.toml
src/
  main.rs
  lib.rs
```

### Exit Criteria
- Running `cargo run` shows a blank terminal screen
- Pressing `q` exits cleanly
- No clippy warnings

---

## Phase 2: Core Data Structures

**Goal:** Define the Space-Time Cube and Entity system without rendering.

### Deliverables
- [ ] `TimeSlice`: 2D grid at time `t`
- [ ] `TimeCube`: Collection of TimeSlices
- [ ] `Entity`: ID + position + components
- [ ] `Component` enum: `Position`, `BlocksMovement`, `BlocksVision`, `Pushable`, `Pullable`, `TimePersistent`, `Patrol`, `VisionCone`, `Rift`
- [ ] `WorldLine`: Player path tracking with self-intersection check
- [ ] Unit tests for all structures
 - [ ] Enforce uniqueness for data-bearing components (rift/patrol/vision)
 - [ ] Allow wait moves as valid steps (t + 1, same x/y)
 - [ ] `TimeSlice::add_entity` overwrites existing IDs for simplicity
 - [ ] `spawn_or_replace` replaces in target slice only (no propagation)

### Files Created
```
src/core/
  mod.rs
  time_cube.rs
  entity.rs
  world_line.rs
  components.rs
```

### Key Types
```rust
pub struct Position { x: i32, y: i32, t: i32 }
pub struct Entity { id: Uuid, components: Vec<Component> }
pub struct TimeSlice { grid: HashMap<(i32, i32), Vec<EntityId>> }
pub struct TimeCube { slices: Vec<TimeSlice>, width: i32, height: i32 }
pub struct WorldLine { path: Vec<Position> }
```

### Exit Criteria
- Can create a TimeCube with entities
- Can query "what's at (x, y, t)?"
- WorldLine detects self-intersection
- 100% test coverage on core types

---

## Phase 3: Game State & Movement

**Goal:** Player can move in space, time advances, basic paradox detection.

### Deliverables
- [ ] `GameState`: Current player position, world state, world line
- [ ] `Action` enum: `Move(Direction)`, `Wait`, `UseRift`, `Push`, `Pull`
- [ ] `validate_move()`: Check for collisions, self-intersection
- [ ] `apply_move()`: Update state, extend world line
- [ ] Time auto-advances: each spatial move increments `t`
- [ ] Basic propagation: entities with `TimePersistent` copy forward

### Files Created
```
src/game/
  mod.rs
  state.rs
  actions.rs
  validation.rs
src/core/
  propagation.rs
```

### Key Functions
```rust
fn validate_move(state: &GameState, action: Action) -> Result<(), GameError>;
fn apply_move(state: GameState, action: Action) -> Result<GameState, GameError>;
fn propagate(cube: &mut TimeCube, from_t: i32);
```

### Exit Criteria
- Player can move WASD
- Moving to a wall is rejected
- Moving to own past position (via rift) is rejected
- Time increments with each move

---

## Phase 4: Basic Rendering

**Goal:** Visualize the current time slice with player, walls, and entities.

### Deliverables
- [ ] Ratatui app structure with game loop
- [ ] Grid rendering: walls, floor, player
- [ ] Sidebar: current time `t`, time stack indicator
- [ ] Bottom bar: placeholder for move preview
- [ ] Input handling: WASD moves, `q` quits, `r` restarts
- [ ] Theme structure (hardcoded first, data-driven later)

### Files Created
```
src/render/
  mod.rs
  app.rs
  grid.rs
  sidebar.rs
  theme.rs
```

### UI Layout
```
┌─────────────────────────┬──────────┐
│ ████████████████████    │ t = 0    │
│ █..................█    │ ████████ │
│ █..@.................   │          │
│ █..................█    │          │
│ ████████████████████    │          │
├─────────────────────────┴──────────┤
│ WASD: move | Q: quit | R: restart  │
└────────────────────────────────────┘
```

### Exit Criteria
- Can see player `@` on grid
- Can see walls `█` or `#`
- Moving updates the display
- Time indicator shows current `t`

---

## Phase 5: Light Cone Vision & World Line Visualization ✅

**Goal:** Enemies with vision cones, fail state when detected, past-turn selves rendering.

> **Design Reference:** `docs/design/MATH_MODEL.md` (Sections 9, 10, 12)
> **Detailed Plan:** `docs/implementation/PHASE_05_LIGHT_CONE.md`

### Deliverables

#### 5.1 World Line Visualization (Past-Turn Selves)
- [x] `WorldLine::positions_at_time_with_turn(t)`: query all positions at a given cube-time with turn indices
- [x] Past-turn selves rendering: dim ghosts for non-current positions at same `t`
- [x] Current-turn self identification: highest turn index at current `t`

#### 5.2 Light Cone Detection
- [x] `check_detection()`: pure API in `core::detection` (no GameState dependency)
- [x] Detection models: DiscreteDelay (default) and LightCone (configurable)
- [x] `DetectionConfig`: configurable delay_turns and vision_radius per level
- [x] `BlocksVision` support: walls block line of sight via Bresenham ray casting

#### 5.3 Enemy Patrol
- [x] `PatrolData::position_at(t)`: existing API works for detection
- [x] Patrol-aware enemy positioning in detection and rendering

#### 5.4 Vision Rendering
- [x] Danger zone rendering: enemy vision zones shown with background color
- [x] Enemy positions rendered patrol-aware (correct position at time t)
- [x] Fail state: `GamePhase::Detected` triggers on detection
- [x] `ActionOutcome::Detected { by, seen_at }` provides feedback

### Files Created/Modified
```
src/core/
  light_cone.rs      # Bresenham ray casting, manhattan_distance, is_line_blocked
  detection.rs       # DetectionConfig, DetectionModel, check_detection()
  world_line.rs      # positions_at_time_with_turn, current_position_at_time, max_t
  mod.rs             # Re-exports for new modules
src/game/
  state.rs           # GameConfig.detection field
  actions.rs         # Detection check in finalize_action, integration test
src/render/
  grid.rs            # Past-turn selves, enemy vision zones, patrol-aware enemies
  theme.rs           # player_ghost, enemy_vision colors
tests/
  detection_integration.rs  # End-to-end detection test
```

### Key Types (Implemented)
```rust
/// Detection configuration (in core::detection)
pub struct DetectionConfig {
    pub model: DetectionModel,      // DiscreteDelay or LightCone
    pub delay_turns: i32,           // k value for discrete delay
    pub vision_radius: i32,         // max detection distance
}

/// Result of detection check
pub struct DetectionResult {
    pub enemy_id: EntityId,
    pub enemy_position: Position,
    pub player_position: Position,
}

/// World line extensions
impl WorldLine {
    pub fn positions_at_time_with_turn(&self, t: i32) -> Vec<(Position, usize)>;
    pub fn current_position_at_time(&self, t: i32) -> Option<Position>;
    pub fn max_t(&self) -> Option<i32>;
}
```

### Exit Criteria
- [x] Past-turn selves render dimly when player revisits a time slice
- [x] Enemies patrol their paths correctly (via existing PatrolData)
- [x] Vision zones render on grid (danger zones with background color)
- [x] Walking into vision = game over with `Detected` outcome
- [x] Walls block enemy sight (Bresenham + blocks_vision)
- [x] Detection check runs after each action (in finalize_action)

---

## Phase 6: Data Loading & Polish

**Goal:** Load levels/themes from files, complete game loop.

> **Detailed Plan:** `docs/implementation/PHASE_06_DATA_LOADING.md`

### Deliverables

#### 6.1 Level Loading
- [ ] TOML level parser with ASCII map support
- [ ] Level metadata (id, name, author, description)
- [ ] Level config (width, height, max_time, light_speed)
- [ ] Detection config per level (model, delay, radius)
- [ ] Enemy, rift, and box entity definitions in level files

#### 6.2 Theme Loading
- [ ] TOML theme parser with hex colors (#RRGGBB)
- [ ] Theme metadata (name, author)
- [ ] Glyph customization (optional)

#### 6.3 Configuration
- [ ] XDG-compliant config paths (~/.config/he-walks-unseen/)
- [ ] App config (theme, ascii_mode, show_preview, show_danger_zones)
- [ ] Progress tracking (completed levels)

#### 6.4 Bundled Content
- [ ] Default noir theme
- [ ] Tutorial levels: 001_first_steps, 002_the_watcher, 003_time_loop

#### 6.5 CLI Integration
- [ ] `--level <path>` loads specific level
- [ ] `--theme <name>` applies custom theme
- [ ] `--campaign` starts sequential progression

### Files Created
```
src/data/
  mod.rs           # Module exports
  config.rs        # App config, progress, paths
  level.rs         # Level TOML parser
  theme.rs         # Theme TOML parser
data/
  themes/noir.toml
  levels/001_first_steps.toml
  levels/002_the_watcher.toml
  levels/003_time_loop.toml
```

### Exit Criteria
- [ ] Game loads level from TOML file
- [ ] Theme colors apply from TOML file
- [ ] ASCII map parsing creates correct TimeCube
- [ ] Detection config from level applies to game
- [ ] User can create custom levels with documentation

---

## Future Phases (Post-MVP)

### Phase 7: Rift Mechanics
- Time travel via rifts
- Grandfather paradox detection
- Multi-timeline visualization

### Phase 8: Advanced Features
- Pushable objects with propagation
- More enemy types
- Procedural level generation

### Phase 9: Distribution
- napi-rs bridge
- npm package
- Cross-platform binaries

### Phase 10: Polish
- Sound effects (optional)
- Animations
- Tutorial levels
- Leaderboards

---

## Dependency Graph

```
Phase 1 (Foundation)
    │
    ▼
Phase 2 (Core Data)
    │
    ├──────────────────┐
    ▼                  ▼
Phase 3 (Movement)   Phase 4 (Rendering)
    │                  │
    └────────┬─────────┘
             ▼
      Phase 5 (Light Cone & World Line)
             │
             ▼
      Phase 6 (Data Loading)
```

Phases 3 and 4 can be developed in parallel after Phase 2.

---

## Risk Areas

| Risk | Mitigation |
|------|------------|
| Light cone math complexity | Start with Manhattan distance, add Euclidean later |
| Grandfather paradox detection | Defer to Phase 7, focus on self-intersection first |
| Terminal compatibility | ASCII fallback from day one |
| Performance with large cubes | Benchmark early, optimize propagation if needed |

---

## Success Metrics

### MVP Complete (End of Phase 6)
- [ ] Player can complete at least 3 levels
- [ ] Light cone vision works correctly
- [ ] Custom themes load from config
- [ ] No crashes during normal gameplay
- [ ] Works on macOS, Linux terminals
