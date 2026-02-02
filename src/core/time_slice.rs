//! 2D snapshot of the world at a specific time.

use std::collections::HashMap;

use crate::core::components::EntityId;
use crate::core::entity::Entity;
use crate::core::position::{Position, SpatialPos};

/// A 2D snapshot of the world at time t.
///
/// Each slice owns its entity instances. Entities are cloned when propagated.
#[derive(Debug, Clone)]
pub struct TimeSlice {
    /// The time coordinate.
    pub t: i32,
    /// Grid width.
    pub width: i32,
    /// Grid height.
    pub height: i32,
    /// All entities in this slice, keyed by ID.
    entities: HashMap<EntityId, Entity>,
    /// Spatial index: positions -> entity IDs at that position.
    spatial_index: HashMap<SpatialPos, Vec<EntityId>>,
}

impl TimeSlice {
    /// Create an empty time slice.
    pub fn new(t: i32, width: i32, height: i32) -> Self {
        Self {
            t,
            width,
            height,
            entities: HashMap::new(),
            spatial_index: HashMap::new(),
        }
    }

    /// Check if a spatial position is within bounds.
    pub fn in_bounds(&self, pos: SpatialPos) -> bool {
        pos.x >= 0 && pos.y >= 0 && pos.x < self.width && pos.y < self.height
    }

    /// Get entity IDs at a position (returns empty Vec if none).
    pub fn entity_ids_at(&self, pos: SpatialPos) -> Vec<EntityId> {
        self.spatial_index
            .get(&pos)
            .cloned()
            .unwrap_or_default()
    }

    /// Get entities at a position.
    pub fn entities_at(&self, pos: SpatialPos) -> Vec<&Entity> {
        self.entity_ids_at(pos)
            .iter()
            .filter_map(|id| self.entities.get(id))
            .collect()
    }

    /// Get entity by ID.
    pub fn entity(&self, id: EntityId) -> Option<&Entity> {
        self.entities.get(&id)
    }

    /// Get entity by ID (mutable).
    pub fn entity_mut(&mut self, id: EntityId) -> Option<&mut Entity> {
        self.entities.get_mut(&id)
    }

    /// Add an entity to this slice.
    /// If an entity with the same ID already exists, it is overwritten.
    pub fn add_entity(&mut self, entity: Entity) {
        let id = entity.id;
        if let Some(existing) = self.entities.get(&entity.id) {
            let old_pos = existing.position.spatial();
            self.remove_from_index(old_pos, entity.id);
        }

        let pos = entity.position.spatial();
        self.entities.insert(id, entity);
        self.add_to_index(pos, id);
    }

    /// Remove an entity by ID, returns the entity if found.
    pub fn remove_entity(&mut self, id: EntityId) -> Option<Entity> {
        let removed = self.entities.remove(&id)?;
        self.remove_from_index(removed.position.spatial(), id);
        Some(removed)
    }

    /// Move an entity to a new spatial position within this slice.
    ///
    /// **Atomicity:** Updates `Entity.position.x/y` AND `spatial_index` together.
    /// On success, both are updated. On failure, neither is modified.
    ///
    /// **Returns:**
    /// - `true`: Entity found, position and index updated.
    /// - `false`: Entity not found (id doesn't exist in this slice).
    ///
    /// **Note:** Does NOT check bounds or walkability — caller must validate.
    /// The entity's `t` coordinate is NOT modified (stays at slice's `t`).
    pub fn move_entity(&mut self, id: EntityId, to: SpatialPos) -> bool {
        let (from, t) = match self.entities.get(&id) {
            Some(entity) => (entity.position.spatial(), entity.position.t),
            None => return false,
        };
        if from == to {
            return true;
        }
        self.remove_from_index(from, id);
        if let Some(entity) = self.entities.get_mut(&id) {
            entity.position = Position::new(to.x, to.y, t);
        }
        self.add_to_index(to, id);
        true
    }

