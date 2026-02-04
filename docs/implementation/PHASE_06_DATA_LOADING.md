# Phase 6: Data Loading & Polish

> **Depends on:** Phase 5 (Light Cone Vision)
> **Enables:** Phase 7 (Rift Mechanics), MVP completion
> **Design Reference:** `docs/design/OVERALL.md` (Level Format, Theme System)

---

## Overview

This phase transforms the game from hardcoded test scenarios into a data-driven experience. Players can load levels from TOML files, customize themes, and progress through a campaign.

**Goal:** Answer these questions:
- "How do I create a custom level?"
- "How do I change the game's appearance?"
- "How do I play through multiple levels?"

**Non-Goals (Phase 6):**
- Procedural level generation (Phase 8)
- Level editor UI (future)
- Online level sharing (future)

---

## File Structure

```
src/data/
├── mod.rs             # NEW: Module exports
├── config.rs          # NEW: Master config loading (~/.config/...)
├── level.rs           # NEW: Level TOML parser
├── theme.rs           # NEW: Theme TOML parser
└── entity_defs.rs     # NEW: Entity definition loading (optional)

data/                  # Bundled game data
├── entities.toml      # Default entity definitions
├── themes/
│   └── noir.toml      # Default theme
└── levels/
    ├── 001_first_steps.toml
    ├── 002_the_watcher.toml
    └── 003_time_loop.toml
```

---

## Critical Design Decisions

### Level Format: TOML with ASCII Art

**Problem:** How should levels be defined?

**Chosen Solution:** TOML with inline ASCII art for the map, plus metadata sections.

**Rationale:**
- ASCII art is intuitive for level designers
- TOML is human-readable and well-supported in Rust
- Metadata (name, detection config) separate from map data

**Level File Structure:**
```toml
[meta]
id = "001_first_steps"
name = "First Steps"
author = "Default"
description = "Learn the basics of movement and time."

[config]
width = 20
height = 10
max_time = 50
light_speed = 3

[detection]
model = "discrete_delay"  # or "light_cone"
delay_turns = 2
vision_radius = 8

[map]
# Legend: . = floor, # = wall, @ = player, > = exit, E = enemy, O = rift, B = box
data = """
####################
#..................#
#..@...............#
#..................#
#......###.........#
#......#E#.........#
#......###.........#
#..................#
#.................>#
####################
"""

[[enemies]]
id = "guard_1"
x = 7
y = 5
patrol = [[7, 5], [10, 5], [10, 8], [7, 8]]
loops = true
light_speed = 3
fov_degrees = 360

[[rifts]]
x = 5
y = 3
target_x = 15
target_y = 7
target_t = 0
bidirectional = false

[[boxes]]
x = 12
y = 4
pushable = true
pullable = false
```

### Theme Format: TOML Colors

**Theme File Structure:**
```toml
[meta]
name = "Noir"
author = "Default"

[colors]
bg = "#000000"
fg = "#808080"
wall = "#404040"
player = "#00FFFF"
player_ghost = "#004040"
enemy = "#FF0000"
enemy_vision = "#330011"
exit = "#00FF00"
rift = "#FF00FF"
box = "#FFFF00"
accent = "#0000FF"

[glyphs]
# NOTE: Glyphs are defined in TOML for future support.
# Phase 6 does not apply glyph overrides yet (render uses hardcoded glyphs).
player = "@"
wall = "█"
floor = "."
enemy = "E"
exit = ">"
rift = "O"
box = "□"
```

### Config Paths

**Problem:** Where do config files live?

**Chosen Solution:** XDG-compliant paths with fallback.

| Platform | Config Directory |
|----------|------------------|
| Linux/macOS | `~/.config/he-walks-unseen/` |
| Windows | `%APPDATA%\he-walks-unseen\` |

**Directory Structure:**
```
~/.config/he-walks-unseen/
├── config.toml          # Master settings
├── progress.toml        # Level completion tracking
├── themes/              # User themes
│   └── custom.toml
└── levels/              # User levels
    └── my_level.toml
```

**Config Priority (highest to lowest):**
1. Command-line arguments
2. User config (`~/.config/...`)
3. Bundled defaults (`data/`)

### Level Loading Flow

```
1. Parse command line (--level path or --campaign)
2. If single level:
   a. Load level TOML
   b. Parse map ASCII art
   c. Create entities from map + enemy/rift/box sections
   d. Build TimeCube
   e. Apply detection config
   f. Start GameState
