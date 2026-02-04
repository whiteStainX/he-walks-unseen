# Design Document: He Walks Unseen

## 1. Executive Summary

**"He Walks Unseen"** is a terminal-based, turn-based puzzle stealth game. It moves away from traditional roguelike stats/combat to focus on **temporal architecture**.

The core innovation is treating **Time as a spatial dimension**. The player navigates a 3D Space-Time Cube to manipulate cause and effect, solving deterministic puzzles where the goal is not just to reach the exit, but to engineer a timeline where reaching the exit is possible.

**Roguelike Element:** No undo. Every move is committed until level reset.

---

## 2. Core Concept & Mechanics

### 2.1 The Mental Model: The Space-Time Cube

The game world is modeled as a static 3D volume:

- **X / Y Axis:** Physical 2D Space (The Room).
- **Z Axis:** Time (The Timeline).
- **Logic:** "Gravity" falls **UP** (from Past to Future). An object placed at `t` naturally propagates to `t+1` unless moved again.

**Key Insight:** The player is a **3D creature** navigating this cube. All other entities (enemies, objects) are **2D creatures** — they exist only within their time slice unless the player interacts with them.

### 2.2 The "Pure" Gameplay Loop

- **Genre:** Turn-based Puzzle (Reference: _Hitman Go_, _Timelie_).
- **Goal:** **"Establish the Path."** Reach the Exit Tile at any valid Time layer without creating a paradox.
- **Enemies:** Deterministic "Time Snakes." They follow rigid patrol patterns. They occupy specific `(x, y, t)` coordinates.
- **The Player:** Can move in Space (X/Y) or, via specific "Rifts," move in Time (Z).
- **World State:** Changes propagate instantly — pushing a box at `t=5` immediately recalculates `t=6,7,8...` (the "spreadsheet model").

### 2.3 Paradox Rules

Paradoxes are handled by **prevention, not resolution** — invalid moves are simply disallowed:

1. **Self-Intersection Paradox:** The player cannot occupy an `(x, y, t)` coordinate where their past or future self exists. The player's path through the cube is their "world line" — it cannot cross itself.

2. **Grandfather Paradox:** Any action that would prevent the cause of that action is an invalid move. The game state must remain internally consistent.

### 2.4 The "Unseen" Mechanic: Light Cone Vision

Enemies perceive the world through **causal light cones**, not instant awareness:

- An enemy at distance `d` from the player sees the player's position from `⌈d/c⌉` turns ago, where `c` is the "speed of light" (a configurable game parameter, e.g., 3 tiles/turn).
- **Close range:** Enemy reacts almost instantly → high danger.
- **Far range:** Enemy sees where you *were*, not where you *are* → escape window.

**Fail State:** The player's past position enters an enemy's vision cone at the moment that information "reaches" the enemy.

**Success:** Exploit causality — move fast enough that you're gone before you're "seen," or manipulate past events to alter enemy patrol routes.

### 2.5 Time Rifts

Time Rifts are **fixed map elements** (like tunnels or transports in _Hitman Go_), not player abilities:

- Rifts connect specific `(x, y, t)` coordinates to other `(x', y', t')` coordinates.
- They are part of level design, not freely triggered by the player.
- Rifts may be one-way or bidirectional, depending on the puzzle.

### 2.6 Controls

- **Input:** Minimalist.
- **Directional (WASD/Arrows):** Move in space within the current Time slice.
- **Action (Space/Enter):** Interact with Rifts (Time Travel) or World Objects (Push/Pull/Wait).

---

## 3. Technical Architecture

### 3.1 The "Hybrid" Stack

A high-performance native core wrapped in a modern web-friendly distribution method.

