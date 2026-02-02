//! The complete 3D Space-Time Cube.

use crate::core::components::EntityId;
use crate::core::entity::Entity;
use crate::core::position::Position;
use crate::core::propagation;
use crate::core::propagation::PropagationResult;
use crate::core::time_slice::TimeSlice;

/// The complete Space-Time Cube.
///
/// Valid coordinates: 0 <= x < width, 0 <= y < height, 0 <= t < time_depth
#[derive(Debug, Clone)]
pub struct TimeCube {
    /// Grid dimensions (spatial).
    pub width: i32,
    /// Grid dimensions (spatial).
    pub height: i32,
    /// Number of time slices (0 to time_depth - 1).
    pub time_depth: i32,
    /// Time slices, indexed by t.
    slices: Vec<TimeSlice>,
}

/// Error types for cube operations.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum CubeError {
    /// Position out of bounds.
    #[error("Position out of bounds: ({x}, {y}, {t}) - valid range: x=[0,{max_x}), y=[0,{max_y}), t=[0,{max_t})")]
    OutOfBounds {
        /// X coordinate.
        x: i32,
        /// Y coordinate.
        y: i32,
        /// T coordinate.
        t: i32,
        /// Max x.
        max_x: i32,
        /// Max y.
        max_y: i32,
        /// Max t.
        max_t: i32,
    },
    /// Entity not found.
    #[error("Entity not found: {0}")]
    EntityNotFound(EntityId),
    /// Entity already exists in slice.
    #[error("Entity already exists: {id} at t={t}")]
    EntityAlreadyExists {
        /// Entity id.
        id: EntityId,
        /// Time slice.
        t: i32,
    },
    /// Time slice not found.
    #[error("Time slice not found: t={0}")]
    TimeSliceNotFound(i32),
    /// Position blocked.
    #[error("Position blocked: ({x}, {y}, {t})")]
    PositionBlocked {
        /// X coordinate.
        x: i32,
        /// Y coordinate.
        y: i32,
        /// T coordinate.
        t: i32,
    },
}

impl TimeCube {
    /// Create an empty cube with given dimensions.
    pub fn new(width: i32, height: i32, time_depth: i32) -> Self {
        let depth = if time_depth < 0 { 0 } else { time_depth };
        let mut slices = Vec::new();
        for t in 0..depth {
            slices.push(TimeSlice::new(t, width, height));
        }
        Self {
            width,
            height,
            time_depth: depth,
            slices,
        }
    }

    /// Check if position is within bounds.
    pub fn in_bounds(&self, pos: Position) -> bool {
        pos.x >= 0
            && pos.y >= 0
            && pos.t >= 0
            && pos.x < self.width
            && pos.y < self.height
            && pos.t < self.time_depth
    }

    /// Validate position, return error if out of bounds.
    pub fn validate_position(&self, pos: Position) -> Result<(), CubeError> {
        if self.in_bounds(pos) {
            Ok(())
        } else {
            Err(CubeError::OutOfBounds {
                x: pos.x,
                y: pos.y,
                t: pos.t,
                max_x: self.width,
                max_y: self.height,
                max_t: self.time_depth,
            })
        }
    }

    /// Get a time slice (immutable).
    pub fn slice(&self, t: i32) -> Option<&TimeSlice> {
        if t < 0 {
            return None;
        }
        self.slices.get(t as usize)
    }

    /// Get a time slice (mutable).
    pub fn slice_mut(&mut self, t: i32) -> Option<&mut TimeSlice> {
        if t < 0 {
            return None;
        }
        self.slices.get_mut(t as usize)
    }

    /// Get entity by ID at a specific time.
    pub fn entity_at_time(&self, id: EntityId, t: i32) -> Option<&Entity> {
        self.slice(t).and_then(|slice| slice.entity(id))
    }

    /// Get all entities at a position.
    pub fn entities_at(&self, pos: Position) -> Vec<&Entity> {
        if !self.in_bounds(pos) {
            return Vec::new();
        }
        self.slice(pos.t)
            .map(|slice| slice.entities_at(pos.spatial()))
            .unwrap_or_default()
    }

    /// Get all entity IDs at a position.
    pub fn entity_ids_at(&self, pos: Position) -> Vec<EntityId> {
        if !self.in_bounds(pos) {
            return Vec::new();
        }
        self.slice(pos.t)
            .map(|slice| slice.entity_ids_at(pos.spatial()))
            .unwrap_or_default()
    }

