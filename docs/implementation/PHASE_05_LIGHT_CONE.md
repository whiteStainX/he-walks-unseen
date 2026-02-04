# Phase 5: Light Cone Vision & World Line Visualization

> **Depends on:** Phase 4 (Rendering), Phase 3 (Game State)
> **Enables:** Phase 6 (Data Loading)
> **Design Reference:** `docs/design/MATH_MODEL.md` (Sections 9, 10, 12)

---

## Overview

This phase implements the core "unseen" mechanic: enemies detect the player through causal light cones, and the player's past-turn selves are visualized when revisiting time slices via rifts.

**Scale Note:** Expand default test/demo maps from ~20×20 to **100×100** to better exercise vision and detection ranges at scale.

**Goal:** Answer these questions:
- "Can enemies see where I was?"
- "What happens when I'm detected?"
- "Where are my past-turn selves on this time slice?"

**Non-Goals (Phase 5):**
- Grandfather paradox detection (Phase 7)
- Full light cone model with distance-based delay (future enhancement)
- Alert/chase mechanics (deferred)

---

## File Structure

```
src/core/
├── light_cone.rs      # NEW: Light cone geometry and ray casting
├── detection.rs       # NEW: DetectionConfig, DetectionModel, check_detection()
├── world_line.rs      # MODIFIED: Add positions_at_time_with_turn, max_t
├── components.rs      # EXISTING: PatrolData::position_at already works

src/game/
├── state.rs           # MODIFIED: Add detection field to GameConfig (uses core::DetectionConfig)
└── actions.rs         # MODIFIED: Add detection check in finalize_action

src/render/
├── grid.rs            # MODIFIED: Past-turn selves rendering (modify cell_glyph_and_color)
├── vision.rs          # NEW: Danger zone overlay rendering
└── theme.rs           # MODIFIED: Add player_ghost, enemy_vision colors
```

**Architecture Note:** Detection types (`DetectionConfig`, `DetectionModel`) live in `core::detection` to avoid circular dependencies. The detection API is pure: `check_detection(cube, world_line, config)` — no `GameState` dependency in core.

---

## Critical Design Decisions

### Two Time Concepts (Review)

This phase requires careful attention to the distinction documented in MATH_MODEL.md Section 9:

| Concept | Symbol | Usage in Phase 5 |
|---------|--------|------------------|
| **Cube Time (`t`)** | `t` | Enemy position, player position, light cone geometry |
| **Turn Time (`n`)** | `n` | Which player position is "current" vs "past-turn" |

**Key Rule:** Detection is a geometric problem in cube-time. "Past" and "current" for rendering refer to turn-time.

### Detection Model: Discrete Delay First

**Problem:** Full light cone detection (distance-based delay) is complex. How do we start simple?

**Chosen Solution:** Implement **discrete delay model** first, with full light cone as configuration option.

**Discrete Delay Model:**
```
Enemy at (ex, ey, te) sees player if:
1. Player was at (px, py, tp) where tp = te - k  (fixed delay k)
2. distance(ex, ey, px, py) <= vision_radius
3. Line of sight is not blocked
```

**Configuration (add to GameConfig):**
```rust
pub struct DetectionConfig {
    pub model: DetectionModel,
    pub delay_turns: i32,      // k value for discrete delay
    pub vision_radius: i32,    // max detection distance
}
```

**Rationale:**
- Simple to understand: "enemies see k turns into the past"
- O(E × T_explored) per check
- Establishes the core concept before adding complexity
- Can upgrade to full light cone per-level later

### WorldLine API Extension (Non-Breaking)

**Problem:** Rendering past-turn selves needs turn indices; current API doesn't expose them.

**Existing API (keep unchanged):**
```rust
impl WorldLine {
    pub fn positions_at_time(&self, t: i32) -> Vec<Position>;
    pub fn current_time(&self) -> Option<i32>;
    pub fn current_turn(&self) -> Option<usize>;
    pub fn position_at_turn(&self, turn: usize) -> Option<Position>;
    pub fn time_range(&self) -> Option<(i32, i32)>;
}
```

