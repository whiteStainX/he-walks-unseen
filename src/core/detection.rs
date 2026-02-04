//! Detection logic for enemy vision.
//!
//! This module is part of core and must NOT depend on game.

use crate::core::{
    light_cone::{is_line_blocked, manhattan_distance},
    components::EntityId,
    Entity, Position, SpatialPos, TimeCube, WorldLine,
};

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
pub fn check_detection(
    cube: &TimeCube,
    world_line: &WorldLine,
    config: &DetectionConfig,
) -> Option<DetectionResult> {
    let max_t = world_line.max_t()?;

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

fn check_enemy_at_time(
    cube: &TimeCube,
    world_line: &WorldLine,
    config: &DetectionConfig,
    enemy: &Entity,
    te: i32,
) -> Option<DetectionResult> {
    let enemy_spatial = get_enemy_spatial_position(enemy, te);
    let enemy_pos = Position::new(enemy_spatial.x, enemy_spatial.y, te);

    match config.model {
        DetectionModel::DiscreteDelay => {
            check_discrete_delay(cube, world_line, config, enemy, enemy_pos, te)
        }
        DetectionModel::LightCone => check_light_cone(cube, world_line, config, enemy, enemy_pos, te),
    }
}

fn get_enemy_spatial_position(enemy: &Entity, t: i32) -> SpatialPos {
    if let Some(patrol) = enemy.patrol_data() {
        patrol.position_at(t)
    } else {
        enemy.position.spatial()
    }
}

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

    let player_pos = world_line.current_position_at_time(tp)?;
    let player_spatial = player_pos.spatial();
    let enemy_spatial = enemy_pos.spatial();

    let distance = manhattan_distance(enemy_spatial, player_spatial);
    if distance > config.vision_radius {
        return None;
    }

    if is_line_blocked(cube, enemy_spatial, player_spatial, te) {
        return None;
    }

    Some(DetectionResult {
        enemy_id: enemy.id,
        enemy_position: enemy_pos,
        player_position: player_pos,
    })
}

fn check_light_cone(
    cube: &TimeCube,
    world_line: &WorldLine,
    config: &DetectionConfig,
    enemy: &Entity,
    enemy_pos: Position,
    te: i32,
) -> Option<DetectionResult> {
    let enemy_spatial = enemy_pos.spatial();
    let light_speed = enemy
        .vision_data()
        .map(|v| v.light_speed as i32)
        .unwrap_or(3);

    for player_pos in world_line.path().iter().copied().filter(|pos| pos.t < te) {
        let time_delta = te - player_pos.t;
        let player_spatial = player_pos.spatial();

        let distance = manhattan_distance(enemy_spatial, player_spatial);
        let max_distance = light_speed * time_delta;

        if distance <= max_distance
            && distance <= config.vision_radius
            && !is_line_blocked(cube, enemy_spatial, player_spatial, te)
        {
            return Some(DetectionResult {
                enemy_id: enemy.id,
                enemy_position: enemy_pos,
                player_position: player_pos,
            });
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{Entity, PatrolData, Position, SpatialPos, TimeCube, VisionData};

    #[test]
    fn test_detection_discrete_delay_detected() {
        let mut cube = TimeCube::new(10, 10, 5);
        let player_start = Position::new(2, 2, 0);
        cube.spawn(Entity::player(player_start)).unwrap();

        let patrol = PatrolData::new(vec![SpatialPos::new(5, 2)], true);
        let vision = VisionData::omnidirectional(3);
        let enemy = Entity::enemy(Position::new(5, 2, 0), patrol, vision);
        cube.spawn(enemy).unwrap();
        cube.propagate_all().unwrap();

        let mut world_line = WorldLine::new(player_start);
        world_line.extend(Position::new(2, 2, 1)).unwrap();
        world_line.extend(Position::new(2, 2, 2)).unwrap();

        let config = DetectionConfig {
            model: DetectionModel::DiscreteDelay,
            delay_turns: 2,
            vision_radius: 5,
        };

        let result = check_detection(&cube, &world_line, &config);
        assert!(result.is_some());
    }

    #[test]
    fn test_detection_discrete_delay_blocked() {
        let mut cube = TimeCube::new(10, 10, 5);
        let player_start = Position::new(2, 2, 0);
        cube.spawn(Entity::player(player_start)).unwrap();
        cube.spawn(Entity::wall(Position::new(3, 2, 2))).unwrap();

        let patrol = PatrolData::new(vec![SpatialPos::new(5, 2)], true);
        let vision = VisionData::omnidirectional(3);
        let enemy = Entity::enemy(Position::new(5, 2, 0), patrol, vision);
        cube.spawn(enemy).unwrap();
        cube.propagate_all().unwrap();

        let mut world_line = WorldLine::new(player_start);
        world_line.extend(Position::new(2, 2, 1)).unwrap();
        world_line.extend(Position::new(2, 2, 2)).unwrap();

        let config = DetectionConfig {
            model: DetectionModel::DiscreteDelay,
            delay_turns: 2,
            vision_radius: 5,
        };

        let result = check_detection(&cube, &world_line, &config);
        assert!(result.is_none());
    }
}
