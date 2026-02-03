//! Entity definitions and factory helpers.

use crate::core::components::{Component, EntityId, PatrolData, RiftData, VisionData};
use crate::core::position::Position;

/// An entity in the game world.
///
/// Each TimeSlice owns its entity instances. The same EntityId across slices
/// represents the same logical entity (e.g., "wall #42" at t=0 and t=5).
#[derive(Debug, Clone)]
pub struct Entity {
    /// Unique identifier (consistent across time slices).
    pub id: EntityId,
    /// Position in space-time.
    pub position: Position,
    /// Components defining behavior.
    components: Vec<Component>,
    /// Display name (for debugging, optional).
    pub name: Option<String>,
}

/// Type of entity for quick filtering.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum EntityType {
    /// Player entity.
    Player,
    /// Enemy with vision.
    Enemy,
    /// Rift teleport.
    Rift,
    /// Exit tile.
    Exit,
    /// Pushable or pullable box.
    Box,
    /// Wall blocks movement and vision.
    Wall,
    /// Floor (no blocking components).
    Floor,
    /// Unrecognized combination.
    Custom,
}

fn validate_components(components: &[Component]) {
    let has_player = components.iter().any(|c| matches!(c, Component::Player));
    if has_player
        && components
            .iter()
            .any(|c| !matches!(c, Component::Player))
    {
        panic!("Player component cannot be combined with other components");
    }

    let mut rift_count = 0;
    let mut patrol_count = 0;
    let mut vision_count = 0;
    for component in components {
        match component {
            Component::Rift(_) => rift_count += 1,
            Component::Patrol(_) => patrol_count += 1,
            Component::VisionCone(_) => vision_count += 1,
            _ => {}
        }
    }

    if rift_count > 1 {
        panic!("Entity may only have one Rift component");
    }
    if patrol_count > 1 {
        panic!("Entity may only have one Patrol component");
    }
    if vision_count > 1 {
        panic!("Entity may only have one VisionCone component");
    }
}

impl Entity {
    /// Create a new entity with auto-generated ID.
    pub fn new(position: Position, components: Vec<Component>) -> Self {
        validate_components(&components);
        Self {
            id: EntityId::new_v4(),
            position,
            components,
            name: None,
        }
    }

    /// Create with a specific ID (for cloning across time slices).
    pub fn with_id(id: EntityId, position: Position, components: Vec<Component>) -> Self {
        validate_components(&components);
        Self {
            id,
            position,
            components,
            name: None,
        }
    }

    /// Get components (immutable).
    pub fn components(&self) -> &[Component] {
        &self.components
    }

    /// Check if entity has a component matching predicate.
    pub fn has<F>(&self, predicate: F) -> bool
    where
        F: Fn(&Component) -> bool,
    {
        self.components.iter().any(predicate)
    }

    /// Check if entity has a specific component variant.
    pub fn has_component(&self, component: &Component) -> bool {
        self.components.iter().any(|c| c == component)
    }

    /// Check if entity blocks movement.
    pub fn blocks_movement(&self) -> bool {
        self.has(|c| c.blocks_movement())
    }

    /// Check if entity blocks vision.
    pub fn blocks_vision(&self) -> bool {
        self.has(|c| c.blocks_vision())
    }

    /// Check if entity persists through time.
    pub fn is_time_persistent(&self) -> bool {
        self.has(|c| c.is_time_persistent())
    }

    /// Check if entity is the player.
    pub fn is_player(&self) -> bool {
        self.has(|c| matches!(c, Component::Player))
    }

    /// Check if entity is an enemy (has VisionCone).
    pub fn is_enemy(&self) -> bool {
        self.has(|c| matches!(c, Component::VisionCone(_)))
    }

    /// Check if entity is a rift.
    pub fn is_rift(&self) -> bool {
        self.has(|c| matches!(c, Component::Rift(_)))
    }

    /// Check if entity is the exit.
    pub fn is_exit(&self) -> bool {
        self.has(|c| matches!(c, Component::Exit))
    }

    /// Get entity type (uses precedence rules).
    pub fn entity_type(&self) -> EntityType {
        if self.is_player() {
            EntityType::Player
        } else if self.is_enemy() {
            EntityType::Enemy
        } else if self.is_rift() {
            EntityType::Rift
        } else if self.is_exit() {
            EntityType::Exit
        } else if self.has(|c| matches!(c, Component::Pushable | Component::Pullable)) {
            EntityType::Box
        } else if self.blocks_movement() && self.blocks_vision() {
            EntityType::Wall
        } else if !self.blocks_movement() && !self.blocks_vision() {
            EntityType::Floor
        } else {
            EntityType::Custom
        }
    }

    /// Get rift data if present.
    pub fn rift_data(&self) -> Option<&RiftData> {
        self.components.iter().find_map(|c| {
            if let Component::Rift(data) = c {
                Some(data)
            } else {
                None
            }
        })
    }