| Component        | Technology              | Rationale                                                                                                                                                             |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core Engine**  | **Rust**                | Best-in-class TUI ecosystem, memory safety for complex state management, high performance on ARM64 (Mac mini M4).                                                     |
| **Rendering**    | **Ratatui** + Crossterm | Industry standard for Rust TUIs. Immediate mode rendering fits the "Game Loop" perfectly.                                                                             |
| **Bridge**       | **napi-rs**             | Compiles Rust code into a Node.js binary addon (`.node`). Zero overhead.                                                                                              |
| **Distribution** | **npm**                 | Allows users to install via `npm install -g he-walks-unseen`. Platform-specific binaries (Windows/Linux/Mac) are downloaded automatically via `optionalDependencies`. |

### 3.2 Data Structures

- **`TimeSlice`:** A 2D grid representing the world at a specific tick `t`.
- **`TimeCube` (The World):** A `Vec<TimeSlice>` or a sparse `HashMap<(x,y,t), Entity>`.
- **Entity Identity:** Objects share a UUID across time layers to track continuity (e.g., "Box #42" at `t=0` is the same instance as "Box #42" at `t=5`).
- **`WorldLine`:** The player's path through the cube — a sequence of `(x, y, t)` coordinates that cannot self-intersect.

### 3.3 Entity-Component System (ECS)

**Design Principle:** Modularity for future expansion. The player is a 3D entity; all others are 2D.

```
Entity = ID + Components
```

**Core Components:**
| Component         | Description                                      |
| ----------------- | ------------------------------------------------ |
| `Position`        | `(x, y, t)` coordinate in the Space-Time Cube    |
| `Pushable`        | Can be pushed by the player                      |
| `Pullable`        | Can be pulled by the player                      |
| `BlocksMovement`  | Solid — prevents entities from passing through   |
| `BlocksVision`    | Opaque — blocks enemy light cones                |
| `TimePersistent`  | Propagates forward through time automatically    |
| `Patrol(path)`    | Follows a deterministic path (enemies)           |
| `VisionCone(c)`   | Emits a light cone with speed `c` (enemies)      |
| `Rift(target)`    | Teleports player to `target` coordinate          |

New behaviors are added by composing components, not modifying core logic.

### 3.4 Algorithms

- **Space-Time A\* (STA\*):**
  - Used for Player movement validation ("Can I get there?").
  - Used for Enemy patrol planning ("Where does the guard go?").
  - Unlike standard A\*, neighbors include `t+1` (Wait) and `t±n` (Time Jump via Rifts).

- **Causal Propagation Engine:**
  - When an entity is modified at time `t`, recompute all `t' > t` slices.
  - Efficient: only recompute affected cells, not the entire cube.
  - Detects grandfather paradoxes during propagation (action invalidates its own cause → reject move).

- **Light Cone Collision Detection:**
  - For each enemy, compute which past player positions are currently "visible."
  - Formula: Player at `(px, py, tp)` is visible to enemy at `(ex, ey, te)` if:
    - `te > tp` (enemy is in the future relative to player position)
    - `distance(px, py, ex, ey) ≤ c × (te - tp)` (within light cone)
    - Line of sight is not blocked by `BlocksVision` entities.

- **Reverse Propagation Generator:**
  - Used to procedurally generate levels.
  - Logic: Start with the Solution → Add Obstacles (Enemies) → Add Tools (Time Rifts) to fix the now-broken path.

---

## 4. Visual Language (TUI)

Since the terminal is 2D, we project the 3D data creatively.

### 4.1 Core Visual Elements

- **Main View:** The Current Time Slice (`t = current`).
- **Adjacent Slice Ghosting:** Objects from `t-1` (immediate past) or `t+1` (immediate future) rendered in dim colors to show trajectory across adjacent time slices.
- **Past-Turn Selves:** When the player revisits a time slice via rift, multiple player positions appear on the same slice. The current-turn self (controllable) is bright; past-turn selves (fixed echoes) are dim. See MATH_MODEL.md Section 10.
- **The "Stack" Indicator:** A sidebar gauge showing the player's current depth in the Z-axis (Time).
- **Rifts:** Glitched characters representing tiles where Time Travel is possible.
- **Light Cone Preview:** Before committing a move, show which enemy light cones the player's new position would enter.
- **World Line Trail:** Faint markers showing the player's past positions that are still "propagating" through enemy light cones.

