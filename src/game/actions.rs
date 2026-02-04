//! Actions and action execution.

use std::collections::HashSet;

use crate::core::propagation;
use crate::core::{check_detection, Component, Direction, Entity, EntityId, Position};
use crate::game::state::{GamePhase, GameState};
use crate::game::validation::{
    validate_directional_move, validate_pull, validate_push, validate_rift, validate_wait,
};

/// A player action.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Action {
    /// Move in a cardinal direction (also advances time by 1).
    Move(Direction),
    /// Wait in place (advances time by 1, same position).
    Wait,
    /// Use a rift at current position (teleport to target).
    UseRift,
    /// Push an adjacent pushable entity in a direction.
    Push(Direction),
    /// Pull an adjacent pullable entity.
    Pull(Direction),
    /// Restart the level (resets to initial state).
    Restart,
}

/// Result of applying an action.
#[derive(Debug, Clone)]
pub struct ActionResult {
    /// The new game state after the action.
    pub state: GameState,
    /// What happened (for UI feedback).
    pub outcome: ActionOutcome,
    /// Entities that moved as a result of this action.
    pub moved_entities: Vec<(EntityId, Position, Position)>, // (id, from, to)
    /// Propagation details (if propagation occurred).
    pub propagation: Option<propagation::PropagationResult>,
}

/// Describes what happened when an action was applied.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ActionOutcome {
    /// Player moved normally.
    Moved {
        /// Previous position.
        from: Position,
        /// New position.
        to: Position,
    },
    /// Player waited in place.
    Waited {
        /// Position after waiting.
        at: Position,
    },
    /// Player used a rift.
    Rifted {
        /// Previous position.
        from: Position,
        /// Rift target position.
        to: Position,
    },
    /// Player pushed entity/entities.
    Pushed {
        /// Player destination.
        player_to: Position,
        /// Pushed entities and their destinations.
        pushed: Vec<(EntityId, Position)>, // [(id, new_pos), ...]
    },
    /// Player pulled an entity.
    Pulled {
        /// Player destination.
        player_to: Position,
        /// Pulled entity id.
        pulled_id: EntityId,
        /// Pulled entity destination.
        pulled_to: Position,
    },
    /// Level restarted.
    Restarted,
    /// Player reached exit — won!
    Won {
        /// Exit position.
        at: Position,
    },
    /// Player was detected — lost! (Phase 5).
    Detected {
        /// Enemy that detected the player.
        by: EntityId,
        /// Position where detection occurred.
        seen_at: Position,
    },
}

/// Error when an action cannot be applied.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum ActionError {
    /// Game is not active.
    #[error("Game is not active (phase: {phase:?})")]
    GameNotActive {
        /// Current game phase.
        phase: GamePhase,
    },

    /// Move validation failed.
    #[error("Move blocked: {0}")]
    MoveBlocked(#[from] MoveError),

    /// No rift at current position.
    #[error("No rift at current position")]
    NoRiftHere,

    /// Rift target invalid.
    #[error("Rift target is invalid: {reason}")]
    InvalidRiftTarget {
        /// Target position.
        target: Position,
        /// Reason for invalidity.
        reason: String,
    },

    /// Nothing to push.
    #[error("Nothing to push in direction {direction:?}")]
    NothingToPush {
        /// Direction attempted.
        direction: Direction,
    },

    /// Push blocked.
    #[error("Cannot push: target blocked at {blocked_at:?}")]
    PushBlocked {
        /// Blocked target position.
        blocked_at: Position,
    },

    /// Push chain too long.
    #[error("Push chain too long (max: {max})")]
    PushChainTooLong {
        /// Chain length encountered.
        chain_length: usize,
        /// Maximum allowed.
        max: usize,
    },

    /// Nothing to pull.
    #[error("Nothing to pull from direction {direction:?}")]
    NothingToPull {
        /// Direction attempted.
        direction: Direction,
    },

    /// Entity not pullable.
    #[error("Cannot pull: entity not pullable")]
    NotPullable {
        /// Entity id.
        entity_id: EntityId,
    },

    /// Internal error.
    #[error("Internal error: {0}")]
    Internal(String),
}

