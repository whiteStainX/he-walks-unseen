//! Move and action validation logic.

use crate::core::{Direction, EntityId, Position, TimeCube};
use crate::game::actions::{Action, ActionError, MoveError};
use crate::game::state::GameState;

/// Validate a target position for player movement.
pub fn validate_move_target(state: &GameState, target: Position) -> Result<(), MoveError> {
    if target.t >= state.cube().time_depth {
        return Err(MoveError::TimeOverflow {
            t: target.t,
            max_t: state.cube().time_depth - 1,
        });
    }
    state
        .cube()
        .validate_position(target)
        .map_err(|_| MoveError::OutOfBounds {
            x: target.x,
            y: target.y,
            t: target.t,
        })?;

    if let Some(blocking) = blocking_entity_at(state.cube(), target, &[]) {
        return Err(MoveError::Blocked {
            x: target.x,
            y: target.y,
            t: target.t,
            entity_id: blocking.id,
            entity_type: format!("{:?}", blocking.entity_type()),
        });
    }

    if would_self_intersect(state, target) {
        return Err(MoveError::SelfIntersection {
            x: target.x,
            y: target.y,
            t: target.t,
        });
    }

    Ok(())
}

/// Validate a standard move (direction-based).
pub fn validate_directional_move(
    state: &GameState,
    direction: Direction,
) -> Result<Position, MoveError> {
    let current = state.player_position();
    let target = current.step(direction);
    validate_move_target(state, target)?;
    Ok(target)
}

/// Validate a wait action.
pub fn validate_wait(state: &GameState) -> Result<Position, MoveError> {
    let current = state.player_position();
    let target = current.wait();
    validate_move_target(state, target)?;
    Ok(target)
}

/// Validate a rift usage.
pub fn validate_rift(state: &GameState) -> Result<Position, ActionError> {
    let current = state.player_position();
    let target = state.cube().rift_target(current).ok_or(ActionError::NoRiftHere)?;
    state
        .cube()
        .validate_position(target)
        .map_err(|_| ActionError::InvalidRiftTarget {
            target,
            reason: "out of bounds".to_string(),
        })?;
    if would_self_intersect(state, target) {
        return Err(ActionError::InvalidRiftTarget {
            target,
            reason: "self-intersection".to_string(),
        });
    }
    Ok(target)
}

/// Validate a push action.
/// Validate a push action.
///
/// # Time Slice Semantics
///
/// - Chain computation scans the current slice (`t = current_time`).
/// - Target validation checks pushed entities at `t + 1`.
/// - Player movement also advances to `t + 1`.
pub fn validate_push(
    state: &GameState,
    direction: Direction,
) -> Result<Vec<(EntityId, Position, Position)>, ActionError> {
    let current = state.player_position();
    let chain = compute_push_chain(state.cube(), current, direction, state.config().max_push_chain);
    if chain.is_empty() {
        return Err(ActionError::NothingToPush { direction });
    }
    if chain.len() > state.config().max_push_chain {
        return Err(ActionError::PushChainTooLong {
            chain_length: chain.len(),
            max: state.config().max_push_chain,
        });
    }

    let next_t = current.t + 1;
    let player_to = current.step(direction);
    let mut ignored_ids: Vec<EntityId> = chain.iter().map(|(id, _)| *id).collect();
    ignored_ids.push(state.player_id());

    validate_player_move_with_ignores(state, player_to, &ignored_ids)
        .map_err(ActionError::MoveBlocked)?;

    let mut pushed = Vec::new();
    for (id, from) in &chain {
        let to = Position::new(from.x + direction.delta().0, from.y + direction.delta().1, next_t);
        if validate_entity_target(state.cube(), to, &ignored_ids).is_err() {
            return Err(ActionError::PushBlocked { blocked_at: to });
        }
        pushed.push((*id, *from, to));
    }
    Ok(pushed)
}