3. If campaign:
   a. Load progress.toml
   b. Find next uncompleted level
   c. Load that level
   d. On win, update progress and load next
```

---

## Implementation Tasks

### 6.1 Data Module Setup

**File:** `src/data/mod.rs`

```rust
//! Data loading for levels, themes, and configuration.

pub mod config;
pub mod level;
pub mod theme;

pub use config::{AppConfig, load_config};
pub use level::{LevelData, load_level};
pub use theme::{ThemeData, load_theme};
```

### 6.1a Render Theme Injection (Required)

**Problem:** `RenderApp` currently owns `Theme` internally and cannot accept a loaded theme.

**Task:** Add a constructor or setter to inject a theme, e.g.:
```rust
impl RenderApp {
    pub fn with_theme(game: GameState, theme: Theme) -> Self { /* ... */ }
}
```

Update `main.rs` wiring to pass the loaded theme.

### 6.2 Level Parser

**File:** `src/data/level.rs`

```rust
//! Level loading from TOML files.

use std::path::Path;
use serde::Deserialize;
use crate::core::{
    DetectionConfig, DetectionModel, Entity, PatrolData, Position, RiftData, SpatialPos, TimeCube,
    VisionData, Direction,
};
use crate::game::GameConfig;

/// Raw level data from TOML.
#[derive(Debug, Deserialize)]
pub struct LevelData {
    pub meta: LevelMeta,
    pub config: LevelConfig,
    #[serde(default)]
    pub detection: DetectionData,
    pub map: MapData,
    #[serde(default)]
    pub enemies: Vec<EnemyData>,
    #[serde(default)]
    pub rifts: Vec<RiftDataRaw>,
    #[serde(default)]
    pub boxes: Vec<BoxData>,
}

#[derive(Debug, Deserialize)]
pub struct LevelMeta {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub author: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct LevelConfig {
    pub width: i32,
    pub height: i32,
    #[serde(default = "default_max_time")]
    pub max_time: i32,
    #[serde(default = "default_light_speed")]
    pub light_speed: u32,
}

fn default_max_time() -> i32 { 50 }
fn default_light_speed() -> u32 { 3 }

#[derive(Debug, Deserialize, Default)]
pub struct DetectionData {
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default = "default_delay")]
    pub delay_turns: i32,
    #[serde(default = "default_radius")]
    pub vision_radius: i32,
}

fn default_model() -> String { "discrete_delay".to_string() }
fn default_delay() -> i32 { 2 }
fn default_radius() -> i32 { 8 }

#[derive(Debug, Deserialize)]
pub struct MapData {
    pub data: String,
}

#[derive(Debug, Deserialize)]
pub struct EnemyData {
    pub id: String,
    pub x: i32,
    pub y: i32,
    pub patrol: Vec<[i32; 2]>,
    #[serde(default = "default_true")]
    pub loops: bool,
    #[serde(default = "default_light_speed")]
    pub light_speed: u32,
    #[serde(default = "default_fov")]
    pub fov_degrees: u32,
    #[serde(default)]
    pub facing: String,
}

fn default_true() -> bool { true }
fn default_fov() -> u32 { 360 }

#[derive(Debug, Deserialize)]
pub struct RiftDataRaw {
    pub x: i32,
    pub y: i32,
    pub target_x: i32,
    pub target_y: i32,
    #[serde(default)]
    pub target_t: i32,
    #[serde(default)]
    pub bidirectional: bool,
}

#[derive(Debug, Deserialize)]
pub struct BoxData {
    pub x: i32,
    pub y: i32,
    #[serde(default = "default_true")]
    pub pushable: bool,
    #[serde(default)]
    pub pullable: bool,
}

