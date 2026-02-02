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

## Phase 5: Light Cone Vision

**Goal:** Enemies with vision cones, fail state when detected.

### Deliverables
- [ ] `LightCone` calculation: given enemy position, which past player positions are visible?
- [ ] `check_detection()`: returns true if any enemy sees the player
- [ ] Vision rendering: show danger zones on grid
- [ ] Fail state: game over when detected
- [ ] Enemy patrol: enemies follow `Patrol` component paths
- [ ] `BlocksVision` support: walls block line of sight

### Files Created
```
src/core/
  light_cone.rs
  patrol.rs
src/render/
  vision.rs
```

### Key Algorithm
```rust
fn is_visible(
    player_pos: Position,      // (px, py, tp)
    enemy_pos: Position,       // (ex, ey, te)
    light_speed: i32,          // c
    blockers: &[Position],     // BlocksVision entities
) -> bool {
    if te <= tp { return false; }
    let distance = manhattan(player_pos, enemy_pos);
    let time_delta = te - tp;
    if distance > light_speed * time_delta { return false; }
    !is_blocked(player_pos, enemy_pos, blockers)
}
```

### Exit Criteria
- Enemies patrol their paths
- Vision cones render on grid
- Walking into vision = game over
- Walls block enemy sight

---

## Phase 6: Data Loading & Polish

**Goal:** Load levels/themes from files, complete game loop.

### Deliverables
- [ ] TOML level parser
- [ ] TOML theme parser
- [ ] Config file support (`~/.config/he-walks-unseen/`)
- [ ] Bundled default levels and theme
- [ ] Level select menu (or sequential progression)
- [ ] Win condition: reach exit tile
- [ ] Ghosting: show `t-1` and `t+1` entities dimly
- [ ] Move preview: show outcome before committing
- [ ] ASCII/Unicode mode toggle

### Files Created
```
src/data/
  mod.rs
  config.rs
  level.rs
  theme.rs
  entity_defs.rs
data/
  entities.toml
  themes/noir.toml
  levels/001_first_steps.toml
```

### Exit Criteria
- Game loads level from TOML file
- Theme colors apply correctly
- Completing a level shows success
- User can create custom levels

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
      Phase 5 (Light Cone)
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