    /// Spawn an entity at its position's time slice.
    /// Returns EntityAlreadyExists if an entity with same ID exists in that slice.
    pub fn spawn(&mut self, entity: Entity) -> Result<EntityId, CubeError> {
        self.validate_position(entity.position)?;
        let id = entity.id;
        let t = entity.position.t;
        let slice = self
            .slice_mut(t)
            .ok_or(CubeError::TimeSliceNotFound(t))?;
        if slice.entity(entity.id).is_some() {
            return Err(CubeError::EntityAlreadyExists { id: entity.id, t });
        }
        slice.add_entity(entity);
        Ok(id)
    }

    /// Spawn and propagate: add entity and clone to all future slices if time-persistent.
    /// Returns EntityAlreadyExists on first conflict (no partial propagation).
    pub fn spawn_and_propagate(&mut self, entity: Entity) -> Result<EntityId, CubeError> {
        self.validate_position(entity.position)?;
        let start_t = entity.position.t;
        let is_persistent = entity.is_time_persistent();

        if let Some(slice) = self.slice(start_t)
            && slice.entity(entity.id).is_some()
        {
            return Err(CubeError::EntityAlreadyExists {
                id: entity.id,
                t: start_t,
            });
        }

        if is_persistent {
            for t in (start_t + 1)..self.time_depth {
                if let Some(slice) = self.slice(t)
                    && slice.entity(entity.id).is_some()
                {
                    return Err(CubeError::EntityAlreadyExists { id: entity.id, t });
                }
            }
        }

        self.spawn(entity.clone())?;
        if is_persistent {
            for t in (start_t + 1)..self.time_depth {
                if let Some(slice) = self.slice_mut(t) {
                    slice.add_entity(entity.at_time(t));
                }
            }
        }
        Ok(entity.id)
    }

    /// Spawn or replace: overwrites any existing entity with same ID in target slice.
    /// Does NOT propagate to future slices, even if time-persistent.
    /// Use for updating entity state (e.g., moving player between slices).
    pub fn spawn_or_replace(&mut self, entity: Entity) -> Result<EntityId, CubeError> {
        self.validate_position(entity.position)?;
        let id = entity.id;
        let t = entity.position.t;
        let slice = self
            .slice_mut(t)
            .ok_or(CubeError::TimeSliceNotFound(t))?;
        slice.add_entity(entity);
        Ok(id)
    }

    /// Remove an entity from a specific time slice.
    pub fn despawn_at(&mut self, id: EntityId, t: i32) -> Result<Entity, CubeError> {
        let slice = self
            .slice_mut(t)
            .ok_or(CubeError::TimeSliceNotFound(t))?;
        slice.remove_entity(id).ok_or(CubeError::EntityNotFound(id))
    }

    /// Remove an entity from all time slices.
    pub fn despawn_all(&mut self, id: EntityId) -> Vec<Entity> {
        let mut removed = Vec::new();
        for slice in &mut self.slices {
            if let Some(entity) = slice.remove_entity(id) {
                removed.push(entity);
            }
        }
        removed
    }

    /// Check if position blocks movement.
    pub fn blocks_movement(&self, pos: Position) -> bool {
        if !self.in_bounds(pos) {
            return false;
        }
        self.slice(pos.t)
            .map(|slice| slice.blocks_movement_at(pos.spatial()))
            .unwrap_or(false)
    }

    /// Check if position blocks vision.
    pub fn blocks_vision(&self, pos: Position) -> bool {
        if !self.in_bounds(pos) {
            return false;
        }
        self.slice(pos.t)
            .map(|slice| slice.blocks_vision_at(pos.spatial()))
            .unwrap_or(false)
    }

    /// Check if position is walkable.
    pub fn is_walkable(&self, pos: Position) -> bool {
        if !self.in_bounds(pos) {
            return false;
        }
        self.slice(pos.t)
            .map(|slice| slice.is_walkable(pos.spatial()))
            .unwrap_or(false)
    }

    /// Check if position has a rift.
    pub fn has_rift(&self, pos: Position) -> bool {
        if !self.in_bounds(pos) {
            return false;
        }
        self.slice(pos.t)
            .map(|slice| slice.has_rift_at(pos.spatial()))
            .unwrap_or(false)
    }

    /// Get rift target from a position.
    pub fn rift_target(&self, pos: Position) -> Option<Position> {
        if !self.in_bounds(pos) {
            return None;
        }
        self.slice(pos.t)
            .and_then(|slice| slice.rift_target_at(pos.spatial()))
    }

