//! Grid rendering for the current time slice.

use ratatui::layout::Rect;
use ratatui::style::{Color, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use std::collections::{HashMap, HashSet};

use crate::core::{is_line_blocked, manhattan_distance, EntityType, Position, SpatialPos};
use crate::game::GameState;
use crate::render::theme::Theme;

/// Render the grid for the current time slice.
pub fn render_grid(area: Rect, frame: &mut Frame, state: &GameState, theme: &Theme) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(theme.wall))
        .title(" Grid ");

    let inner = block.inner(area);
    frame.render_widget(block, area);

    if inner.width == 0 || inner.height == 0 {
        return;
    }

    let max_x = (inner.width as i32).min(state.cube().width);
    let max_y = (inner.height as i32).min(state.cube().height);
    let t = state.current_time();
    let world_line = state.world_line();
    let current_turn = world_line.current_turn().unwrap_or(0);
    let player_positions: HashMap<(i32, i32), bool> = world_line
        .positions_at_time_with_turn(t)
        .into_iter()
        .map(|(pos, turn)| ((pos.x, pos.y), turn == current_turn))
        .collect();

    let enemy_positions = compute_enemy_positions(state, t);

    // Compute enemy vision zones
    let vision_zone = compute_enemy_vision_zone(state, t, max_x, max_y);

    let mut lines = Vec::with_capacity(max_y as usize);
    for y in 0..max_y {
        let mut spans = Vec::with_capacity(max_x as usize);
        for x in 0..max_x {
            let in_vision = vision_zone.contains(&(x, y));

            if let Some(&is_current) = player_positions.get(&(x, y)) {
                let fg_color = if is_current {
                    theme.player
                } else {
                    theme.player_ghost
                };
                let style = if in_vision {
                    Style::default().fg(fg_color).bg(theme.enemy_vision)
                } else {
                    Style::default().fg(fg_color)
                };
                spans.push(Span::styled("@", style));
                continue;
            }

            if enemy_positions.contains(&(x, y)) {
                let fg_color = theme.enemy;
                let style = if in_vision {
                    Style::default().fg(fg_color).bg(theme.enemy_vision)
                } else {
                    Style::default().fg(fg_color)
                };
                spans.push(Span::styled("E", style));
                continue;
            }

            let pos = Position::new(x, y, t);
            let (glyph, fg_color) = cell_glyph_and_color_no_player(state, pos, theme);
            let style = if in_vision {
                Style::default().fg(fg_color).bg(theme.enemy_vision)
            } else {
                Style::default().fg(fg_color)
            };
            spans.push(Span::styled(glyph.to_string(), style));
        }
        lines.push(Line::from(spans));
    }

    frame.render_widget(Paragraph::new(lines), inner);
}

/// Compute the set of cells visible to any enemy at time t.
fn compute_enemy_vision_zone(state: &GameState, t: i32, max_x: i32, max_y: i32) -> HashSet<(i32, i32)> {
    let mut zone = HashSet::new();
    let cube = state.cube();
    let vision_radius = state.config().detection.vision_radius;

    for enemy in cube.enemies_at(t) {
        let enemy_spatial = if let Some(patrol) = enemy.patrol_data() {
            patrol.position_at(t)
        } else {
            enemy.position.spatial()
        };

        // Check cells within vision radius
        for dy in -vision_radius..=vision_radius {
            for dx in -vision_radius..=vision_radius {
                let x = enemy_spatial.x + dx;
                let y = enemy_spatial.y + dy;

                if x < 0 || y < 0 || x >= max_x || y >= max_y {
                    continue;
                }

                let target = SpatialPos::new(x, y);
                let distance = manhattan_distance(enemy_spatial, target);

                if distance <= vision_radius && !is_line_blocked(cube, enemy_spatial, target, t) {
                    zone.insert((x, y));
                }
            }
        }
    }

    zone
}

