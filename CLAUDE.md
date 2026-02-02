# Claude Code Reference: He Walks Unseen

## Project Overview

A terminal-based, turn-based puzzle stealth game where time is a spatial dimension. The player navigates a 3D Space-Time Cube to reach the exit without being detected by enemies who perceive through causal light cones.

**Design Document:** `docs/design/OVERALL.md`

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Core Engine | Rust | Game logic, state management |
| TUI Rendering | Ratatui + Crossterm | Terminal UI |
| Bridge | napi-rs | Node.js addon compilation |
| Distribution | npm | Cross-platform installation |
| Config Format | TOML + JSON | Data-driven content |

---

## Project Structure

```
he-walks-unseen/
├── CLAUDE.md                    # This file
├── AGENTS.md                    # Multi-agent workflow reference
├── Cargo.toml                   # Rust workspace config
├── src/
│   ├── lib.rs                   # Library root
│   ├── main.rs                  # Binary entry point
│   ├── core/                    # Core game logic
│   │   ├── mod.rs
│   │   ├── time_cube.rs         # TimeCube, TimeSlice
│   │   ├── entity.rs            # Entity + Components (ECS)
│   │   ├── world_line.rs        # Player path tracking
│   │   ├── propagation.rs       # Causal propagation engine
│   │   └── light_cone.rs        # Vision cone collision
│   ├── game/                    # Game loop and state
│   │   ├── mod.rs
│   │   ├── state.rs             # GameState management
│   │   ├── input.rs             # Input handling
│   │   ├── actions.rs           # Move, push, rift, wait
│   │   └── validation.rs        # Paradox detection
│   ├── render/                  # TUI rendering
│   │   ├── mod.rs
│   │   ├── app.rs               # Ratatui app
│   │   ├── grid.rs              # Game grid rendering
│   │   ├── sidebar.rs           # Time stack, info panel
│   │   ├── preview.rs           # Move preview overlay
│   │   └── theme.rs             # Theme application
│   ├── data/                    # Data loading
│   │   ├── mod.rs
│   │   ├── config.rs            # Master config
│   │   ├── level.rs             # Level parsing
│   │   ├── theme.rs             # Theme parsing
│   │   └── entity_defs.rs       # Entity definitions
│   └── bridge/                  # napi-rs bindings (later)
│       └── mod.rs
├── data/                        # Bundled game data
│   ├── entities.toml            # Default entity definitions
│   ├── themes/
│   │   └── noir.toml            # Default theme
│   └── levels/
│       ├── 001_first_steps.toml
│       └── ...
├── docs/
│   ├── design/
│   │   └── OVERALL.md           # Game design document
│   └── implementation/
│       └── PLAN.md              # Implementation phases
└── tests/
    ├── core/                    # Unit tests for core logic
    └── integration/             # Full game flow tests
```

---

## Key Concepts

### Space-Time Cube
- 3D grid: X/Y = space, Z = time
- Player is a 3D creature (moves through time)
- Other entities are 2D (exist in time slices)

### World Line
- Player's path through the cube: `Vec<(x, y, t)>`
- Cannot self-intersect (paradox)

### Causal Propagation
- Changes at time `t` recalculate all `t' > t`
- Spreadsheet model: instant, deterministic

### Light Cone Vision
- Enemy at `(ex, ey, te)` sees player at `(px, py, tp)` if:
  - `te > tp`
  - `distance ≤ c × (te - tp)`
  - Line of sight not blocked

---

## Coding Conventions

### Rust Style
- Follow `rustfmt` defaults
- Use `clippy` with `#![warn(clippy::all)]`
- Prefer `Result<T, E>` over panics
- Use `thiserror` for error types

### Naming
- Types: `PascalCase` (`TimeCube`, `WorldLine`)
- Functions/methods: `snake_case` (`validate_move`, `propagate_changes`)
- Constants: `SCREAMING_SNAKE_CASE` (`DEFAULT_LIGHT_SPEED`)
- Modules: `snake_case` (`time_cube`, `light_cone`)

### Architecture Principles
- **Data-driven:** Game content in TOML/JSON, not code
- **ECS-like:** Entities = ID + Components
- **Immutable core:** Game state transitions return new state
- **Separation:** Core logic has no rendering dependencies

### Error Handling
```rust
// Define domain errors
#[derive(Debug, thiserror::Error)]
pub enum GameError {
    #[error("Invalid move: {0}")]
    InvalidMove(String),
    #[error("Paradox detected: {0}")]
    Paradox(ParadoxType),
    #[error("Level load failed: {0}")]
    LevelLoad(#[from] std::io::Error),
}
```

### Testing
- Unit tests in same file: `#[cfg(test)] mod tests { ... }`
- Integration tests in `tests/`
- Test paradox detection exhaustively
- Test light cone edge cases

---

## Commands

```bash
# Build
cargo build --release

# Run
cargo run

# Test
cargo test

# Lint
cargo clippy

# Format
cargo fmt

# Watch mode (requires cargo-watch)
cargo watch -x run
```

---

## Configuration Paths

| Path | Purpose |
|------|---------|
| `~/.config/he-walks-unseen/config.toml` | Master settings |
| `~/.config/he-walks-unseen/themes/` | User themes |
| `~/.config/he-walks-unseen/levels/` | User levels |
| `~/.config/he-walks-unseen/keybindings.toml` | Key remapping |

---

## Implementation Notes

### Phase Priority
1. Core data structures (TimeCube, Entity, WorldLine)
2. Paradox detection (self-intersection, grandfather)
3. Basic rendering (grid, player, walls)
4. Movement + propagation
5. Light cone vision
6. Data loading (levels, themes)
7. Polish (UI, hot-reload)
8. Distribution (napi-rs, npm)

### Performance Targets
- 60 FPS rendering
- <1ms per move validation
- <10ms for full propagation (20×20×50 cube)

### Known Complexity Areas
- Grandfather paradox detection during propagation
- Light cone collision with `BlocksVision` entities
- Hot-reload without losing game state

---

## References

- [Ratatui Documentation](https://ratatui.rs/)
- [Crossterm Documentation](https://docs.rs/crossterm/)
- [napi-rs Guide](https://napi.rs/)
- Design Document: `docs/design/OVERALL.md`