/// Errors during level loading.
#[derive(Debug, thiserror::Error)]
pub enum LevelError {
    #[error("Failed to read level file: {0}")]
    Io(#[from] std::io::Error),
    #[error("Failed to parse level TOML: {0}")]
    Parse(#[from] toml::de::Error),
    #[error("Invalid map data: {0}")]
    InvalidMap(String),
    #[error("No player spawn found in map")]
    NoPlayer,
    #[error("Multiple player spawns found in map")]
    MultiplePlayers,
    #[error("No exit found in map")]
    NoExit,
}

/// Load a level from a TOML file.
pub fn load_level(path: impl AsRef<Path>) -> Result<LevelData, LevelError> {
    let content = std::fs::read_to_string(path)?;
    let level: LevelData = toml::from_str(&content)?;
    Ok(level)
}

/// Build a TimeCube and GameConfig from level data.
pub fn build_level(data: &LevelData) -> Result<(TimeCube, GameConfig), LevelError> {
    let mut cube = TimeCube::new(
        data.config.width,
        data.config.height,
        data.config.max_time,
    );

    // Parse map ASCII art
    let (player_pos, exit_pos, walls) = parse_map(&data.map.data, data.config.width, data.config.height)?;

    // Spawn player
    cube.spawn(Entity::player(player_pos))
        .map_err(|e| LevelError::InvalidMap(e.to_string()))?;

    // Spawn exit (propagate through time)
    cube.spawn_and_propagate(Entity::exit(exit_pos))
        .map_err(|e| LevelError::InvalidMap(e.to_string()))?;

    // Spawn walls
    for wall_pos in walls {
        cube.spawn_and_propagate(Entity::wall(wall_pos))
            .map_err(|e| LevelError::InvalidMap(e.to_string()))?;
    }

    // Spawn enemies (time-persistent; propagated below)
    for enemy_data in &data.enemies {
        let patrol_path: Vec<SpatialPos> = enemy_data.patrol
            .iter()
            .map(|[x, y]| SpatialPos::new(*x, *y))
            .collect();
        let patrol = PatrolData::new(patrol_path, enemy_data.loops);
        let facing = parse_direction(&enemy_data.facing);
        let vision = VisionData::with_fov(enemy_data.light_speed, facing, enemy_data.fov_degrees);
        let enemy = Entity::enemy(Position::new(enemy_data.x, enemy_data.y, 0), patrol, vision);
        cube.spawn(enemy)
            .map_err(|e| LevelError::InvalidMap(e.to_string()))?;
    }

    // Spawn rifts
    for rift_data in &data.rifts {
        let target = Position::new(rift_data.target_x, rift_data.target_y, rift_data.target_t);
        let rift = Entity::rift(
            Position::new(rift_data.x, rift_data.y, 0),
            target,
            rift_data.bidirectional,
        );
        cube.spawn_and_propagate(rift)
            .map_err(|e| LevelError::InvalidMap(e.to_string()))?;
    }

    // Spawn boxes
    for box_data in &data.boxes {
        let pos = Position::new(box_data.x, box_data.y, 0);
        let entity = if box_data.pullable {
            Entity::pullable_box(pos)
        } else {
            Entity::pushable_box(pos)
        };
        cube.spawn_and_propagate(entity)
            .map_err(|e| LevelError::InvalidMap(e.to_string()))?;
    }

    // Propagate all time-persistent entities (required for enemies/boxes)
    cube.propagate_all()
        .map_err(|e| LevelError::InvalidMap(e.to_string()))?;

    // Build game config
    let detection_model = match data.detection.model.as_str() {
        "light_cone" => DetectionModel::LightCone,
        _ => DetectionModel::DiscreteDelay,
    };

    let config = GameConfig {
        light_speed: data.config.light_speed,
        level_name: data.meta.name.clone(),
        level_id: data.meta.id.clone(),
        detection: DetectionConfig {
            model: detection_model,
            delay_turns: data.detection.delay_turns,
            vision_radius: data.detection.vision_radius,
        },
        ..Default::default()
    };

    Ok((cube, config))
}

/// Parse ASCII map into entities.
fn parse_map(data: &str, width: i32, height: i32) -> Result<(Position, Position, Vec<Position>), LevelError> {
    let mut player_pos: Option<Position> = None;
    let mut exit_pos: Option<Position> = None;
    let mut walls = Vec::new();

    for (y, line) in data.lines().enumerate() {
        if y as i32 >= height {
            break;
        }
        for (x, ch) in line.chars().enumerate() {
            if x as i32 >= width {
                break;
            }
            let pos = Position::new(x as i32, y as i32, 0);
            match ch {
                '@' => {
                    if player_pos.is_some() {
                        return Err(LevelError::MultiplePlayers);
                    }
                    player_pos = Some(pos);
                }
                '>' => {
                    exit_pos = Some(pos);
                }
                '#' | '█' => {
                    walls.push(pos);
                }
                '.' | ' ' => {
                    // Floor, skip
                }
                'E' | 'O' | 'B' => {
                    // Enemies, rifts, boxes handled separately
                }
                _ => {
                    // Unknown character: treat as floor, but record a warning.
                    // Plan: return warnings alongside parse result (Vec<String>).
                }
            }
        }
    }

    let player = player_pos.ok_or(LevelError::NoPlayer)?;
    let exit = exit_pos.ok_or(LevelError::NoExit)?;

    Ok((player, exit, walls))
}

fn parse_direction(s: &str) -> Direction {
    match s.to_lowercase().as_str() {
        "north" | "n" | "up" => Direction::North,
        "south" | "s" | "down" => Direction::South,
        "east" | "e" | "right" => Direction::East,
        "west" | "w" | "left" => Direction::West,
        _ => Direction::North,
    }
}
```

### 6.3 Theme Parser

**File:** `src/data/theme.rs`

```rust
//! Theme loading from TOML files.

use std::path::Path;
use serde::Deserialize;
use ratatui::style::Color;
use crate::render::theme::Theme;

/// Raw theme data from TOML.
#[derive(Debug, Deserialize)]
pub struct ThemeData {
    pub meta: ThemeMeta,
    pub colors: ThemeColors,
    #[serde(default)]
    pub glyphs: ThemeGlyphs,
}

#[derive(Debug, Deserialize)]
pub struct ThemeMeta {
    pub name: String,
    #[serde(default)]
    pub author: String,
}

#[derive(Debug, Deserialize)]
pub struct ThemeColors {
    #[serde(default = "default_bg")]
    pub bg: String,
    #[serde(default = "default_fg")]
    pub fg: String,
    #[serde(default = "default_wall")]
    pub wall: String,
    #[serde(default = "default_player")]
    pub player: String,
    #[serde(default = "default_player_ghost")]
    pub player_ghost: String,
    #[serde(default = "default_enemy")]
    pub enemy: String,
    #[serde(default = "default_enemy_vision")]
    pub enemy_vision: String,
    #[serde(default = "default_exit")]
    pub exit: String,
    #[serde(default = "default_rift")]
    pub rift: String,
    #[serde(default = "default_box")]
    pub box_: String,
    #[serde(default = "default_accent")]
    pub accent: String,
}

fn default_bg() -> String { "#000000".to_string() }
fn default_fg() -> String { "#808080".to_string() }
fn default_wall() -> String { "#404040".to_string() }
fn default_player() -> String { "#00FFFF".to_string() }
fn default_player_ghost() -> String { "#404040".to_string() }
fn default_enemy() -> String { "#FF0000".to_string() }
fn default_enemy_vision() -> String { "#330011".to_string() }
fn default_exit() -> String { "#00FF00".to_string() }
fn default_rift() -> String { "#FF00FF".to_string() }
fn default_box() -> String { "#FFFF00".to_string() }
fn default_accent() -> String { "#0000FF".to_string() }

#[derive(Debug, Deserialize, Default)]
pub struct ThemeGlyphs {
    #[serde(default = "default_player_glyph")]
    pub player: String,
    #[serde(default = "default_wall_glyph")]
    pub wall: String,
    #[serde(default = "default_floor_glyph")]
    pub floor: String,
    #[serde(default = "default_enemy_glyph")]
    pub enemy: String,
    #[serde(default = "default_exit_glyph")]
    pub exit: String,
    #[serde(default = "default_rift_glyph")]
    pub rift: String,
    #[serde(default = "default_box_glyph")]
    pub box_: String,
}

fn default_player_glyph() -> String { "@".to_string() }
fn default_wall_glyph() -> String { "█".to_string() }
fn default_floor_glyph() -> String { ".".to_string() }
fn default_enemy_glyph() -> String { "E".to_string() }
fn default_exit_glyph() -> String { ">".to_string() }
fn default_rift_glyph() -> String { "O".to_string() }
fn default_box_glyph() -> String { "□".to_string() }

/// Errors during theme loading.
#[derive(Debug, thiserror::Error)]
pub enum ThemeError {
    #[error("Failed to read theme file: {0}")]
    Io(#[from] std::io::Error),
    #[error("Failed to parse theme TOML: {0}")]
    Parse(#[from] toml::de::Error),
    #[error("Invalid color format: {0}")]
    InvalidColor(String),
}

/// Load a theme from a TOML file.
pub fn load_theme(path: impl AsRef<Path>) -> Result<ThemeData, ThemeError> {
    let content = std::fs::read_to_string(path)?;
    let theme: ThemeData = toml::from_str(&content)?;
    Ok(theme)
}

/// Convert ThemeData to render Theme.
pub fn build_theme(data: &ThemeData) -> Result<Theme, ThemeError> {
    Ok(Theme {
        bg: parse_color(&data.colors.bg)?,
        fg: parse_color(&data.colors.fg)?,
        wall: parse_color(&data.colors.wall)?,
        player: parse_color(&data.colors.player)?,
        player_ghost: parse_color(&data.colors.player_ghost)?,
        enemy: parse_color(&data.colors.enemy)?,
        enemy_vision: parse_color(&data.colors.enemy_vision)?,
        exit: parse_color(&data.colors.exit)?,
        rift: parse_color(&data.colors.rift)?,
        box_: parse_color(&data.colors.box_)?,
        accent: parse_color(&data.colors.accent)?,
    })
}

/// Parse hex color string to ratatui Color.
fn parse_color(s: &str) -> Result<Color, ThemeError> {
    let s = s.trim_start_matches('#');
    if s.len() != 6 {
        return Err(ThemeError::InvalidColor(s.to_string()));
    }
    let r = u8::from_str_radix(&s[0..2], 16)
        .map_err(|_| ThemeError::InvalidColor(s.to_string()))?;
    let g = u8::from_str_radix(&s[2..4], 16)
        .map_err(|_| ThemeError::InvalidColor(s.to_string()))?;
    let b = u8::from_str_radix(&s[4..6], 16)
        .map_err(|_| ThemeError::InvalidColor(s.to_string()))?;
    Ok(Color::Rgb(r, g, b))
}
```

### 6.4 App Config

**File:** `src/data/config.rs`

```rust
//! Application configuration and paths.

use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use directories::ProjectDirs;

/// Application configuration.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct AppConfig {
    /// Default theme name.
    #[serde(default = "default_theme")]
    pub theme: String,
    /// ASCII mode (no unicode).
    #[serde(default)]
    pub ascii_mode: bool,
    /// Show move preview.
    #[serde(default = "default_true")]
    pub show_preview: bool,
    /// Show danger zones.
    #[serde(default = "default_true")]
    pub show_danger_zones: bool,
}

fn default_theme() -> String { "noir".to_string() }
fn default_true() -> bool { true }

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            theme: default_theme(),
            ascii_mode: false,
            show_preview: true,
            show_danger_zones: true,
        }
    }
}

