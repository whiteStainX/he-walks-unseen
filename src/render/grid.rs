//! Grid rendering for the current time slice.

use ratatui::layout::Rect;
use ratatui::style::{Color, Style};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use std::collections::HashMap;

use crate::core::{EntityType, Position};
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

    let mut lines = Vec::with_capacity(max_y as usize);
    for y in 0..max_y {
        let mut spans = Vec::with_capacity(max_x as usize);
        for x in 0..max_x {
            if let Some(&is_current) = player_positions.get(&(x, y)) {
                let color = if is_current {
                    theme.player
                } else {
                    theme.player_ghost
                };
                spans.push(Span::styled("@", Style::default().fg(color)));
                continue;
            }

            let pos = Position::new(x, y, t);
            let (glyph, color) = cell_glyph_and_color_no_player(state, pos, theme);
            spans.push(Span::styled(glyph.to_string(), Style::default().fg(color)));
        }
        lines.push(Line::from(spans));
    }

    frame.render_widget(Paragraph::new(lines), inner);
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
        let (glyph, _) = cell_glyph_and_color_no_player(&state, pos, &theme());
        assert_eq!(glyph, 'E');
    }
}