    /// Get patrol data if present.
    pub fn patrol_data(&self) -> Option<&PatrolData> {
        self.components.iter().find_map(|c| {
            if let Component::Patrol(data) = c {
                Some(data)
            } else {
                None
            }
        })
    }

    /// Get vision data if present.
    pub fn vision_data(&self) -> Option<&VisionData> {
        self.components.iter().find_map(|c| {
            if let Component::VisionCone(data) = c {
                Some(data)
            } else {
                None
            }
        })
    }

    /// Clone to a new position (same ID, new position).
    pub fn at_position(&self, pos: Position) -> Self {
        Self {
            id: self.id,
            position: pos,
            components: self.components.clone(),
            name: self.name.clone(),
        }
    }

    /// Clone to next time slice (t + 1), same spatial position.
    pub fn propagate_to_next_time(&self) -> Self {
        self.at_time(self.position.t + 1)
    }

    /// Clone to specific time slice, same spatial position.
    pub fn at_time(&self, t: i32) -> Self {
        self.at_position(Position::new(self.position.x, self.position.y, t))
    }
}

// Factory methods for common entity types.
impl Entity {
    /// Create a wall (blocks movement and vision, time-persistent).
    pub fn wall(position: Position) -> Self {
        Self::new(
            position,
            vec![
                Component::BlocksMovement,
                Component::BlocksVision,
                Component::TimePersistent,
            ],
        )
    }

    /// Create a floor (no blocking components, not time-persistent).
    pub fn floor(position: Position) -> Self {
        Self::new(position, Vec::new())
    }

    /// Create the player (not time-persistent — player position managed by WorldLine).
    pub fn player(position: Position) -> Self {
        Self::new(position, vec![Component::Player])
    }

    /// Create an enemy with patrol and vision (time-persistent).
    pub fn enemy(position: Position, patrol: PatrolData, vision: VisionData) -> Self {
        Self::new(
            position,
            vec![
                Component::Patrol(patrol),
                Component::VisionCone(vision),
                Component::TimePersistent,
            ],
        )
    }

    /// Create a pushable box (blocks movement, time-persistent).
    pub fn pushable_box(position: Position) -> Self {
        Self::new(
            position,
            vec![
                Component::Pushable,
                Component::BlocksMovement,
                Component::TimePersistent,
            ],
        )
    }

    /// Create a pullable (and pushable) box (blocks movement, time-persistent).
    pub fn pullable_box(position: Position) -> Self {
        Self::new(
            position,
            vec![
                Component::Pushable,
                Component::Pullable,
                Component::BlocksMovement,
                Component::TimePersistent,
            ],
        )
    }

    /// Create a rift (time-persistent — exists at all future time slices).
    pub fn rift(position: Position, target: Position, bidirectional: bool) -> Self {
        let rift = if bidirectional {
            RiftData::bidirectional(target)
        } else {
            RiftData::one_way(target)
        };
        Self::new(
            position,
            vec![Component::Rift(rift), Component::TimePersistent],
        )
    }

    /// Create the exit (time-persistent).
    pub fn exit(position: Position) -> Self {
        Self::new(position, vec![Component::Exit, Component::TimePersistent])
    }
}

/// Builder for creating entities with custom component combinations.
pub struct EntityBuilder {
    id: Option<EntityId>,
    position: Position,
    components: Vec<Component>,
    name: Option<String>,
}

impl EntityBuilder {
    /// Create a new builder for the given position.
    pub fn new(position: Position) -> Self {
        Self {
            id: None,
            position,
            components: Vec::new(),
            name: None,
        }
    }

    /// Set a specific entity ID.
    pub fn with_id(mut self, id: EntityId) -> Self {
        self.id = Some(id);
        self
    }

    /// Set a display name.
    pub fn with_name(mut self, name: impl Into<String>) -> Self {
        self.name = Some(name.into());
        self
    }

    /// Add a component.
    pub fn with_component(mut self, component: Component) -> Self {
        self.components.push(component);
        self
    }

    /// Add BlocksMovement.
    pub fn blocking(self) -> Self {
        self.with_component(Component::BlocksMovement)
    }

    /// Add BlocksVision.
    pub fn opaque(self) -> Self {
        self.with_component(Component::BlocksVision)
    }

    /// Add TimePersistent.
    pub fn persistent(self) -> Self {
        self.with_component(Component::TimePersistent)
    }

    /// Add Pushable.
    pub fn pushable(self) -> Self {
        self.with_component(Component::Pushable)
    }

    /// Add Pullable.
    pub fn pullable(self) -> Self {
        self.with_component(Component::Pullable)
    }