    /// Check if position blocks movement.
    pub fn blocks_movement_at(&self, pos: SpatialPos) -> bool {
        self.entities_at(pos).iter().any(|e| e.blocks_movement())
    }

    /// Check if position blocks vision.
    pub fn blocks_vision_at(&self, pos: SpatialPos) -> bool {
        self.entities_at(pos).iter().any(|e| e.blocks_vision())
    }

    /// Check if position is walkable (in bounds and not blocked).
    pub fn is_walkable(&self, pos: SpatialPos) -> bool {
        self.in_bounds(pos) && !self.blocks_movement_at(pos)
    }

    /// Check if position has a rift.
    pub fn has_rift_at(&self, pos: SpatialPos) -> bool {
        self.entities_at(pos).iter().any(|e| e.is_rift())
    }

    /// Check if position is the exit.
    pub fn is_exit_at(&self, pos: SpatialPos) -> bool {
        self.entities_at(pos).iter().any(|e| e.is_exit())
    }

    /// Get rift target from a position (if rift exists).
    pub fn rift_target_at(&self, pos: SpatialPos) -> Option<Position> {
        self.entities_at(pos)
            .iter()
            .find_map(|e| e.rift_data().map(|data| data.target))
    }

    /// Get all entities.
    pub fn all_entities(&self) -> impl Iterator<Item = &Entity> {
        self.entities.values()
    }