/// Player progress tracking.
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
pub struct Progress {
    /// Completed level IDs.
    pub completed: Vec<String>,
    /// Current level ID (if mid-campaign).
    pub current_level: Option<String>,
}

/// Get the config directory path.
pub fn config_dir() -> Option<PathBuf> {
    ProjectDirs::from("com", "whitestain", "he-walks-unseen")
        .map(|dirs| dirs.config_dir().to_path_buf())
}

/// Get the data directory path (bundled assets).
pub fn data_dir() -> PathBuf {
    // In development, use local data/ directory
    // In release, this would be embedded or in a known location
    PathBuf::from("data")
}

/// Load app config from file or return default.
pub fn load_config() -> AppConfig {
    let Some(config_path) = config_dir().map(|d| d.join("config.toml")) else {
        return AppConfig::default();
    };

    if !config_path.exists() {
        return AppConfig::default();
    }

    match std::fs::read_to_string(&config_path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => AppConfig::default(),
    }
}

/// Save app config to file.
pub fn save_config(config: &AppConfig) -> Result<(), std::io::Error> {
    let Some(config_dir) = config_dir() else {
        return Ok(());
    };

    std::fs::create_dir_all(&config_dir)?;
    let config_path = config_dir.join("config.toml");
    let content = toml::to_string_pretty(config)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    std::fs::write(config_path, content)
}