/// Detailed move validation error.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum MoveError {
    /// Position out of bounds.
    #[error("Position out of bounds: ({x}, {y}, {t})")]
    OutOfBounds {
        /// X coordinate.
        x: i32,
        /// Y coordinate.
        y: i32,
        /// T coordinate.
        t: i32,
    },

    /// Position blocked.
    #[error("Position blocked by {entity_type} at ({x}, {y}, {t})")]
    Blocked {
        /// X coordinate.
        x: i32,
        /// Y coordinate.
        y: i32,
        /// T coordinate.
        t: i32,
        /// Blocking entity id.
        entity_id: EntityId,
        /// Blocking entity type.
        entity_type: String,
    },

    /// Self-intersection.
    #[error("Self-intersection: player already visited ({x}, {y}, {t})")]
    SelfIntersection {
        /// X coordinate.
        x: i32,
        /// Y coordinate.
        y: i32,
        /// T coordinate.
        t: i32,
    },

    /// Invalid direction.
    #[error("Invalid direction from current position")]
    InvalidDirection,

    /// Time overflow.
    #[error("Time overflow: t={t} exceeds maximum {max_t}")]
    TimeOverflow {
        /// Attempted time.
        t: i32,
        /// Maximum allowed.
        max_t: i32,
    },
}

/// Apply an action to a game state, producing a new state.
pub fn apply_action(state: &GameState, action: Action) -> Result<ActionResult, ActionError> {
    if !state.is_active() && action != Action::Restart {
        return Err(ActionError::GameNotActive { phase: state.phase() });
    }

    match action {
        Action::Move(direction) => apply_move(state, direction),
        Action::Wait => apply_wait(state),
        Action::UseRift => apply_rift(state),
        Action::Push(direction) => apply_push(state, direction),
        Action::Pull(direction) => apply_pull(state, direction),
        Action::Restart => apply_restart(state),
    }
}

/// Preview an action without applying it.
pub fn preview_action(state: &GameState, action: Action) -> Result<ActionOutcome, ActionError> {
    match action {
        Action::Move(direction) => {
            let from = state.player_position();
            let to = validate_directional_move(state, direction).map_err(ActionError::MoveBlocked)?;
            Ok(ActionOutcome::Moved { from, to })
        }
        Action::Wait => {
            let at = validate_wait(state).map_err(ActionError::MoveBlocked)?;
            Ok(ActionOutcome::Waited { at })
        }
        Action::UseRift => {
            let from = state.player_position();
            let to = validate_rift(state)?;
            Ok(ActionOutcome::Rifted { from, to })
        }
        Action::Push(direction) => {
            let pushed = validate_push(state, direction)?;
            let player_to = state.player_position().step(direction);
            Ok(ActionOutcome::Pushed {
                player_to,
                pushed: pushed.into_iter().map(|(id, _, to)| (id, to)).collect(),
            })
        }
        Action::Pull(direction) => {
            let (id, _, to) = validate_pull(state, direction)?;
            let player_to = state.player_position().step(direction);
            Ok(ActionOutcome::Pulled {
                player_to,
                pulled_id: id,
                pulled_to: to,
            })
        }
        Action::Restart => Ok(ActionOutcome::Restarted),
    }
}

/// Validate an action without applying or previewing.
pub fn validate_action(state: &GameState, action: Action) -> Result<(), ActionError> {
    match action {
        Action::Move(direction) => {
            validate_directional_move(state, direction).map_err(ActionError::MoveBlocked)?;
            Ok(())
        }
        Action::Wait => {
            validate_wait(state).map_err(ActionError::MoveBlocked)?;
            Ok(())
        }
        Action::UseRift => {
            validate_rift(state)?;
            Ok(())
        }
        Action::Push(direction) => {
            validate_push(state, direction)?;
            Ok(())
        }
        Action::Pull(direction) => {
            validate_pull(state, direction)?;
            Ok(())
        }
        Action::Restart => Ok(()),
    }
}

