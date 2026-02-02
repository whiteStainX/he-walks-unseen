//! Game logic: state management, actions, and validation.
//!
//! This module implements the game rules independent of rendering:
//! - [`GameState`]: Complete game state at any point
//! - [`Action`]: Player actions (move, wait, push, etc.)
//! - [`apply_action`]: Execute actions to produce new states
//! - Validation functions for move checking

pub mod state;
pub mod actions;
pub mod validation;

pub use state::{GameConfig, GamePhase, GameState, GameStateBuilder, GameError};
pub use actions::{
    Action, ActionError, ActionOutcome, ActionResult, MoveError, apply_action, preview_action,
    validate_action,
};
pub use validation::{
    compute_push_chain, find_reachable_positions, validate_directional_move, validate_move_target,
    validate_pull, validate_rift, validate_wait, validate_push, would_self_intersect,
};