/// Compute the set of enemy positions at time t (patrol-aware).
fn compute_enemy_positions(state: &GameState, t: i32) -> HashSet<(i32, i32)> {
    let mut positions = HashSet::new();
    let cube = state.cube();

    for enemy in cube.enemies_at(t) {
        let enemy_spatial = if let Some(patrol) = enemy.patrol_data() {
            patrol.position_at(t)
        } else {
            enemy.position.spatial()
        };
        positions.insert((enemy_spatial.x, enemy_spatial.y));
    }

    positions
}

fn cell_glyph_and_color_no_player(state: &GameState, pos: Position, theme: &Theme) -> (char, Color) {
    if !state.cube().in_bounds(pos) {
        return ('.', theme.fg);
    }

    let entities = state.cube().entities_at(pos);
    if entities.is_empty() {
        return ('.', theme.fg);
    }

    let mut chosen: Option<EntityType> = None;
    let mut best_priority = 0u8;
    for entity in entities {
        let entity_type = entity.entity_type();
        let priority = entity_priority(entity_type);
        if priority > best_priority {
            best_priority = priority;
            chosen = Some(entity_type);
        }
    }

    match chosen.unwrap_or(EntityType::Floor) {
        EntityType::Player => ('@', theme.player),
        EntityType::Enemy => ('E', theme.enemy),
        EntityType::Rift => ('O', theme.rift),
        EntityType::Exit => ('>', theme.exit),
        EntityType::Box => ('□', theme.box_),
        EntityType::Wall => ('█', theme.wall),
        EntityType::Floor => ('.', theme.fg),
        EntityType::Custom => ('.', theme.fg),
    }
}

fn entity_priority(entity_type: EntityType) -> u8 {
    match entity_type {
        EntityType::Box => 6,
        EntityType::Enemy => 5,
        EntityType::Rift => 4,
        EntityType::Exit => 3,
        EntityType::Wall => 2,
        EntityType::Floor => 1,
        EntityType::Custom => 0,
        EntityType::Player => 7,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{Entity, PatrolData, Position, SpatialPos, TimeCube, VisionData};
    use crate::game::GameState;

    fn theme() -> Theme {
        Theme::default()
    }

    #[test]
    fn test_cell_glyph_player_overrides() {
        let mut cube = TimeCube::new(3, 3, 2);
        let player_pos = Position::new(1, 1, 0);
        cube.spawn(Entity::player(player_pos)).unwrap();
        cube.spawn(Entity::wall(player_pos)).unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let (glyph, _) = cell_glyph_and_color_no_player(&state, player_pos, &theme());
        assert_eq!(glyph, '@');
    }

    #[test]
    fn test_cell_glyph_wall() {
        let mut cube = TimeCube::new(3, 3, 1);
        let player_pos = Position::new(2, 2, 0);
        cube.spawn(Entity::player(player_pos)).unwrap();
        let wall_pos = Position::new(0, 0, 0);
        cube.spawn(Entity::wall(wall_pos)).unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let (glyph, _) = cell_glyph_and_color_no_player(&state, wall_pos, &theme());
        assert_eq!(glyph, '█');
    }

    #[test]
    fn test_cell_glyph_enemy_over_rift() {
        let mut cube = TimeCube::new(4, 4, 1);
        let player_pos = Position::new(3, 3, 0);
        cube.spawn(Entity::player(player_pos)).unwrap();
        let pos = Position::new(1, 1, 0);
        let patrol = PatrolData::new(vec![SpatialPos::new(1, 1)], true);
        let vision = VisionData::new(3, crate::core::Direction::North);
        cube.spawn(Entity::enemy(pos, patrol, vision)).unwrap();
        cube.spawn(Entity::rift(pos, Position::new(2, 2, 0), false))
            .unwrap();
        let state = GameState::from_cube(cube).unwrap();
        assert!(compute_enemy_positions(&state, 0).contains(&(1, 1)));
    }
}