fn apply_move(state: &GameState, direction: Direction) -> Result<ActionResult, ActionError> {
    let from = state.player_position();
    let to = validate_directional_move(state, direction).map_err(ActionError::MoveBlocked)?;
    let mut new_state = state.clone();
    apply_player_move(&mut new_state, from, to, false)?;
    new_state.push_history(Action::Move(direction));
    new_state.set_turn(new_state.world_line().current_turn().unwrap_or(0));
    let outcome = ActionOutcome::Moved { from, to };
    finalize_action(new_state, outcome, vec![(state.player_id(), from, to)], None)
}

fn apply_wait(state: &GameState) -> Result<ActionResult, ActionError> {
    let at = validate_wait(state).map_err(ActionError::MoveBlocked)?;
    let mut new_state = state.clone();
    let from = state.player_position();
    apply_player_move(&mut new_state, from, at, false)?;
    new_state.push_history(Action::Wait);
    new_state.set_turn(new_state.world_line().current_turn().unwrap_or(0));
    let outcome = ActionOutcome::Waited { at };
    finalize_action(new_state, outcome, vec![(state.player_id(), from, at)], None)
}

fn apply_rift(state: &GameState) -> Result<ActionResult, ActionError> {
    let from = state.player_position();
    let to = validate_rift(state)?;
    let mut new_state = state.clone();
    apply_player_move(&mut new_state, from, to, true)?;
    new_state.push_history(Action::UseRift);
    new_state.set_turn(new_state.world_line().current_turn().unwrap_or(0));
    let outcome = ActionOutcome::Rifted { from, to };
    finalize_action(new_state, outcome, vec![(state.player_id(), from, to)], None)
}

fn apply_push(state: &GameState, direction: Direction) -> Result<ActionResult, ActionError> {
    let current = state.player_position();
    let moved = validate_push(state, direction)?;
    let player_to = current.step(direction);

    let mut new_state = state.clone();
    apply_player_move(&mut new_state, current, player_to, false)?;

    let mut moved_entities = vec![(state.player_id(), current, player_to)];
    let mut pushed_ids = HashSet::new();

    for (id, _from, to) in &moved {
        let original = state
            .cube()
            .entity_at_time(*id, current.t)
            .ok_or_else(|| ActionError::Internal("push entity not found".to_string()))?;
        let moved_entity = original.at_position(*to);
        new_state
            .cube_mut()
            .spawn_or_replace(moved_entity)
            .map_err(|e: crate::core::CubeError| ActionError::Internal(e.to_string()))?;
        moved_entities.push((*id, *_from, *to));
        pushed_ids.insert(*id);
    }

    let propagation = propagation::propagate_from_with_options(
        new_state.cube_mut(),
        player_to.t,
        propagation::PropagationOptions {
            only_entities: Some(pushed_ids),
            stop_at: None,
            skip_collisions: false,
        },
    )
    .ok();

    new_state.push_history(Action::Push(direction));
    new_state.set_turn(new_state.world_line().current_turn().unwrap_or(0));
    let outcome = ActionOutcome::Pushed {
        player_to,
        pushed: moved.iter().map(|(id, _, to)| (*id, *to)).collect(),
    };
    finalize_action(new_state, outcome, moved_entities, propagation)
}

fn apply_pull(state: &GameState, direction: Direction) -> Result<ActionResult, ActionError> {
    let current = state.player_position();
    let (pulled_id, from, to) = validate_pull(state, direction)?;
    let player_to = current.step(direction);

    let mut new_state = state.clone();
    apply_player_move(&mut new_state, current, player_to, false)?;

    let original = state
        .cube()
        .entity_at_time(pulled_id, current.t)
        .ok_or_else(|| ActionError::Internal("pull entity not found".to_string()))?;
    let moved_entity = original.at_position(to);
    new_state
        .cube_mut()
        .spawn_or_replace(moved_entity)
        .map_err(|e: crate::core::CubeError| ActionError::Internal(e.to_string()))?;

    let mut moved_entities = vec![(state.player_id(), current, player_to)];
    moved_entities.push((pulled_id, from, to));

    let propagation =
        propagation::propagate_entity(new_state.cube_mut(), pulled_id, player_to.t).ok();

    new_state.push_history(Action::Pull(direction));
    new_state.set_turn(new_state.world_line().current_turn().unwrap_or(0));
    let outcome = ActionOutcome::Pulled {
        player_to,
        pulled_id,
        pulled_to: to,
    };
    finalize_action(new_state, outcome, moved_entities, propagation)
}