    /// Build the entity.
    pub fn build(self) -> Entity {
        validate_components(&self.components);
        let mut entity = if let Some(id) = self.id {
            Entity::with_id(id, self.position, self.components)
        } else {
            Entity::new(self.position, self.components)
        };
        entity.name = self.name;
        entity
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::position::{Direction, SpatialPos};

    #[test]
    fn test_entity_creation_generates_id() {
        let entity = Entity::new(Position::new(0, 0, 0), vec![]);
        assert_ne!(entity.id, EntityId::nil());
    }

    #[test]
    fn test_entity_with_specific_id() {
        let id = EntityId::new_v4();
        let entity = Entity::with_id(id, Position::new(1, 2, 3), vec![]);
        assert_eq!(entity.id, id);
    }

    #[test]
    fn test_entity_has_component() {
        let entity = Entity::new(Position::new(0, 0, 0), vec![Component::BlocksMovement]);
        assert!(entity.has(|c| matches!(c, Component::BlocksMovement)));
    }

    #[test]
    fn test_entity_blocks_movement() {
        let entity = Entity::new(Position::new(0, 0, 0), vec![Component::BlocksMovement]);
        assert!(entity.blocks_movement());
    }

    #[test]
    fn test_entity_blocks_vision() {
        let entity = Entity::new(Position::new(0, 0, 0), vec![Component::BlocksVision]);
        assert!(entity.blocks_vision());
    }

    #[test]
    fn test_entity_is_time_persistent() {
        let entity = Entity::new(Position::new(0, 0, 0), vec![Component::TimePersistent]);
        assert!(entity.is_time_persistent());
    }

    #[test]
    fn test_entity_is_player() {
        let entity = Entity::player(Position::new(1, 1, 0));
        assert!(entity.is_player());
    }

    #[test]
    fn test_entity_is_enemy() {
        let patrol = PatrolData::new(vec![SpatialPos::new(0, 0)], true);
        let vision = VisionData::new(2, Direction::North);
        let entity = Entity::enemy(Position::new(1, 1, 0), patrol, vision);
        assert!(entity.is_enemy());
    }

    #[test]
    fn test_entity_type_precedence_player() {
        let entity = Entity::player(Position::new(0, 0, 0));
        assert_eq!(entity.entity_type(), EntityType::Player);
    }

    #[test]
    fn test_entity_type_precedence_enemy() {
        let patrol = PatrolData::new(vec![SpatialPos::new(0, 0)], true);
        let vision = VisionData::new(1, Direction::North);
        let entity = Entity::enemy(Position::new(0, 0, 0), patrol, vision);
        assert_eq!(entity.entity_type(), EntityType::Enemy);
    }

    #[test]
    fn test_entity_type_precedence_wall() {
        let entity = Entity::wall(Position::new(0, 0, 0));
        assert_eq!(entity.entity_type(), EntityType::Wall);
    }

    #[test]
    fn test_entity_type_floor() {
        let entity = Entity::floor(Position::new(0, 0, 0));
        assert_eq!(entity.entity_type(), EntityType::Floor);
    }

    #[test]
    fn test_entity_type_custom() {
        let entity = Entity::new(Position::new(0, 0, 0), vec![Component::BlocksMovement]);
        assert_eq!(entity.entity_type(), EntityType::Custom);
    }

    #[test]
    fn test_entity_at_position_preserves_id() {
        let entity = Entity::new(Position::new(0, 0, 0), vec![]);
        let moved = entity.at_position(Position::new(1, 1, 1));
        assert_eq!(entity.id, moved.id);
    }

    #[test]
    fn test_entity_propagate_increments_time() {
        let entity = Entity::new(Position::new(0, 0, 0), vec![]);
        let next = entity.propagate_to_next_time();
        assert_eq!(next.position.t, 1);
    }

    #[test]
    fn test_factory_wall_components() {
        let entity = Entity::wall(Position::new(0, 0, 0));
        assert!(entity.blocks_movement());
        assert!(entity.blocks_vision());
        assert!(entity.is_time_persistent());
    }

    #[test]
    fn test_factory_enemy_components() {
        let patrol = PatrolData::new(vec![SpatialPos::new(0, 0)], true);
        let vision = VisionData::new(1, Direction::North);
        let entity = Entity::enemy(Position::new(0, 0, 0), patrol, vision);
        assert!(entity.is_enemy());
        assert!(entity.is_time_persistent());
    }

    #[test]
    fn test_builder_chaining() {
        let entity = EntityBuilder::new(Position::new(0, 0, 0))
            .blocking()
            .opaque()
            .persistent()
            .with_name("wall")
            .build();
        assert!(entity.blocks_movement());
        assert!(entity.blocks_vision());
        assert!(entity.is_time_persistent());
        assert_eq!(entity.name.as_deref(), Some("wall"));
    }

    #[test]
    #[should_panic]
    fn test_builder_rejects_duplicate_data_components() {
        let target = Position::new(1, 1, 0);
        let _ = EntityBuilder::new(Position::new(0, 0, 0))
            .with_component(Component::Rift(RiftData::one_way(target)))
            .with_component(Component::Rift(RiftData::one_way(target)))
            .build();
    }

    #[test]
    #[should_panic]
    fn test_player_cannot_have_other_components() {
        let _ = EntityBuilder::new(Position::new(0, 0, 0))
            .with_component(Component::Player)
            .with_component(Component::BlocksMovement)
            .build();
    }
}