/// Validate a pull action.
///
/// # Time Slice Semantics
///
/// - Entity lookup uses the current slice (`t`).
/// - Target validation checks the next slice (`t + 1`).
pub fn validate_pull(
    state: &GameState,
    direction: Direction,
) -> Result<(EntityId, Position, Position), ActionError> {
    let current = state.player_position();
    let pull_pos = current.move_dir(direction.opposite());
    let pull_entity = state
        .cube()
        .entities_at(pull_pos)
        .into_iter()
        .next()
        .ok_or(ActionError::NothingToPull { direction })?;

    if !pull_entity.has(|c| matches!(c, crate::core::Component::Pullable)) {
        return Err(ActionError::NotPullable {
            entity_id: pull_entity.id,
        });
    }

    let next_t = current.t + 1;
    let player_to = current.step(direction);
    let ignored_ids: Vec<EntityId> = vec![pull_entity.id, state.player_id()];
    validate_player_move_with_ignores(state, player_to, &ignored_ids)
        .map_err(ActionError::MoveBlocked)?;

    let box_to = Position::new(current.x, current.y, next_t);
    validate_entity_target(state.cube(), box_to, &ignored_ids)
        .map_err(|_| ActionError::PushBlocked { blocked_at: box_to })?;

    Ok((pull_entity.id, pull_pos, box_to))
}

/// Check if a position would cause self-intersection.
pub fn would_self_intersect(state: &GameState, pos: Position) -> bool {
    state.world_line().would_intersect(pos)
}

/// Find all positions reachable in one move from current state.
pub fn find_reachable_positions(state: &GameState) -> Vec<(Position, Action)> {
    let mut out = Vec::new();
    for dir in Direction::all() {
        if let Ok(target) = validate_directional_move(state, dir) {
            out.push((target, Action::Move(dir)));
        }
    }
    if let Ok(target) = validate_wait(state) {
        out.push((target, Action::Wait));
    }
    if let Ok(target) = validate_rift(state) {
        out.push((target, Action::UseRift));
    }
    out
}

/// Compute push chain for a direction.
pub fn compute_push_chain(
    cube: &TimeCube,
    start_pos: Position,
    direction: Direction,
    max_chain: usize,
) -> Vec<(EntityId, Position)> {
    let mut chain = Vec::new();
    let mut current = start_pos.move_dir(direction);

    while chain.len() <= max_chain {
        let entity = cube
            .entities_at(current)
            .into_iter()
            .find(|e| e.has(|c| matches!(c, crate::core::Component::Pushable)));
        if let Some(entity) = entity {
            chain.push((entity.id, current));
            current = current.move_dir(direction);
        } else {
            break;
        }
    }

    chain
}

fn validate_player_move_with_ignores(
    state: &GameState,
    target: Position,
    ignore_ids: &[EntityId],
) -> Result<(), MoveError> {
    if target.t >= state.cube().time_depth {
        return Err(MoveError::TimeOverflow {
            t: target.t,
            max_t: state.cube().time_depth - 1,
        });
    }
    state
        .cube()
        .validate_position(target)
        .map_err(|_| MoveError::OutOfBounds {
            x: target.x,
            y: target.y,
            t: target.t,
        })?;

    if let Some(blocking) = blocking_entity_at(state.cube(), target, ignore_ids) {
        return Err(MoveError::Blocked {
            x: target.x,
            y: target.y,
            t: target.t,
            entity_id: blocking.id,
            entity_type: format!("{:?}", blocking.entity_type()),
        });
    }

    if would_self_intersect(state, target) {
        return Err(MoveError::SelfIntersection {
            x: target.x,
            y: target.y,
            t: target.t,
        });
    }

    Ok(())
}

fn validate_entity_target(
    cube: &TimeCube,
    target: Position,
    ignore_ids: &[EntityId],
) -> Result<(), MoveError> {
    if target.t >= cube.time_depth {
        return Err(MoveError::TimeOverflow {
            t: target.t,
            max_t: cube.time_depth - 1,
        });
    }
    cube.validate_position(target).map_err(|_| MoveError::OutOfBounds {
        x: target.x,
        y: target.y,
        t: target.t,
    })?;

    if let Some(blocking) = blocking_entity_at(cube, target, ignore_ids) {
        return Err(MoveError::Blocked {
            x: target.x,
            y: target.y,
            t: target.t,
            entity_id: blocking.id,
            entity_type: format!("{:?}", blocking.entity_type()),
        });
    }
    Ok(())
}