    /// Check if position is the exit.
    pub fn is_exit(&self, pos: Position) -> bool {
        if !self.in_bounds(pos) {
            return false;
        }
        self.slice(pos.t)
            .map(|slice| slice.is_exit_at(pos.spatial()))
            .unwrap_or(false)
    }

    /// Get the player at a specific time.
    pub fn player_at(&self, t: i32) -> Option<&Entity> {
        self.slice(t).and_then(|slice| slice.player())
    }

    /// Get all enemies at a specific time.
    pub fn enemies_at(&self, t: i32) -> Vec<&Entity> {
        self.slice(t).map(|slice| slice.enemies()).unwrap_or_default()
    }

    /// Propagate all time-persistent entities from t to t+1.
    pub fn propagate_slice(&mut self, from_t: i32) -> Result<usize, CubeError> {
        let result = propagation::propagate_from_with_options(
            self,
            from_t,
            propagation::PropagationOptions {
                stop_at: Some(from_t + 1),
                ..Default::default()
            },
        )?;
        Ok(result.context.slices_updated)
    }

    /// Propagate all time-persistent entities from t=0 to time_depth-1.
    pub fn propagate_all(&mut self) -> Result<PropagationResult, CubeError> {
        propagation::propagate_from(self, 0)
    }

    /// Iterator over all time slices.
    pub fn slices(&self) -> impl Iterator<Item = &TimeSlice> {
        self.slices.iter()
    }

    /// Iterator over all time slices (mutable).
    pub fn slices_mut(&mut self) -> impl Iterator<Item = &mut TimeSlice> {
        self.slices.iter_mut()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::components::{PatrolData, VisionData};
    use crate::core::position::{Direction, SpatialPos};

    #[test]
    fn test_cube_creation() {
        let cube = TimeCube::new(10, 10, 3);
        assert_eq!(cube.width, 10);
        assert_eq!(cube.height, 10);
        assert_eq!(cube.time_depth, 3);
        assert_eq!(cube.slices().count(), 3);
    }

    #[test]
    fn test_cube_in_bounds_valid() {
        let cube = TimeCube::new(10, 10, 3);
        assert!(cube.in_bounds(Position::new(0, 0, 0)));
        assert!(cube.in_bounds(Position::new(9, 9, 2)));
    }

    #[test]
    fn test_cube_in_bounds_invalid_negative() {
        let cube = TimeCube::new(10, 10, 3);
        assert!(!cube.in_bounds(Position::new(-1, 0, 0)));
        assert!(!cube.in_bounds(Position::new(0, -1, 0)));
        assert!(!cube.in_bounds(Position::new(0, 0, -1)));
    }

    #[test]
    fn test_cube_in_bounds_invalid_overflow() {
        let cube = TimeCube::new(10, 10, 3);
        assert!(!cube.in_bounds(Position::new(10, 0, 0)));
        assert!(!cube.in_bounds(Position::new(0, 10, 0)));
        assert!(!cube.in_bounds(Position::new(0, 0, 3)));
    }

    #[test]
    fn test_validate_position_error_message() {
        let cube = TimeCube::new(2, 2, 2);
        let err = cube.validate_position(Position::new(3, 0, 0)).unwrap_err();
        match err {
            CubeError::OutOfBounds { max_x, .. } => assert_eq!(max_x, 2),
            _ => panic!("expected OutOfBounds"),
        }
    }

    #[test]
    fn test_spawn_entity() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn(entity).unwrap();
        assert!(cube.entity_at_time(id, 0).is_some());
    }