    /// Get all entity IDs.
    pub fn all_entity_ids(&self) -> impl Iterator<Item = EntityId> + '_ {
        self.entities.keys().copied()
    }

    /// Get all occupied positions.
    pub fn occupied_positions(&self) -> impl Iterator<Item = SpatialPos> + '_ {
        self.spatial_index.keys().cloned()
    }

    /// Count entities.
    pub fn entity_count(&self) -> usize {
        self.entities.len()
    }

    /// Clear all entities.
    pub fn clear(&mut self) {
        self.entities.clear();
        self.spatial_index.clear();
    }

    /// Find the player entity.
    pub fn player(&self) -> Option<&Entity> {
        self.entities.values().find(|e| e.is_player())
    }

    /// Find all enemies.
    pub fn enemies(&self) -> Vec<&Entity> {
        self.entities.values().filter(|e| e.is_enemy()).collect()
    }

    fn add_to_index(&mut self, pos: SpatialPos, id: EntityId) {
        let entry = self.spatial_index.entry(pos).or_default();
        if !entry.contains(&id) {
            entry.push(id);
        }
    }

    fn remove_from_index(&mut self, pos: SpatialPos, id: EntityId) {
        if let Some(entry) = self.spatial_index.get_mut(&pos) {
            entry.retain(|existing| *existing != id);
            if entry.is_empty() {
                self.spatial_index.remove(&pos);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::components::{PatrolData, VisionData};
    use crate::core::entity::Entity;
    use crate::core::position::{Direction, SpatialPos};

    #[test]
    fn test_time_slice_creation() {
        let slice = TimeSlice::new(0, 10, 10);
        assert_eq!(slice.t, 0);
        assert_eq!(slice.width, 10);
        assert_eq!(slice.height, 10);
    }

    #[test]
    fn test_in_bounds() {
        let slice = TimeSlice::new(0, 5, 5);
        assert!(slice.in_bounds(SpatialPos::new(0, 0)));
        assert!(!slice.in_bounds(SpatialPos::new(5, 0)));
        assert!(!slice.in_bounds(SpatialPos::new(-1, 0)));
    }

    #[test]
    fn test_add_entity() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        slice.add_entity(entity);
        assert!(slice.entity(id).is_some());
        assert_eq!(slice.entity_count(), 1);
    }

    #[test]
    fn test_remove_entity() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        slice.add_entity(entity);
        let removed = slice.remove_entity(id);
        assert!(removed.is_some());
        assert!(slice.entity(id).is_none());
    }

    #[test]
    fn test_entity_ids_at_empty_returns_empty_vec() {
        let slice = TimeSlice::new(0, 5, 5);
        let ids = slice.entity_ids_at(SpatialPos::new(1, 1));
        assert!(ids.is_empty());
    }

    #[test]
    fn test_entity_ids_at_multiple() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let a = Entity::wall(Position::new(1, 1, 0));
        let b = Entity::exit(Position::new(1, 1, 0));
        let aid = a.id;
        let bid = b.id;
        slice.add_entity(a);
        slice.add_entity(b);
        let ids = slice.entity_ids_at(SpatialPos::new(1, 1));
        assert!(ids.contains(&aid));
        assert!(ids.contains(&bid));
    }

    #[test]
    fn test_entities_at() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        slice.add_entity(entity);
        let entities = slice.entities_at(SpatialPos::new(1, 1));
        assert_eq!(entities.len(), 1);
        assert_eq!(entities[0].id, id);
    }

    #[test]
    fn test_move_entity_updates_index() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        slice.add_entity(entity);
        let moved = slice.move_entity(id, SpatialPos::new(2, 1));
        assert!(moved);
        assert!(slice.entities_at(SpatialPos::new(1, 1)).is_empty());
        assert_eq!(slice.entities_at(SpatialPos::new(2, 1)).len(), 1);
    }

    #[test]
    fn test_blocks_movement_at() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::wall(Position::new(1, 1, 0));
        slice.add_entity(entity);
        assert!(slice.blocks_movement_at(SpatialPos::new(1, 1)));
    }

    #[test]
    fn test_blocks_vision_at() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::wall(Position::new(1, 1, 0));
        slice.add_entity(entity);
        assert!(slice.blocks_vision_at(SpatialPos::new(1, 1)));
    }

    #[test]
    fn test_is_walkable() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::wall(Position::new(1, 1, 0));
        slice.add_entity(entity);
        assert!(!slice.is_walkable(SpatialPos::new(1, 1)));
        assert!(slice.is_walkable(SpatialPos::new(2, 2)));
    }

    #[test]
    fn test_has_rift_at() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::rift(Position::new(1, 1, 0), Position::new(2, 2, 0), false);
        slice.add_entity(entity);
        assert!(slice.has_rift_at(SpatialPos::new(1, 1)));
    }

    #[test]
    fn test_rift_target_at() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let target = Position::new(2, 2, 0);
        let entity = Entity::rift(Position::new(1, 1, 0), target, false);
        slice.add_entity(entity);
        assert_eq!(slice.rift_target_at(SpatialPos::new(1, 1)), Some(target));
    }

    #[test]
    fn test_is_exit_at() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::exit(Position::new(1, 1, 0));
        slice.add_entity(entity);
        assert!(slice.is_exit_at(SpatialPos::new(1, 1)));
    }

    #[test]
    fn test_player_lookup() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let player = Entity::player(Position::new(1, 1, 0));
        slice.add_entity(player);
        assert!(slice.player().is_some());
    }

    #[test]
    fn test_enemies_lookup() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let patrol = PatrolData::new(vec![SpatialPos::new(0, 0)], true);
        let vision = VisionData::new(1, Direction::North);
        let enemy = Entity::enemy(Position::new(1, 1, 0), patrol, vision);
        slice.add_entity(enemy);
        assert_eq!(slice.enemies().len(), 1);
    }

    #[test]
    fn test_clear() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let entity = Entity::wall(Position::new(1, 1, 0));
        slice.add_entity(entity);
        slice.clear();
        assert_eq!(slice.entity_count(), 0);
    }

    #[test]
    fn test_add_entity_overwrites_existing() {
        let mut slice = TimeSlice::new(0, 5, 5);
        let mut entity = Entity::wall(Position::new(1, 1, 0));
        let id = entity.id;
        slice.add_entity(entity.clone());
        entity.position = Position::new(2, 2, 0);
        slice.add_entity(entity);
        let stored = slice.entity(id).unwrap();
        assert_eq!(stored.position.spatial(), SpatialPos::new(2, 2));
    }
}