fn blocking_entity_at<'a>(
    cube: &'a TimeCube,
    pos: Position,
    ignore_ids: &[EntityId],
) -> Option<&'a crate::core::Entity> {
    cube.entities_at(pos)
        .into_iter()
        .find(|entity| entity.blocks_movement() && !ignore_ids.contains(&entity.id))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{Entity, Position, TimeCube};
    use crate::game::GameState;

    fn state_with_player() -> GameState {
        let mut cube = TimeCube::new(5, 5, 3);
        cube.spawn(Entity::player(Position::new(1, 1, 0)))
            .unwrap();
        GameState::from_cube(cube).unwrap()
    }

    #[test]
    fn test_validate_move_target_valid() {
        let state = state_with_player();
        assert!(validate_move_target(&state, Position::new(2, 1, 1)).is_ok());
    }

    #[test]
    fn test_validate_move_target_out_of_bounds() {
        let state = state_with_player();
        assert!(validate_move_target(&state, Position::new(6, 1, 1)).is_err());
    }

    #[test]
    fn test_validate_move_target_blocked() {
        let mut cube = TimeCube::new(5, 5, 3);
        cube.spawn(Entity::player(Position::new(1, 1, 0)))
            .unwrap();
        cube.spawn(Entity::wall(Position::new(2, 1, 1))).unwrap();
        let state = GameState::from_cube(cube).unwrap();
        assert!(matches!(
            validate_move_target(&state, Position::new(2, 1, 1)),
            Err(MoveError::Blocked { .. })
        ));
    }

    #[test]
    fn test_validate_directional_move() {
        let state = state_with_player();
        let target = validate_directional_move(&state, Direction::East).unwrap();
        assert_eq!(target, Position::new(2, 1, 1));
    }

    #[test]
    fn test_validate_wait_valid() {
        let state = state_with_player();
        let target = validate_wait(&state).unwrap();
        assert_eq!(target, Position::new(1, 1, 1));
    }

    #[test]
    fn test_validate_rift_no_rift() {
        let state = state_with_player();
        assert!(matches!(
            validate_rift(&state),
            Err(ActionError::NoRiftHere)
        ));
    }

    #[test]
    fn test_compute_push_chain_empty() {
        let state = state_with_player();
        let chain = compute_push_chain(state.cube(), state.player_position(), Direction::East, 3);
        assert!(chain.is_empty());
    }

    #[test]
    fn test_validate_push_chain() {
        let mut cube = TimeCube::new(10, 5, 5);
        cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
        cube.spawn(Entity::pushable_box(Position::new(2, 1, 0)))
            .unwrap();
        cube.spawn(Entity::pushable_box(Position::new(3, 1, 0)))
            .unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let chain = validate_push(&state, Direction::East).unwrap();
        assert_eq!(chain.len(), 2);
    }

    #[test]
    fn test_validate_push_chain_limit() {
        let mut cube = TimeCube::new(10, 5, 5);
        cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
        for x in 2..6 {
            cube.spawn(Entity::pushable_box(Position::new(x, 1, 0)))
                .unwrap();
        }
        let state = GameState::from_cube(cube).unwrap();
        let err = validate_push(&state, Direction::East).unwrap_err();
        assert!(matches!(err, ActionError::PushChainTooLong { .. }));
    }

    #[test]
    fn test_validate_pull_not_pullable() {
        let mut cube = TimeCube::new(5, 5, 5);
        cube.spawn(Entity::player(Position::new(2, 1, 0))).unwrap();
        cube.spawn(Entity::pushable_box(Position::new(1, 1, 0)))
            .unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let err = validate_pull(&state, Direction::East).unwrap_err();
        assert!(matches!(err, ActionError::NotPullable { .. }));
    }

    #[test]
    fn test_validate_pull_nothing_there() {
        let mut cube = TimeCube::new(5, 5, 5);
        cube.spawn(Entity::player(Position::new(2, 1, 0))).unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let err = validate_pull(&state, Direction::East).unwrap_err();
        assert!(matches!(err, ActionError::NothingToPull { .. }));
    }
}