/// Load player progress.
pub fn load_progress() -> Progress {
    let Some(progress_path) = config_dir().map(|d| d.join("progress.toml")) else {
        return Progress::default();
    };

    if !progress_path.exists() {
        return Progress::default();
    }

    match std::fs::read_to_string(&progress_path) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => Progress::default(),
    }
}

/// Save player progress.
pub fn save_progress(progress: &Progress) -> Result<(), std::io::Error> {
    let Some(config_dir) = config_dir() else {
        return Ok(());
    };

    std::fs::create_dir_all(&config_dir)?;
    let progress_path = config_dir.join("progress.toml");
    let content = toml::to_string_pretty(progress)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
    std::fs::write(progress_path, content)
}

/// List available levels (bundled + user).
pub fn list_levels() -> Vec<PathBuf> {
    let mut levels = Vec::new();

    // Bundled levels
    let bundled = data_dir().join("levels");
    if let Ok(entries) = std::fs::read_dir(&bundled) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "toml") {
                levels.push(path);
            }
        }
    }

    // User levels
    if let Some(user_levels) = config_dir().map(|d| d.join("levels")) {
        if let Ok(entries) = std::fs::read_dir(&user_levels) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "toml") {
                    levels.push(path);
                }
            }
        }
    }

    levels.sort();
    levels
}