fn apply_restart(state: &GameState) -> Result<ActionResult, ActionError> {
    let mut new_state = state.clone();
    new_state.reset_to_initial();
    Ok(ActionResult {
        state: new_state,
        outcome: ActionOutcome::Restarted,
        moved_entities: Vec::new(),
        propagation: None,
    })
}

fn apply_player_move(
    state: &mut GameState,
    from: Position,
    to: Position,
    via_rift: bool,
) -> Result<(), ActionError> {
    if via_rift {
        state
            .world_line_mut()
            .extend_via_rift(to)
            .map_err(|_| ActionError::MoveBlocked(MoveError::SelfIntersection {
                x: to.x,
                y: to.y,
                t: to.t,
            }))?;
    } else {
        state
            .world_line_mut()
            .extend(to)
            .map_err(|_| ActionError::MoveBlocked(MoveError::SelfIntersection {
                x: to.x,
                y: to.y,
                t: to.t,
            }))?;
    }

    let player_id = state.player_id();
    let _ = state.cube_mut().despawn_at(player_id, from.t);
    let player_entity = Entity::with_id(player_id, to, vec![Component::Player]);
    state
        .cube_mut()
        .spawn_or_replace(player_entity)
        .map_err(|e: crate::core::CubeError| ActionError::Internal(e.to_string()))?;
    Ok(())
}

