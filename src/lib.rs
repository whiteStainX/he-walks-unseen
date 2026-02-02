//! # He Walks Unseen
//!
//! A terminal-based, turn-based puzzle stealth game where time is a spatial dimension.
//!
//! The player navigates a 3D Space-Time Cube to reach the exit without being detected
//! by enemies who perceive through causal light cones.

#![warn(clippy::all)]
#![warn(missing_docs)]

/// Core game data structures (Phase 2)
pub mod core;

/// Game logic (Phase 3)
pub mod game;

// Render modules will be added in Phase 4
// pub mod render;

// Data modules will be added in Phase 6
// pub mod data;

/// Library version
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