**New methods to add:**
```rust
impl WorldLine {
    /// Returns all positions at cube-time t WITH their turn indices.
    /// Sorted by turn index (ascending).
    pub fn positions_at_time_with_turn(&self, t: i32) -> Vec<(Position, usize)> {
        self.path
            .iter()
            .enumerate()
            .filter(|(_, pos)| pos.t == t)
            .map(|(turn, pos)| (*pos, turn))
            .collect()
    }

    /// Returns the "current" position at cube-time t (highest turn index).
    /// Returns None if player has never been at this t.
    pub fn current_position_at_time(&self, t: i32) -> Option<Position> {
        self.positions_at_time_with_turn(t)
            .into_iter()
            .max_by_key(|(_, turn)| *turn)
            .map(|(pos, _)| pos)
    }

    /// Returns the maximum t value in the world line (explored boundary).
    pub fn max_t(&self) -> Option<i32> {
        self.time_range().map(|(_, max)| max)
    }
}
```

**Rendering Rule:**
- Current-turn self (max turn index at this t): `theme.player` (bright)
- Past-turn selves (lower turn indices): `theme.player_ghost` (dim)

### Patrol: Use Existing PatrolData

**Existing implementation in `src/core/components.rs`:**
```rust
impl PatrolData {
    /// Get position at time t (deterministic computation).
    pub fn position_at(&self, t: i32) -> SpatialPos {
        let index = if self.loops {
            (t as usize) % self.path.len()
        } else {
            (t as usize).min(self.path.len() - 1)  // Stops at end, no ping-pong
        };
        self.path[index]
    }
}
```

**No changes needed.** Detection code will use `entity.patrol_data().map(|p| p.position_at(te))`.

### Detection Check Placement

**Problem:** When do we check for detection?

**Chosen Solution:** Check detection in `finalize_action` (in `src/game/actions.rs`), before win check.

```rust
// In finalize_action():
fn finalize_action(
    mut state: GameState,
    mut outcome: ActionOutcome,
    moved_entities: Vec<(EntityId, Position, Position)>,
    propagation: Option<PropagationResult>,
) -> Result<ActionResult, ActionError> {
    // NEW: Check detection after move but before win check
    if matches!(outcome, ActionOutcome::Moved { .. }
        | ActionOutcome::Waited { .. }
        | ActionOutcome::Rifted { .. }
        | ActionOutcome::Pushed { .. }
        | ActionOutcome::Pulled { .. })
    {
        if let Some(detection) = check_detection(&state) {
            state.set_phase(GamePhase::Detected);
            return Ok(ActionResult {
                state,
                outcome: ActionOutcome::Detected {
                    by: detection.enemy_id,
                    seen_at: detection.player_position,
                },
                moved_entities,
                propagation,
            });
        }
    }

    // EXISTING: Win check
    if matches!(outcome, ...) && state.at_exit() {
        state.set_phase(GamePhase::Won);
        outcome = ActionOutcome::Won { at: state.player_position() };
    }

    Ok(ActionResult { state, outcome, moved_entities, propagation })
}
```