    #[test]
    fn test_spawn_entity_already_exists() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn(entity.clone()).unwrap();
        let err = cube.spawn(entity).unwrap_err();
        assert_eq!(err, CubeError::EntityAlreadyExists { id, t: 0 });
    }

    #[test]
    fn test_spawn_out_of_bounds() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::wall(Position::new(10, 1, 0));
        assert!(matches!(
            cube.spawn(entity).unwrap_err(),
            CubeError::OutOfBounds { .. }
        ));
    }

    #[test]
    fn test_spawn_and_propagate() {
        let mut cube = TimeCube::new(5, 5, 3);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn_and_propagate(entity).unwrap();
        assert!(cube.entity_at_time(id, 0).is_some());
        assert!(cube.entity_at_time(id, 1).is_some());
        assert!(cube.entity_at_time(id, 2).is_some());
    }

    #[test]
    fn test_spawn_and_propagate_conflict() {
        let mut cube = TimeCube::new(5, 5, 3);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn_and_propagate(entity.clone()).unwrap();
        let err = cube.spawn_and_propagate(entity).unwrap_err();
        assert_eq!(err, CubeError::EntityAlreadyExists { id, t: 0 });
    }

    #[test]
    fn test_spawn_or_replace() {
        let mut cube = TimeCube::new(5, 5, 2);
        let mut entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn(entity.clone()).unwrap();
        entity.position = Position::new(2, 2, 0);
        cube.spawn_or_replace(entity).unwrap();
        let stored = cube.entity_at_time(id, 0).unwrap();
        assert_eq!(stored.position.spatial(), SpatialPos::new(2, 2));
    }

    #[test]
    fn test_despawn_at() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn(entity).unwrap();
        let removed = cube.despawn_at(id, 0).unwrap();
        assert_eq!(removed.id, id);
        assert!(cube.entity_at_time(id, 0).is_none());
    }

    #[test]
    fn test_despawn_all() {
        let mut cube = TimeCube::new(5, 5, 3);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn_and_propagate(entity).unwrap();
        let removed = cube.despawn_all(id);
        assert_eq!(removed.len(), 3);
        assert!(cube.entity_at_time(id, 0).is_none());
        assert!(cube.entity_at_time(id, 1).is_none());
        assert!(cube.entity_at_time(id, 2).is_none());
    }

    #[test]
    fn test_entities_at() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn(entity).unwrap();
        let entities = cube.entities_at(Position::new(1, 1, 0));
        assert_eq!(entities.len(), 1);
        assert_eq!(entities[0].id, id);
    }

    #[test]
    fn test_blocks_movement() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::wall(Position::new(1, 1, 0));
        cube.spawn(entity).unwrap();
        assert!(cube.blocks_movement(Position::new(1, 1, 0)));
    }

    #[test]
    fn test_blocks_vision() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::wall(Position::new(1, 1, 0));
        cube.spawn(entity).unwrap();
        assert!(cube.blocks_vision(Position::new(1, 1, 0)));
    }

    #[test]
    fn test_is_walkable() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::wall(Position::new(1, 1, 0));
        cube.spawn(entity).unwrap();
        assert!(!cube.is_walkable(Position::new(1, 1, 0)));
        assert!(cube.is_walkable(Position::new(2, 2, 0)));
    }

    #[test]
    fn test_has_rift() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::rift(Position::new(1, 1, 0), Position::new(2, 2, 0), false);
        cube.spawn(entity).unwrap();
        assert!(cube.has_rift(Position::new(1, 1, 0)));
    }

    #[test]
    fn test_rift_target() {
        let mut cube = TimeCube::new(5, 5, 2);
        let target = Position::new(2, 2, 0);
        let entity = Entity::rift(Position::new(1, 1, 0), target, false);
        cube.spawn(entity).unwrap();
        assert_eq!(cube.rift_target(Position::new(1, 1, 0)), Some(target));
    }

    #[test]
    fn test_is_exit() {
        let mut cube = TimeCube::new(5, 5, 2);
        let entity = Entity::exit(Position::new(1, 1, 0));
        cube.spawn(entity).unwrap();
        assert!(cube.is_exit(Position::new(1, 1, 0)));
    }

    #[test]
    fn test_player_at() {
        let mut cube = TimeCube::new(5, 5, 2);
        let player = Entity::player(Position::new(1, 1, 0));
        cube.spawn(player).unwrap();
        assert!(cube.player_at(0).is_some());
    }

    #[test]
    fn test_enemies_at() {
        let mut cube = TimeCube::new(5, 5, 2);
        let patrol = PatrolData::new(vec![SpatialPos::new(0, 0)], true);
        let vision = VisionData::new(1, Direction::North);
        let enemy = Entity::enemy(Position::new(1, 1, 0), patrol, vision);
        cube.spawn(enemy).unwrap();
        assert_eq!(cube.enemies_at(0).len(), 1);
    }

    #[test]
    fn test_propagate_slice() {
        let mut cube = TimeCube::new(5, 5, 3);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn(entity).unwrap();
        cube.propagate_slice(0).unwrap();
        assert!(cube.entity_at_time(id, 1).is_some());
    }

    #[test]
    fn test_propagate_all() {
        let mut cube = TimeCube::new(5, 5, 3);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        cube.spawn(entity).unwrap();
        cube.propagate_all().unwrap();
        assert!(cube.entity_at_time(id, 1).is_some());
        assert!(cube.entity_at_time(id, 2).is_some());
    }
}