### 4.2 Aesthetic: "Terminal Noir"

**Design Principles:**
- High contrast: bright entities on dark background
- Monochromatic base with accent colors for key elements
- Clean symbols — no excessive decoration
- Focus on readability and immediate comprehension

**Default Color Palette:**

| Element | Color | Rationale |
|---------|-------|-----------|
| Background | Near-black (`#0a0a0a`) | Maximum contrast base |
| Player | Cyan | Protagonist — current-turn self, must stand out |
| Player Ghost | Dim Cyan | Past-turn selves and adjacent-slice ghosts |
| Enemy | Red | Danger — universal signal |
| Enemy Vision | Dim Red | Subtle threat zone |
| Wall | Gray | Solid, neutral |
| Floor | Dark Gray | Recedes visually |
| Rift | Magenta | Otherworldly, stands out |
| Exit | Green | Goal — positive signal |
| Pushable Object | Yellow | Interactive |
| Light Cone Edge | Dim Red gradient | Gradient of danger |

### 4.3 Symbol Sets

Two symbol modes for terminal compatibility:

| Element | Unicode Mode | ASCII Fallback |
|---------|--------------|----------------|
| Player | `@` | `@` |
| Enemy | `▼` | `V` |
| Wall | `█` | `#` |
| Floor | ` ` | `.` |
| Rift | `◊` | `%` |
| Exit | `▣` | `X` |
| Pushable | `□` | `o` |
| Vision Cone | `░` | `:` |
| World Line | `·` | `.` |

The game auto-detects Unicode support and falls back gracefully. Users can force ASCII mode in settings.

### 4.4 UI Layout

```
┌─────────────────────────┬──────────┐
│                         │ t = 12   │
│      GAME GRID          │ ████░░░░ │
│        20x20            │          │
│                         │ [Rifts]  │
│                         │ A → B    │
│                         │          │
├─────────────────────────┴──────────┤
│ > Move preview: Safe               │
└────────────────────────────────────┘
```

- **Left panel:** Main game grid (current time slice)
- **Right panel:** Time stack indicator, rift connections, entity info
- **Bottom bar:** Move preview, warnings, contextual hints

---

## 5. Data-Driven Architecture

**Core Principle:** Separate data from logic. Game content (levels, themes, entities) lives in configuration files, not code. This enables:

- Rapid puzzle iteration without recompilation
- User customization (themes, keybindings)
- Future level editor support
- Hot-reloading during development

### 5.1 Configuration Location

```
~/.config/he-walks-unseen/
├── config.toml          # Master settings
├── themes/
│   ├── noir.toml        # Default theme
│   └── custom.toml      # User themes
├── levels/
│   └── custom/          # User-created levels
└── keybindings.toml     # Key remapping
```

All settings are accessible both via config files AND in-game UI. The game watches for file changes and hot-reloads where safe.

### 5.2 Supported Formats

Both **TOML** and **JSON** are supported for all data files:
- TOML: Human-readable, preferred for hand-editing
- JSON: Machine-friendly, preferred for generated content

The engine auto-detects format by file extension (`.toml` / `.json`).

### 5.3 Theme Definition

**Example: `themes/noir.toml`**
```toml
[meta]
name = "Terminal Noir"
author = "default"

[colors]
background = "#0a0a0a"
player = "#00ffff"
player_ghost = "#004444"
enemy = "#ff3333"
enemy_vision = "#331111"
wall = "#666666"
floor = "#1a1a1a"
rift = "#ff00ff"
exit = "#00ff00"
pushable = "#ffff00"

[symbols]
mode = "unicode"  # or "ascii"
player = "@"
enemy = "▼"
wall = "█"
floor = " "
rift = "◊"
exit = "▣"
pushable = "□"
vision = "░"
```