**Rationale:**
- Detection is immediate and final (per MATH_MODEL.md Section 11.1)
- Check happens after world line extension but before win evaluation
- Detection takes precedence over win (can't win if detected)

### Line-of-Sight: Use Existing API

**Existing API:**
```rust
impl TimeCube {
    pub fn blocks_vision(&self, pos: Position) -> bool;
}
```

**Ray casting implementation:**
```rust
/// Check if line of sight is blocked between two points at time t.
pub fn is_line_blocked(cube: &TimeCube, from: SpatialPos, to: SpatialPos, t: i32) -> bool {
    for (x, y) in bresenham_line(from.x, from.y, to.x, to.y) {
        // Skip endpoints
        if (x == from.x && y == from.y) || (x == to.x && y == to.y) {
            continue;
        }
        let pos = Position::new(x, y, t);
        if cube.blocks_vision(pos) {
            return true;
        }
    }
    false
}
```

---

## Implementation Tasks

### 5.1 World Line API Extension

**File:** `src/core/world_line.rs`

Add new methods (non-breaking):

```rust
impl WorldLine {
    /// Returns all positions at cube-time t WITH their turn indices.
    pub fn positions_at_time_with_turn(&self, t: i32) -> Vec<(Position, usize)> {
        self.path
            .iter()
            .enumerate()
            .filter(|(_, pos)| pos.t == t)
            .map(|(turn, pos)| (*pos, turn))
            .collect()
    }

    /// Returns the "current" position at t (highest turn index).
    pub fn current_position_at_time(&self, t: i32) -> Option<Position> {
        self.positions_at_time_with_turn(t)
            .into_iter()
            .max_by_key(|(_, turn)| *turn)
            .map(|(pos, _)| pos)
    }

    /// Returns the maximum t value (explored boundary).
    pub fn max_t(&self) -> Option<i32> {
        self.time_range().map(|(_, max)| max)
    }
}
```

**Tests:**
```rust
#[test]
fn test_positions_at_time_with_turn_multiple() {
    let mut wl = WorldLine::new(Position::new(3, 5, 7));  // Turn 0
    wl.extend(Position::new(3, 5, 8)).unwrap();           // Turn 1
    wl.extend_via_rift(Position::new(6, 2, 7)).unwrap();  // Turn 2, same t=7

    let positions = wl.positions_at_time_with_turn(7);
    assert_eq!(positions.len(), 2);
    assert_eq!(positions[0], (Position::new(3, 5, 7), 0));
    assert_eq!(positions[1], (Position::new(6, 2, 7), 2));
}

#[test]
fn test_current_position_at_time() {
    let mut wl = WorldLine::new(Position::new(3, 5, 7));
    wl.extend(Position::new(3, 5, 8)).unwrap();
    wl.extend_via_rift(Position::new(6, 2, 7)).unwrap();

    let current = wl.current_position_at_time(7).unwrap();
    assert_eq!(current, Position::new(6, 2, 7));  // Turn 2, not turn 0
}

#[test]
fn test_max_t() {
    let mut wl = WorldLine::new(Position::new(0, 0, 5));
    wl.extend_via_rift(Position::new(1, 1, 2)).unwrap();  // Goes back
    assert_eq!(wl.max_t(), Some(5));
}
```

### 5.2 Theme Extension

**File:** `src/render/theme.rs`

Add new color fields:

```rust
#[derive(Debug, Clone, Copy)]
pub struct Theme {
    // ... existing fields ...
    pub player: Color,
    /// Past-turn selves and adjacent-slice ghosts.
    pub player_ghost: Color,
    pub enemy: Color,
    /// Enemy vision/danger zones.
    pub enemy_vision: Color,
    // ... rest ...
}

impl Default for Theme {
    fn default() -> Self {
        Self {
            // ... existing ...
            player: Color::Cyan,
            player_ghost: Color::DarkGray,  // Or Color::Rgb(0, 68, 68) for dim cyan
            enemy: Color::Red,
            enemy_vision: Color::Rgb(51, 17, 17),  // Dim red
            // ...
        }
    }
}
```

### 5.3 Detection Config

Detection types live in **core** (not game) to avoid circular dependencies.

**File:** `src/core/detection.rs` (types section)

```rust
/// Detection model type.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum DetectionModel {
    /// Enemy sees player position from (te - k) turns ago.
    #[default]
    DiscreteDelay,
    /// Full light cone: distance <= c * (te - tp).
    LightCone,
}

/// Configuration for detection.
#[derive(Debug, Clone)]
pub struct DetectionConfig {
    /// Detection model type.
    pub model: DetectionModel,
    /// Fixed delay for discrete model (cube-time units).
    pub delay_turns: i32,
    /// Maximum vision radius.
    pub vision_radius: i32,
}

impl Default for DetectionConfig {
    fn default() -> Self {
        Self {
            model: DetectionModel::DiscreteDelay,
            delay_turns: 2,
            vision_radius: 8,
        }
    }
}
```

**File:** `src/game/state.rs` (add field to GameConfig)

```rust
use crate::core::detection::DetectionConfig;

#[derive(Debug, Clone)]
pub struct GameConfig {
    // ... existing fields ...
    pub light_speed: u32,
    pub max_push_chain: usize,
    pub level_name: String,
    pub level_id: String,  // Keep as String (not Option)
    pub allow_undo: bool,
    /// Detection configuration.
    pub detection: DetectionConfig,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            light_speed: 3,
            max_push_chain: 3,
            level_name: String::from("Unnamed"),
            level_id: String::from("unknown"),
            allow_undo: false,
            detection: DetectionConfig::default(),
        }
    }
}
```

### 5.4 Light Cone Module

**File:** `src/core/light_cone.rs` (NEW)

```rust
//! Light cone geometry and ray casting for detection.

use crate::core::{Position, SpatialPos, TimeCube};

/// Bresenham's line algorithm for ray casting.
pub fn bresenham_line(x1: i32, y1: i32, x2: i32, y2: i32) -> Vec<(i32, i32)> {
    let mut points = Vec::new();

    let dx = (x2 - x1).abs();
    let dy = (y2 - y1).abs();
    let sx = if x1 < x2 { 1 } else { -1 };
    let sy = if y1 < y2 { 1 } else { -1 };
    let mut err = dx - dy;

    let mut x = x1;
    let mut y = y1;

    loop {
        points.push((x, y));

        if x == x2 && y == y2 {
            break;
        }

        let e2 = 2 * err;
        if e2 > -dy {
            err -= dy;
            x += sx;
        }
        if e2 < dx {
            err += dx;
            y += sy;
        }
    }

    points
}

/// Check if line of sight is blocked between two points at time t.
pub fn is_line_blocked(cube: &TimeCube, from: SpatialPos, to: SpatialPos, t: i32) -> bool {
    for (x, y) in bresenham_line(from.x, from.y, to.x, to.y) {
        // Skip endpoints
        if (x == from.x && y == from.y) || (x == to.x && y == to.y) {
            continue;
        }
        let pos = Position::new(x, y, t);
        if cube.blocks_vision(pos) {
            return true;
        }
    }
    false
}

/// Manhattan distance between two spatial positions.
pub fn manhattan_distance(a: SpatialPos, b: SpatialPos) -> i32 {
    (a.x - b.x).abs() + (a.y - b.y).abs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bresenham_horizontal() {
        let points = bresenham_line(0, 0, 3, 0);
        assert_eq!(points, vec![(0, 0), (1, 0), (2, 0), (3, 0)]);
    }

    #[test]
    fn test_bresenham_vertical() {
        let points = bresenham_line(0, 0, 0, 3);
        assert_eq!(points, vec![(0, 0), (0, 1), (0, 2), (0, 3)]);
    }

    #[test]
    fn test_bresenham_diagonal() {
        let points = bresenham_line(0, 0, 3, 3);
        assert_eq!(points, vec![(0, 0), (1, 1), (2, 2), (3, 3)]);
    }

    #[test]
    fn test_manhattan_distance() {
        assert_eq!(manhattan_distance(SpatialPos::new(0, 0), SpatialPos::new(3, 4)), 7);
    }
}
```

### 5.5 Detection Module

**File:** `src/core/detection.rs` (NEW)

**Key Design:** This module lives in `core` and has NO dependency on `game`. The detection API is pure: `check_detection(cube, world_line, config)`.

```rust
//! Detection logic for enemy vision.
//!
//! This module is part of core and must NOT depend on game.

use crate::core::{
    light_cone::{is_line_blocked, manhattan_distance},
    components::EntityId,
    Entity, Position, SpatialPos, TimeCube, WorldLine,
};

// DetectionConfig and DetectionModel are defined here (see section 5.3)

/// Result of a detection check.
#[derive(Debug, Clone)]
pub struct DetectionResult {
    /// Which enemy detected the player.
    pub enemy_id: EntityId,
    /// Enemy position when detection occurred.
    pub enemy_position: Position,
    /// Player position that was seen.
    pub player_position: Position,
}

/// Check if any enemy detects the player.
///
/// Pure function: takes cube, world_line, and config directly.
/// Does NOT depend on GameState.
pub fn check_detection(
    cube: &TimeCube,
    world_line: &WorldLine,
    config: &DetectionConfig,
) -> Option<DetectionResult> {
    let max_t = match world_line.max_t() {
        Some(t) => t,
        None => return None,
    };

    // Check each time slice within explored range
    for te in 0..=max_t {
        let enemies = cube.enemies_at(te);

        for enemy in enemies {
            if let Some(result) = check_enemy_at_time(cube, world_line, config, enemy, te) {
                return Some(result);
            }
        }
    }

    None
}

/// Check if a specific enemy at time te sees the player.
fn check_enemy_at_time(
    cube: &TimeCube,
    world_line: &WorldLine,
    config: &DetectionConfig,
    enemy: &Entity,
    te: i32,
) -> Option<DetectionResult> {
    // Get enemy spatial position at this time
    let enemy_spatial = get_enemy_spatial_position(enemy, te);
    let enemy_pos = Position::new(enemy_spatial.x, enemy_spatial.y, te);

    match config.model {
        DetectionModel::DiscreteDelay => {
            check_discrete_delay(cube, world_line, config, enemy, enemy_pos, te)
        }
        DetectionModel::LightCone => {
            check_light_cone(cube, world_line, config, enemy, enemy_pos, te)
        }
    }
}

/// Get enemy's spatial position at time t.
fn get_enemy_spatial_position(enemy: &Entity, t: i32) -> SpatialPos {
    // If enemy has patrol, use patrol position; otherwise use entity position
    // Note: Entity fields are public, accessed directly
    if let Some(patrol) = enemy.patrol_data() {
        patrol.position_at(t)
    } else {
        enemy.position.spatial()  // Direct field access
    }
}

/// Discrete delay model: enemy sees player position from (te - k) turns ago.
fn check_discrete_delay(
    cube: &TimeCube,
    world_line: &WorldLine,
    config: &DetectionConfig,
    enemy: &Entity,
    enemy_pos: Position,
    te: i32,
) -> Option<DetectionResult> {
    let tp = te - config.delay_turns;
    if tp < 0 {
        return None;
    }

    // Get player position at cube-time tp (use current_position_at_time for most recent)
    let player_pos = world_line.current_position_at_time(tp)?;
    let player_spatial = player_pos.spatial();
    let enemy_spatial = enemy_pos.spatial();

    // Check distance
    let distance = manhattan_distance(enemy_spatial, player_spatial);
    if distance > config.vision_radius {
        return None;
    }

    // Check line of sight (at enemy's time te)
    if is_line_blocked(cube, enemy_spatial, player_spatial, te) {
        return None;
    }

    Some(DetectionResult {
        enemy_id: enemy.id,  // Direct field access
        enemy_position: enemy_pos,
        player_position: player_pos,
    })
}

/// Full light cone model: enemy sees any player position within cone.
fn check_light_cone(
    cube: &TimeCube,
    world_line: &WorldLine,
    config: &DetectionConfig,
    enemy: &Entity,
    enemy_pos: Position,
    te: i32,
) -> Option<DetectionResult> {
    let enemy_spatial = enemy_pos.spatial();

    // Get light speed from enemy's vision data, or use config default
    let light_speed = enemy
        .vision_data()
        .map(|v| v.light_speed as i32)
        .unwrap_or(3);

    // Check all player positions in the past (tp < te)
    for player_pos in world_line.path().iter().copied().filter(|pos| pos.t < te) {
        let tp = player_pos.t;
        let time_delta = te - tp;
        let player_spatial = player_pos.spatial();

        // Check if within light cone
        let distance = manhattan_distance(enemy_spatial, player_spatial);
        let max_distance = light_speed * time_delta;

        if distance <= max_distance && distance <= config.vision_radius {
            // Check line of sight
            if !is_line_blocked(cube, enemy_spatial, player_spatial, te) {
                return Some(DetectionResult {
                    enemy_id: enemy.id,  // Direct field access
                    enemy_position: enemy_pos,
                    player_position: player_pos,
                });
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    // Tests use core types only, no game dependency
}
```

### 5.6 Action Flow Integration

**File:** `src/game/actions.rs`

`ActionOutcome::Detected` already exists (added in Phase 4.5). Confirm usage and avoid duplicate edits.

```rust
pub enum ActionOutcome {
    // ... existing variants ...
    /// Player was detected by enemy.
    Detected {
        /// Enemy that detected the player.
        by: EntityId,
        /// Player position that was seen.
        seen_at: Position,
    },
}
```

Modify `finalize_action` to use the pure detection API:

```rust
use crate::core::detection::check_detection;

fn finalize_action(
    mut state: GameState,
    mut outcome: ActionOutcome,
    moved_entities: Vec<(EntityId, Position, Position)>,
    propagation: Option<PropagationResult>,
) -> Result<ActionResult, ActionError> {
    // NEW: Check detection for movement actions
    // Uses pure API: check_detection(cube, world_line, config)
    if matches!(outcome,
        ActionOutcome::Moved { .. }
        | ActionOutcome::Waited { .. }
        | ActionOutcome::Rifted { .. }
        | ActionOutcome::Pushed { .. }
        | ActionOutcome::Pulled { .. }
    ) {
        let detection = check_detection(
            state.cube(),
            state.world_line(),
            &state.config().detection,
        );
        if let Some(result) = detection {
            state.set_phase(GamePhase::Detected);
            return Ok(ActionResult {
                state,
                outcome: ActionOutcome::Detected {
                    by: result.enemy_id,
                    seen_at: result.player_position,
                },
                moved_entities,
                propagation,
            });
        }
    }

    // EXISTING: Win check (detection takes precedence)
    if matches!(outcome,
        ActionOutcome::Moved { .. }
        | ActionOutcome::Waited { .. }
        | ActionOutcome::Rifted { .. }
        | ActionOutcome::Pushed { .. }
        | ActionOutcome::Pulled { .. }
    ) && state.at_exit()
    {
        state.set_phase(GamePhase::Won);
        outcome = ActionOutcome::Won {
            at: state.player_position(),
        };
    }

    Ok(ActionResult {
        state,
        outcome,
        moved_entities,
        propagation,
    })
}
```

### 5.7 Grid Rendering Update

**File:** `src/render/grid.rs`

The current grid rendering uses `Paragraph` with `Line`/`Span`, not direct `Buffer` writes.
Modify `cell_glyph_and_color` to handle past-turn selves:

```rust
/// Modify cell_glyph_and_color to handle multiple player positions at same t.
fn cell_glyph_and_color(state: &GameState, pos: Position, theme: &Theme) -> (char, Color) {
    // Check if this position has any player (current or past-turn self)
    let world_line = state.world_line();
    let positions_at_t = world_line.positions_at_time_with_turn(pos.t);

    // Check if current position matches any world line position at this t
    for (wl_pos, turn) in &positions_at_t {
        if wl_pos.x == pos.x && wl_pos.y == pos.y {
            // Determine if current-turn self or past-turn self
            let current_turn = world_line.current_turn().unwrap_or(0);
            let color = if *turn == current_turn {
                theme.player       // Bright: current-turn self
            } else {
                theme.player_ghost // Dim: past-turn self
            };
            return ('@', color);
        }
    }

    // Rest of existing logic for other entities...
    if !state.cube().in_bounds(pos) {
        return ('.', theme.fg);
    }

    let entities = state.cube().entities_at(pos);
    if entities.is_empty() {
        return ('.', theme.fg);
    }

    // ... existing entity priority logic ...
}
```

**Alternative approach:** Keep `cell_glyph_and_color` simple and handle player rendering separately:

```rust
pub fn render_grid(area: Rect, frame: &mut Frame, state: &GameState, theme: &Theme) {
    // ... existing setup ...

    let t = state.current_time();
    let world_line = state.world_line();
    let current_turn = world_line.current_turn().unwrap_or(0);

    // Get all player positions at current t for ghost rendering
    let player_positions: std::collections::HashMap<(i32, i32), bool> = world_line
        .positions_at_time_with_turn(t)
        .into_iter()
        .map(|(pos, turn)| ((pos.x, pos.y), turn == current_turn))
        .collect();

    let mut lines = Vec::with_capacity(max_y as usize);
    for y in 0..max_y {
        let mut spans = Vec::with_capacity(max_x as usize);
        for x in 0..max_x {
            let pos = Position::new(x, y, t);

            // Check for player at this position (current or past-turn)
            if let Some(&is_current) = player_positions.get(&(x, y)) {
                let color = if is_current { theme.player } else { theme.player_ghost };
                spans.push(Span::styled("@".to_string(), Style::default().fg(color)));
                continue;
            }

            // Existing entity rendering
            let (glyph, color) = cell_glyph_and_color_no_player(state, pos, theme);
            spans.push(Span::styled(glyph.to_string(), Style::default().fg(color)));
        }
        lines.push(Line::from(spans));
    }

    frame.render_widget(Paragraph::new(lines), inner);
}
```

**Recommendation:** Use the alternative approach — it's cleaner and separates player logic from entity logic. Rename existing helper to `cell_glyph_and_color_no_player` and skip the current player position check there.

### 5.8 Vision Rendering (Optional for Phase 5)

**File:** `src/render/vision.rs` (NEW)

**Note:** Vision rendering is optional for Phase 5 core functionality. Can be deferred to Phase 5.5.

If implemented, integrate with `render_grid` by computing danger zones before building spans:

```rust
//! Vision zone rendering for enemies.

use std::collections::HashSet;
use crate::core::{light_cone::{manhattan_distance, is_line_blocked}, SpatialPos, TimeCube};
use crate::game::GameState;

/// Compute all danger zone positions at current time.
/// Returns set of (x, y) positions within enemy vision.
pub fn compute_danger_zones(state: &GameState) -> HashSet<(i32, i32)> {
    let mut danger_positions = HashSet::new();
    let current_t = state.current_time();
    let cube = state.cube();
    let config = &state.config().detection;

    for enemy in cube.enemies_at(current_t) {
        let enemy_spatial = if let Some(patrol) = enemy.patrol_data() {
            patrol.position_at(current_t)
        } else {
            enemy.position.spatial()  // Direct field access
        };

        // Add visible positions within radius
        for dy in -config.vision_radius..=config.vision_radius {
            for dx in -config.vision_radius..=config.vision_radius {
                let x = enemy_spatial.x + dx;
                let y = enemy_spatial.y + dy;

                if x < 0 || y < 0 {
                    continue;
                }

                let target = SpatialPos::new(x, y);
                if manhattan_distance(enemy_spatial, target) > config.vision_radius {
                    continue;
                }

                // Skip if blocked
                if is_line_blocked(cube, enemy_spatial, target, current_t) {
                    continue;
                }

                danger_positions.insert((x, y));
            }
        }
    }

    danger_positions
}
```

**Integration in `render_grid`:**

```rust
// In render_grid, after computing player_positions:
let danger_zones = if state.config().detection.vision_radius > 0 {
    compute_danger_zones(state)
} else {
    HashSet::new()
};

// In the cell rendering loop:
for x in 0..max_x {
    let pos = Position::new(x, y, t);

    // Player positions (current/past-turn) take priority
    if let Some(&is_current) = player_positions.get(&(x, y)) {
        // ... player rendering ...
        continue;
    }

    // Check danger zone (render floor differently)
    let (glyph, mut color) = cell_glyph_and_color_no_player(state, pos, theme);
    if danger_zones.contains(&(x, y)) && glyph == '.' {
        // Overlay danger indicator on floor
        spans.push(Span::styled("░".to_string(), Style::default().fg(theme.enemy_vision)));
        continue;
    }

    spans.push(Span::styled(glyph.to_string(), Style::default().fg(color)));
}
```

**Recommendation:** Defer full danger zone rendering to Phase 5.5. Focus Phase 5 on detection logic and past-turn selves rendering.

---

## Module Exports

**File:** `src/core/mod.rs`

Add new module exports:

```rust
pub mod light_cone;
pub mod detection;

pub use light_cone::{bresenham_line, is_line_blocked, manhattan_distance};
pub use detection::{check_detection, DetectionConfig, DetectionModel, DetectionResult};
```

**File:** `src/game/mod.rs`

Re-export detection types for convenience (optional):

```rust
// Re-export from core for convenience
pub use crate::core::detection::{DetectionConfig, DetectionModel};
```

**File:** `src/render/mod.rs`

Add vision module (optional):

```rust
pub mod vision;  // Optional for Phase 5
```

---

## Testing Strategy

### Unit Tests

See individual module sections above for specific tests.

### Integration Test

**File:** `tests/detection_integration.rs`

Note: Use `TimeCube::new()` + entity spawns (no `TimeCubeBuilder` exists).

```rust
use he_walks_unseen::core::*;
use he_walks_unseen::game::*;

#[test]
fn test_detection_scenario() {
    // Create a level with:
    // - Player at (2, 2, t=0)
    // - Enemy at (5, 2) with vision
    // - detection.delay_turns = 2

    let mut cube = TimeCube::new(100, 100, 10);

    // Add player
    let player = Entity::player(Position::new(2, 2, 0));
    cube.spawn(player).unwrap();

    // Add enemy with vision (stationary patrol)
    let patrol = PatrolData::new(vec![SpatialPos::new(5, 2)], true);
    let vision = VisionData::omnidirectional(3);
    let enemy = Entity::enemy(Position::new(5, 2, 0), patrol, vision);
    cube.spawn(enemy).unwrap();

    // Propagate to fill time slices
    cube.propagate_all();

    // Build game state with detection config
    let config = GameConfig {
        detection: DetectionConfig {
            model: DetectionModel::DiscreteDelay,
            delay_turns: 2,
            vision_radius: 5,
        },
        ..Default::default()
    };

    let state = GameState::new(cube, config).unwrap();

    // Move toward enemy (should be safe initially)
    let result = apply_action(&state, Action::Move(Direction::East)).unwrap();
    assert_eq!(result.state.phase(), GamePhase::Playing);

    // Move again
    let result = apply_action(&result.state, Action::Move(Direction::East)).unwrap();
    assert_eq!(result.state.phase(), GamePhase::Playing);

    // After delay_turns (2), enemy can see where player was
    // If close enough, should be detected
    let result = apply_action(&result.state, Action::Move(Direction::East)).unwrap();
    // At this point, enemy at (5,2) at t=2 looks back to t=0
    // Player was at (2,2) at t=0 — distance 3, within radius 5
    assert_eq!(result.state.phase(), GamePhase::Detected);
}
```

---

## Exit Criteria

### Core (no game dependency)
- [ ] `DetectionConfig`, `DetectionModel` defined in `core::detection`
- [ ] `check_detection(cube, world_line, config)` — pure API, no GameState
- [ ] `WorldLine::positions_at_time_with_turn(t)` returns `Vec<(Position, usize)>`
- [ ] `WorldLine::current_position_at_time(t)` returns highest-turn position at t
- [ ] `WorldLine::max_t()` returns explored boundary
- [ ] `bresenham_line()` and `is_line_blocked()` in `core::light_cone`
- [ ] Discrete delay model works with configurable `k` and radius
- [ ] Walls block enemy line of sight (`cube.blocks_vision`)
- [ ] Patrol enemies use existing `PatrolData::position_at(t)`

### Game
- [ ] `GameConfig.detection: DetectionConfig` field added
- [ ] Detection check runs in `finalize_action` before win check
- [ ] `ActionOutcome::Detected { by, seen_at }` variant exists
- [ ] `GamePhase::Detected` triggers on detection

### Render
- [ ] `Theme` has `player_ghost` and `enemy_vision` colors
- [ ] Past-turn selves render in dim color (`player_ghost`) on same time slice
- [ ] Current-turn self renders in bright color (`player`)
- [ ] Grid rendering uses Paragraph/Line/Span approach (not Buffer)

### Tests
- [ ] WorldLine new methods have unit tests
- [ ] Bresenham ray casting has unit tests
- [ ] Detection logic has integration test
- [ ] All existing tests still pass

---

## Phase 5 Limitations (Deferred)

| Feature | Deferred To | Reason |
|---------|-------------|--------|
| Full light cone model UI feedback | Future | Focus on discrete delay first |
| Grandfather paradox detection | Phase 7 | Complex timeline analysis |
| Alert/chase mechanics | Future | Different game mode |
| Animated vision cone | Phase 10 | Polish feature |
| Danger zone rendering | Phase 5.5 | Can ship detection without UI overlay |

---

## Related Documents

- [MATH_MODEL.md](../design/MATH_MODEL.md) — Sections 9, 10, 12 for detection theory
- [OVERALL.md](../design/OVERALL.md) — Light cone vision concept
- [RENDERING.md](../design/RENDERING.md) — Past-turn selves rendering spec
- [Phase 3: Game State](PHASE_03_GAME_STATE.md) — Action flow integration
- [Phase 4: Rendering](PHASE_04_RENDERING.md) — Grid rendering foundation
