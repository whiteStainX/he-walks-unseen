//! Core game data structures for the Space-Time Cube.
//!
//! This module contains pure data types with no I/O or rendering dependencies:
//! - [`Position`]: 3D coordinates (x, y, t)
//! - [`Component`]: Entity behaviors (ECS-like)
//! - [`Entity`]: Game objects with components
//! - [`TimeSlice`]: 2D world snapshot at time t
//! - [`TimeCube`]: Complete 3D Space-Time world
//! - [`WorldLine`]: Player path tracking

pub mod position;
pub mod components;
pub mod entity;
pub mod time_slice;
pub mod time_cube;
pub mod world_line;
pub mod propagation;
pub mod light_cone;
pub mod detection;

pub use position::{Direction, Position, SpatialPos};
pub use components::{Component, EntityId, PatrolData, RiftData, VisionData};
pub use entity::{Entity, EntityBuilder, EntityType};
pub use time_slice::TimeSlice;
pub use time_cube::{CubeError, TimeCube};
pub use world_line::{WorldLine, WorldLineError};
pub use propagation::{
    PropagationContext, PropagationOptions, PropagationResult, PropagationWarning,
};
pub use light_cone::{bresenham_line, is_line_blocked, manhattan_distance};
pub use detection::{check_detection, DetectionConfig, DetectionModel, DetectionResult};