/// Find level by ID.
pub fn find_level(id: &str) -> Option<PathBuf> {
    list_levels().into_iter().find(|path| {
        path.file_stem()
            .and_then(|s| s.to_str())
            .map_or(false, |name| name.contains(id))
    })
}
```

### 6.5 Bundled Levels

**File:** `data/levels/001_first_steps.toml`

```toml
[meta]
id = "001_first_steps"
name = "First Steps"
author = "Default"
description = "Learn the basics of movement. Reach the exit without being seen."

[config]
width = 20
height = 10
max_time = 30
light_speed = 3

[detection]
model = "discrete_delay"
delay_turns = 2
vision_radius = 6

[map]
data = """
####################
#..................#
#..@...............#
#..................#
#..................#
#..................#
#..................#
#..................#
#.................>#
####################
"""
```

**File:** `data/levels/002_the_watcher.toml`

```toml
[meta]
id = "002_the_watcher"
name = "The Watcher"
author = "Default"
description = "A guard patrols the corridor. Time your movement carefully."

[config]
width = 25
height = 12
max_time = 50
light_speed = 3

[detection]
model = "discrete_delay"
delay_turns = 2
vision_radius = 8

[map]
data = """
#########################
#.......................#
#..@....................#
#.......................#
#.....##################
#.....#................#
#.....#....E...........#
#.....#................#
#.....##################
#.......................#
#......................>#
#########################
"""

[[enemies]]
id = "guard_1"
x = 11
y = 6
patrol = [[11, 6], [18, 6]]
loops = true
light_speed = 3
fov_degrees = 360
```

**File:** `data/levels/003_time_loop.toml`

```toml
[meta]
id = "003_time_loop"
name = "Time Loop"
author = "Default"
description = "Use the rift to revisit the past. Don't cross your own path."

[config]
width = 20
height = 15
max_time = 50
light_speed = 3

[detection]
model = "discrete_delay"
delay_turns = 3
vision_radius = 6

[map]
data = """
####################
#..................#
#..@...............#
#..................#
#..................#
#....O.............#
#..................#
#........##########
#........#........#
#........#........#
#........#........#
#........#.......>#
#........##########
#..................#
####################
"""

[[rifts]]
x = 5
y = 5
target_x = 10
target_y = 10
target_t = 0
bidirectional = false
```

### 6.6 Default Theme

**File:** `data/themes/noir.toml`

```toml
[meta]
name = "Noir"
author = "Default"

[colors]
bg = "#000000"
fg = "#808080"
wall = "#404040"
player = "#00FFFF"
player_ghost = "#004040"
enemy = "#FF0000"
enemy_vision = "#330011"
exit = "#00FF00"
rift = "#FF00FF"
box = "#FFFF00"
accent = "#0000FF"

[glyphs]
player = "@"
wall = "█"
floor = "."
enemy = "E"
exit = ">"
rift = "O"
box = "□"
```

### 6.7 Main App Integration

**File:** `src/main.rs` (modifications)

```rust
use clap::Parser;
use he_walks_unseen::data::{load_config, load_level, build_level, load_theme, build_theme};
use he_walks_unseen::game::GameState;
use he_walks_unseen::render::App;