### 5.4 Level Definition

**Example: `levels/001_first_steps.toml`**
```toml
[meta]
id = "001"
name = "First Steps"
author = "default"
difficulty = 1

[world]
width = 20
height = 20
time_depth = 20
light_speed = 3

# Grid can be inline ASCII or coordinate list
[grid]
format = "ascii"
data = """
####################
#..................#
#..@...............#
#..................#
#..................#
#.........E........#
#..................#
#..................#
#..................#
#...◊..............#
#..................#
#..................#
#..................#
#..................#
#..................#
#..................#
#..................#
#.................X#
#..................#
####################
"""

# Or explicit entity placement (overrides grid)
[[entities]]
type = "enemy"
id = "guard_1"
position = [10, 5, 0]
components = ["Patrol", "VisionCone"]

[entities.patrol]
path = [[10, 5], [10, 10], [15, 10], [15, 5]]
loop = true

[entities.vision]
light_speed = 3
direction = "south"

[[entities]]
type = "rift"
id = "rift_1"
position = [4, 9, 0]
target = [4, 9, 15]
bidirectional = false
```

### 5.5 Entity Definitions

Entity types and their default components are defined in data:

**Example: `data/entities.toml`**
```toml
[player]
symbol = "@"
color = "player"
components = ["Position", "WorldLine"]

[enemy]
symbol = "enemy"
color = "enemy"
components = ["Position", "Patrol", "VisionCone", "TimePersistent"]

[wall]
symbol = "wall"
color = "wall"
components = ["Position", "BlocksMovement", "BlocksVision", "TimePersistent"]

[box]
symbol = "pushable"
color = "pushable"
components = ["Position", "Pushable", "BlocksMovement", "TimePersistent"]

[rift]
symbol = "rift"
color = "rift"
components = ["Position", "Rift"]

[exit]
symbol = "exit"
color = "exit"
components = ["Position"]
```

### 5.6 Master Configuration

**Example: `config.toml`**
```toml
[display]
theme = "noir"
symbol_mode = "auto"  # "auto", "unicode", "ascii"
fps = 60

[gameplay]
show_light_cones = true
show_move_preview = true
show_world_line = true

[audio]
enabled = false  # Future feature

[paths]
levels = "~/.config/he-walks-unseen/levels"
themes = "~/.config/he-walks-unseen/themes"
```

---

## 6. Level Specifications

### 6.1 Dimensions

- **Spatial Grid:** 20×20 tiles (scalable by design).
- **Time Depth:** Variable per level (e.g., 20-50 time slices).
- **Light Speed (`c`):** Configurable per level (default: 3 tiles/turn). Lower = harder (enemies react faster).

### 6.2 Scalability Requirements

The architecture must support:
- Larger grids (up to 100×100) for future expansions.
- Deeper time stacks (up to 200 slices) for complex puzzles.
- Multiple concurrent enemy light cones without performance degradation.

---

## 7. Feasibility Assessment

- **Logic:** **Solid.** Moving to a grid-based, deterministic system removes the "simulation chaos" of the previous design. Paradoxes become simple collision checks (self-intersection) or propagation failures (grandfather paradox).
- **Performance:** **High.** The "Space-Time Cube" is essentially a large lookup table. Rust will handle this at extremely high frame rates. Causal propagation can be optimized via dirty-flag tracking.
- **Scope:** **Manageable.** The "Pure" design philosophy limits feature creep (no RPG stats, no dialogue trees), allowing focus on the core puzzle engine.
- **Complexity:** **Contained.** The ECS architecture ensures new mechanics (new object types, new enemy behaviors) can be added without refactoring core systems.
- **Extensibility:** **Strong.** Data-driven architecture means content iteration (levels, themes, entities) requires no code changes. Hot-reload support accelerates development.