fn finalize_action(
    mut state: GameState,
    mut outcome: ActionOutcome,
    moved_entities: Vec<(EntityId, Position, Position)>,
    propagation: Option<propagation::PropagationResult>,
) -> Result<ActionResult, ActionError> {
    if matches!(outcome, ActionOutcome::Moved { .. }
        | ActionOutcome::Waited { .. }
        | ActionOutcome::Rifted { .. }
        | ActionOutcome::Pushed { .. }
        | ActionOutcome::Pulled { .. })
    {
        let detection = check_detection(state.cube(), state.world_line(), &state.config().detection);
        if let Some(result) = detection {
            state.set_phase(GamePhase::Detected);
            outcome = ActionOutcome::Detected {
                by: result.enemy_id,
                seen_at: result.player_position,
            };
        } else if state.at_exit() {
            state.set_phase(GamePhase::Won);
            outcome = ActionOutcome::Won {
                at: state.player_position(),
            };
        }
    }

    Ok(ActionResult {
        state,
        outcome,
        moved_entities,
        propagation,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{Entity, EntityType, Position, TimeCube};
    use crate::game::GameState;

    fn basic_state() -> GameState {
        let mut cube = TimeCube::new(5, 5, 5);
        cube.spawn(Entity::player(Position::new(1, 1, 0)))
            .unwrap();
        GameState::from_cube(cube).unwrap()
    }

    #[test]
    fn test_apply_move_east() {
        let state = basic_state();
        let result = apply_action(&state, Action::Move(Direction::East)).unwrap();
        assert_eq!(result.state.player_position(), Position::new(2, 1, 1));
    }

    #[test]
    fn test_apply_wait() {
        let state = basic_state();
        let result = apply_action(&state, Action::Wait).unwrap();
        assert_eq!(result.state.player_position(), Position::new(1, 1, 1));
    }

    #[test]
    fn test_apply_rift_no_rift() {
        let state = basic_state();
        let err = apply_action(&state, Action::UseRift).unwrap_err();
        assert!(matches!(err, ActionError::NoRiftHere));
    }

    #[test]
    fn test_preview_action() {
        let state = basic_state();
        let preview = preview_action(&state, Action::Move(Direction::South)).unwrap();
        assert!(matches!(preview, ActionOutcome::Moved { .. }));
    }

    #[test]
    fn test_validate_action() {
        let state = basic_state();
        assert!(validate_action(&state, Action::Move(Direction::East)).is_ok());
    }

    #[test]
    fn test_apply_move_extends_world_line() {
        let state = basic_state();
        assert_eq!(state.world_line().len(), 1);
        let result = apply_action(&state, Action::Move(Direction::East)).unwrap();
        assert_eq!(result.state.world_line().len(), 2);
    }

    #[test]
    fn test_apply_push_single_box() {
        let mut cube = TimeCube::new(5, 5, 5);
        cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
        cube.spawn(Entity::pushable_box(Position::new(2, 1, 0)))
            .unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let result = apply_action(&state, Action::Push(Direction::East)).unwrap();
        assert_eq!(result.state.player_position(), Position::new(2, 1, 1));
        assert!(result
            .state
            .cube()
            .entities_at(Position::new(3, 1, 1))
            .iter()
            .any(|e| e.entity_type() == EntityType::Box));
    }

    #[test]
    fn test_apply_push_blocked_by_wall() {
        let mut cube = TimeCube::new(5, 5, 5);
        cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
        cube.spawn(Entity::pushable_box(Position::new(2, 1, 0)))
            .unwrap();
        // Wall is intentionally placed at t=1 (next slice) to block the push.
        cube.spawn(Entity::wall(Position::new(3, 1, 1))).unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let err = apply_action(&state, Action::Push(Direction::East)).unwrap_err();
        assert!(matches!(err, ActionError::PushBlocked { .. }));
    }

    #[test]
    fn test_apply_pull_success() {
        let mut cube = TimeCube::new(5, 5, 5);
        cube.spawn(Entity::player(Position::new(2, 1, 0))).unwrap();
        cube.spawn(Entity::pullable_box(Position::new(1, 1, 0)))
            .unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let result = apply_action(&state, Action::Pull(Direction::East)).unwrap();
        assert_eq!(result.state.player_position(), Position::new(3, 1, 1));
        assert!(result
            .state
            .cube()
            .entities_at(Position::new(2, 1, 1))
            .iter()
            .any(|e| e.entity_type() == EntityType::Box));
    }

    #[test]
    fn test_win_on_exit() {
        let mut cube = TimeCube::new(5, 5, 5);
        cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
        cube.spawn_and_propagate(Entity::exit(Position::new(2, 1, 0)))
            .unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let result = apply_action(&state, Action::Move(Direction::East)).unwrap();
        assert!(result.state.has_won());
        assert!(matches!(result.outcome, ActionOutcome::Won { .. }));
    }

    #[test]
    fn test_detection_by_enemy() {
        use crate::core::{DetectionConfig, DetectionModel, PatrolData, SpatialPos, VisionData};
        use crate::game::state::GameConfig;

        let mut cube = TimeCube::new(10, 10, 10);
        // Player at (2, 2, 0)
        cube.spawn(Entity::player(Position::new(2, 2, 0))).unwrap();

        // Enemy at (5, 2, 0) with omnidirectional vision, stationary patrol
        let patrol = PatrolData::new(vec![SpatialPos::new(5, 2)], true);
        let vision = VisionData::omnidirectional(3);
        let enemy = Entity::enemy(Position::new(5, 2, 0), patrol, vision);
        cube.spawn(enemy).unwrap();
        cube.propagate_all().unwrap();

        // Configure detection with delay_turns = 2
        let config = GameConfig {
            detection: DetectionConfig {
                model: DetectionModel::DiscreteDelay,
                delay_turns: 2,
                vision_radius: 5,
            },
            ..Default::default()
        };

        let state = GameState::new(cube, config).unwrap();

        // Move player: stay at (2, 2) for turns 0->1->2
        // At t=2, enemy sees player position from t=0 (delay=2)
        // Distance from (5,2) to (2,2) = 3, within vision_radius=5
        let result = apply_action(&state, Action::Wait).unwrap(); // t=0 -> t=1
        assert!(result.state.is_active(), "Should still be active after first wait");

        let result = apply_action(&result.state, Action::Wait).unwrap(); // t=1 -> t=2
        assert!(!result.state.is_active(), "Should be detected at t=2");
        assert_eq!(result.state.phase(), GamePhase::Detected);
        assert!(matches!(result.outcome, ActionOutcome::Detected { .. }));
    }
}
