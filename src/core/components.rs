//! Component definitions and data.

use crate::core::position::{Direction, Position, SpatialPos};

/// Unique identifier for entities. Consistent across time slices for the same logical entity.
pub type EntityId = uuid::Uuid;

/// All possible components an entity can have.
#[derive(Debug, Clone, PartialEq)]
pub enum Component {
    /// Blocks other entities from occupying this space.
    BlocksMovement,
    /// Blocks enemy vision (line of sight).
    BlocksVision,
    /// Can be pushed by the player.
    Pushable,
    /// Can be pulled by the player.
    Pullable,
    /// Propagates forward through time automatically.
    TimePersistent,
    /// Follows a deterministic patrol path (enemies).
    Patrol(PatrolData),
    /// Emits a vision cone for detection (enemies).
    VisionCone(VisionData),
    /// Teleports player to target position when activated.
    Rift(RiftData),
    /// Marks this as the level exit (win condition).
    Exit,
    /// Marks this as the player (exactly one per level).
    Player,
}

/// Data for patrol behavior.
#[derive(Debug, Clone, PartialEq)]
pub struct PatrolData {
    /// Sequence of spatial positions to visit (must be non-empty).
    pub path: Vec<SpatialPos>,
    /// Whether to loop back to start (true) or stop at end (false).
    pub loops: bool,
}

/// Data for vision cone (light cone detection).
#[derive(Debug, Clone, PartialEq)]
pub struct VisionData {
    /// Speed of light in tiles per turn (e.g., 3 means sees 3 tiles away instantly).
    pub light_speed: u32,
    /// Direction the enemy is facing (affects FOV center).
    pub facing: Direction,
    /// Field of view in degrees (default: 90 for quarter circle, 360 for omnidirectional).
    pub fov_degrees: u32,
}

/// Data for rift teleportation.
#[derive(Debug, Clone, PartialEq)]
pub struct RiftData {
    /// Target position (x, y, t) - can jump in time.
    pub target: Position,
    /// Whether player can travel both directions.
    pub bidirectional: bool,
}

impl Component {
    /// Check if this component blocks movement.
    pub fn blocks_movement(&self) -> bool {
        matches!(self, Component::BlocksMovement)
    }

    /// Check if this component blocks vision.
    pub fn blocks_vision(&self) -> bool {
        matches!(self, Component::BlocksVision)
    }

    /// Check if this component marks entity as time-persistent.
    pub fn is_time_persistent(&self) -> bool {
        matches!(self, Component::TimePersistent)
    }
}

impl PatrolData {
    /// Create a new patrol path (panics if path is empty).
    pub fn new(path: Vec<SpatialPos>, loops: bool) -> Self {
        assert!(!path.is_empty(), "patrol path must be non-empty");
        Self { path, loops }
    }

    /// Get position at time t (deterministic computation).
    /// Precondition: t >= 0 (validated by TimeCube/level loader).
    pub fn position_at(&self, t: i32) -> SpatialPos {
        assert!(t >= 0, "patrol position requires non-negative time");
        let index = if self.loops {
            (t as usize) % self.path.len()
        } else {
            (t as usize).min(self.path.len() - 1)
        };
        self.path[index]
    }

    /// Get the path length.
    pub fn len(&self) -> usize {
        self.path.len()
    }

    /// Returns true if the path is empty.
    pub fn is_empty(&self) -> bool {
        self.path.is_empty()
    }
}

impl VisionData {
    /// Create with default FOV (90 degrees, forward-facing cone).
    pub fn new(light_speed: u32, facing: Direction) -> Self {
        Self::with_fov(light_speed, facing, 90)
    }

    /// Create with custom FOV.
    pub fn with_fov(light_speed: u32, facing: Direction, fov_degrees: u32) -> Self {
        Self {
            light_speed,
            facing,
            fov_degrees,
        }
    }

    /// Create omnidirectional vision (360 degrees).
    pub fn omnidirectional(light_speed: u32) -> Self {
        Self::with_fov(light_speed, Direction::North, 360)
    }
}

impl RiftData {
    /// Create a one-way rift.
    pub fn one_way(target: Position) -> Self {
        Self {
            target,
            bidirectional: false,
        }
    }

    /// Create a bidirectional rift.
    pub fn bidirectional(target: Position) -> Self {
        Self {
            target,
            bidirectional: true,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_component_blocks_movement() {
        assert!(Component::BlocksMovement.blocks_movement());
        assert!(!Component::BlocksVision.blocks_movement());
    }

    #[test]
    fn test_component_blocks_vision() {
        assert!(Component::BlocksVision.blocks_vision());
        assert!(!Component::BlocksMovement.blocks_vision());
    }

    #[test]
    fn test_component_is_time_persistent() {
        assert!(Component::TimePersistent.is_time_persistent());
        assert!(!Component::Exit.is_time_persistent());
    }

    #[test]
    fn test_patrol_position_at_loops() {
        let patrol = PatrolData::new(
            vec![SpatialPos::new(0, 0), SpatialPos::new(1, 0)],
            true,
        );
        assert_eq!(patrol.position_at(0), SpatialPos::new(0, 0));
        assert_eq!(patrol.position_at(1), SpatialPos::new(1, 0));
        assert_eq!(patrol.position_at(2), SpatialPos::new(0, 0));
    }

    #[test]
    fn test_patrol_position_at_no_loop() {
        let patrol = PatrolData::new(
            vec![SpatialPos::new(0, 0), SpatialPos::new(1, 0)],
            false,
        );
        assert_eq!(patrol.position_at(0), SpatialPos::new(0, 0));
        assert_eq!(patrol.position_at(1), SpatialPos::new(1, 0));
        assert_eq!(patrol.position_at(2), SpatialPos::new(1, 0));
    }

    #[test]
    #[should_panic]
    fn test_patrol_empty_panics() {
        let _ = PatrolData::new(Vec::new(), false);
    }

    #[test]
    fn test_vision_data_default_fov() {
        let vision = VisionData::new(3, Direction::South);
        assert_eq!(vision.light_speed, 3);
        assert_eq!(vision.facing, Direction::South);
        assert_eq!(vision.fov_degrees, 90);
    }

    #[test]
    fn test_vision_data_omnidirectional() {
        let vision = VisionData::omnidirectional(5);
        assert_eq!(vision.light_speed, 5);
        assert_eq!(vision.fov_degrees, 360);
    }

    #[test]
    fn test_rift_one_way() {
        let target = Position::new(1, 2, 3);
        let rift = RiftData::one_way(target);
        assert!(!rift.bidirectional);
        assert_eq!(rift.target, target);
    }

    #[test]
    fn test_rift_bidirectional() {
        let target = Position::new(1, 2, 3);
        let rift = RiftData::bidirectional(target);
        assert!(rift.bidirectional);
        assert_eq!(rift.target, target);
    }
}