#[derive(Parser)]
#[command(name = "he-walks-unseen")]
#[command(about = "A time-bending stealth puzzle game")]
struct Args {
    /// Path to a level file
    #[arg(short, long)]
    level: Option<String>,

    /// Start campaign mode
    #[arg(short, long)]
    campaign: bool,

    /// Theme name or path
    #[arg(short, long)]
    theme: Option<String>,
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = Args::parse();
    let app_config = load_config();

    // Load theme
    let theme = if let Some(theme_path) = &args.theme {
        let theme_data = load_theme(theme_path)?;
        build_theme(&theme_data)?
    } else {
        // Use default theme
        Theme::default()
    };

    // Load level
    let (cube, game_config) = if let Some(level_path) = &args.level {
        let level_data = load_level(level_path)?;
        build_level(&level_data)?
    } else if args.campaign {
        // Load first uncompleted level
        let progress = load_progress();
        let level_path = find_next_level(&progress)?;
        let level_data = load_level(&level_path)?;
        build_level(&level_data)?
    } else {
        // Default demo level
        create_demo_level()
    };

    let state = GameState::new(cube, game_config)?;
    // NOTE: RenderApp currently owns Theme internally.
    // Phase 6 should extend RenderApp to accept an injected Theme
    // (e.g., RenderApp::with_theme) before wiring this in.
    let mut app = RenderApp::new(state);
    app.run()?; // replace with run_game_loop as needed

    Ok(())
}
```

---

## Dependencies to Add

**File:** `Cargo.toml`

```toml
[dependencies]
# ... existing ...
toml = "0.8"
serde = { version = "1.0", features = ["derive"] }
directories = "5.0"
clap = { version = "4.4", features = ["derive"] }
```
Note: `toml` and `serde` are already present in the current codebase; only add missing crates.

---

## Exit Criteria

### Data Loading
- [ ] `load_level(path)` parses TOML level files
- [ ] `build_level(data)` creates TimeCube + GameConfig from LevelData
- [ ] ASCII map parsing handles player, exit, walls correctly
- [ ] Enemy, rift, and box sections create correct entities
- [ ] Detection config from level file applies to game

### Theme Loading
- [ ] `load_theme(path)` parses TOML theme files
- [ ] `build_theme(data)` creates render Theme from ThemeData
- [ ] Hex color parsing works (#RRGGBB format)
- [ ] Default theme loads from `data/themes/noir.toml`

### Configuration
- [ ] Config dir follows XDG conventions
- [ ] `load_config()` returns AppConfig from file or default
- [ ] `save_config()` persists settings
- [ ] Progress tracking works (completed levels list)

### Bundled Content
- [ ] At least 3 tutorial levels in `data/levels/`
- [ ] Default noir theme in `data/themes/`
- [ ] Levels progressively introduce mechanics

### CLI Integration
- [ ] `--level <path>` loads specific level
- [ ] `--theme <name>` applies custom theme
- [ ] Game runs with bundled defaults if no args

### Tests
- [ ] Level parsing unit tests (valid and invalid files)
- [ ] Theme parsing unit tests
- [ ] Map ASCII parsing tests
- [ ] Color parsing tests

---

## Phase 6 Limitations (Deferred)

| Feature | Deferred To | Reason |
|---------|-------------|--------|
| Level select menu | Future | CLI args sufficient for MVP |
| In-game level restart with different level | Future | Restart same level works |
| Hot-reload themes | Phase 10 | Polish feature |
| Entity definitions file | Future | Hardcoded entities work |
| Level validation tool | Future | Manual testing for now |
| Glyph overrides in themes | Future | Theme glyphs not yet applied in renderer |
| Campaign flow helpers (find_next_level) | Future | Plan uses placeholders; implement later |
| Map parsing diagnostics display | Future | Warning collection not yet surfaced in UI |
| light_speed integration | Future | Detection uses VisionData; config wiring deferred |

---

## Related Documents

- [OVERALL.md](../design/OVERALL.md) — Level format design
- [RENDERING.md](../design/RENDERING.md) — Theme system spec
- [Phase 5](PHASE_05_LIGHT_CONE.md) — Detection config used by levels
