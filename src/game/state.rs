//! Game state container and configuration.

use crate::core::{CubeError, DetectionConfig, Entity, EntityId, Position, TimeCube, WorldLine};
use crate::game::{Action, MoveError};

/// Current phase of the game.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GamePhase {
    /// Game is active, player can move.
    Playing,
    /// Player reached the exit.
    Won,
    /// Player was detected by enemy (Phase 5).
    Detected,
    /// Player created a paradox.
    Paradox,
    /// Player chose to restart.
    Restarted,
}

/// Configuration for a game session (loaded from level).
#[derive(Debug, Clone)]
pub struct GameConfig {
    /// Speed of light for vision cones (tiles per turn).
    pub light_speed: u32,
    /// Maximum push chain length.
    pub max_push_chain: usize,
    /// Level name for display.
    pub level_name: String,
    /// Level ID for progression tracking.
    pub level_id: String,
    /// Allow undo actions (Phase 6).
    pub allow_undo: bool,
    /// Detection configuration.
    pub detection: DetectionConfig,
}

impl Default for GameConfig {
    fn default() -> Self {
        Self {
            light_speed: 3,
            max_push_chain: 3,
            level_name: String::from("Unnamed"),
            level_id: String::from("unknown"),
            allow_undo: false,
            detection: DetectionConfig::default(),
        }
    }
}

/// Errors for initializing or configuring game state.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum GameError {
    /// No player entity in the cube.
    #[error("No player entity found in TimeCube")]
    NoPlayer,
    /// No cube provided.
    #[error("No TimeCube provided")]
    MissingCube,
    /// Multiple players found.
    #[error("Multiple player entities found in TimeCube")]
    MultiplePlayers,
    /// Cube error.
    #[error("Cube error: {0}")]
    Cube(#[from] CubeError),
}

/// The complete game state at any point in time.
///
/// **Design:** Clone-before-mutate. State transitions produce new states.
#[derive(Debug, Clone)]
pub struct GameState {
    /// The Space-Time Cube (world state).
    cube: TimeCube,
    /// Player's path through spacetime.
    world_line: WorldLine,
    /// Player's entity ID (for tracking across slices).
    player_id: EntityId,
    /// Current game phase.
    phase: GamePhase,
    /// Turn counter (increments with each action).
    turn: usize,
    /// Action history for replay/debugging.
    history: Vec<Action>,
    /// Game configuration.
    config: GameConfig,
    /// Initial cube snapshot (for restart).
    initial_cube: TimeCube,
    /// Initial world line snapshot (for restart).
    initial_world_line: WorldLine,
}

impl GameState {
    /// Create a new game state from a TimeCube.
    ///
    /// Finds the player entity in the cube and initializes the world line.
    /// Returns error if no player found or multiple players exist.
    pub fn new(cube: TimeCube, config: GameConfig) -> Result<Self, GameError> {
        let mut player: Option<(EntityId, Position)> = None;
        for slice in cube.slices() {
            for entity in slice.all_entities() {
                if entity.is_player() {
                    if player.is_some() {
                        return Err(GameError::MultiplePlayers);
                    }
                    player = Some((entity.id, entity.position));
                }
            }
        }

        let (player_id, start_pos) = player.ok_or(GameError::NoPlayer)?;
        let world_line = WorldLine::new(start_pos);
        let initial_cube = cube.clone();
        let initial_world_line = world_line.clone();

        Ok(Self {
            cube,
            world_line,
            player_id,
            phase: GamePhase::Playing,
            turn: 0,
            history: Vec::new(),
            config,
            initial_cube,
            initial_world_line,
        })
    }

    /// Create from cube with default config.
    pub fn from_cube(cube: TimeCube) -> Result<Self, GameError> {
        Self::new(cube, GameConfig::default())
    }

    /// Get the TimeCube (read-only).
    pub fn cube(&self) -> &TimeCube {
        &self.cube
    }

    /// Get the world line (read-only).
    pub fn world_line(&self) -> &WorldLine {
        &self.world_line
    }

    /// Get current player position (from WorldLine).
    pub fn player_position(&self) -> Position {
        self.world_line
            .current()
            .expect("world line should not be empty")
    }

    /// Get current time (t coordinate of player).
    pub fn current_time(&self) -> i32 {
        self.player_position().t
    }

    /// Get current turn number.
    pub fn turn(&self) -> usize {
        self.turn
    }

    /// Get game phase.
    pub fn phase(&self) -> GamePhase {
        self.phase
    }

    /// Check if game is still active (playing).
    pub fn is_active(&self) -> bool {
        self.phase == GamePhase::Playing
    }

    /// Check if player has won.
    pub fn has_won(&self) -> bool {
        self.phase == GamePhase::Won
    }

    /// Get player entity ID.
    pub fn player_id(&self) -> EntityId {
        self.player_id
    }

    /// Get game config.
    pub fn config(&self) -> &GameConfig {
        &self.config
    }

    /// Get action history.
    pub fn history(&self) -> &[Action] {
        &self.history
    }

    pub(crate) fn cube_mut(&mut self) -> &mut TimeCube {
        &mut self.cube
    }

    pub(crate) fn world_line_mut(&mut self) -> &mut WorldLine {
        &mut self.world_line
    }

    pub(crate) fn push_history(&mut self, action: Action) {
        self.history.push(action);
    }

    pub(crate) fn set_turn(&mut self, turn: usize) {
        self.turn = turn;
    }

    pub(crate) fn set_phase(&mut self, phase: GamePhase) {
        self.phase = phase;
    }

    /// Check if a position is valid for the player to move to.
    pub fn can_move_to(&self, pos: Position) -> bool {
        self.validate_position(pos).is_ok()
    }

    /// Get detailed validation result for a position.
    pub fn validate_position(&self, pos: Position) -> Result<(), MoveError> {
        crate::game::validation::validate_move_target(self, pos)
    }

    /// Check if player is at a rift.
    pub fn at_rift(&self) -> bool {
        self.cube.has_rift(self.player_position())
    }

    /// Get rift target if player is at a rift.
    pub fn rift_target(&self) -> Option<Position> {
        self.cube.rift_target(self.player_position())
    }

    /// Check if player is at the exit.
    pub fn at_exit(&self) -> bool {
        self.cube.is_exit(self.player_position())
    }

    /// Get all valid actions from current state.
    pub fn valid_actions(&self) -> Vec<Action> {
        if !self.is_active() {
            return Vec::new();
        }
        let mut actions = Vec::new();
        for dir in crate::core::Direction::all() {
            if crate::game::validation::validate_directional_move(self, dir).is_ok() {
                actions.push(Action::Move(dir));
            }
            if crate::game::validation::validate_push(self, dir).is_ok() {
                actions.push(Action::Push(dir));
            }
            if crate::game::validation::validate_pull(self, dir).is_ok() {
                actions.push(Action::Pull(dir));
            }
        }
        if crate::game::validation::validate_wait(self).is_ok() {
            actions.push(Action::Wait);
        }
        if crate::game::validation::validate_rift(self).is_ok() {
            actions.push(Action::UseRift);
        }
        actions.push(Action::Restart);
        actions
    }

    /// Get positions the player could move to (for UI hints).
    pub fn reachable_positions(&self) -> Vec<Position> {
        crate::game::validation::find_reachable_positions(self)
            .into_iter()
            .map(|(pos, _)| pos)
            .collect()
    }

    /// Get the entity blocking a position (if any).
    pub fn blocking_entity_at(&self, pos: Position) -> Option<&Entity> {
        self.cube
            .entities_at(pos)
            .into_iter()
            .find(|entity| entity.blocks_movement())
    }

    /// Reset state to initial snapshot.
    pub fn reset_to_initial(&mut self) {
        self.cube = self.initial_cube.clone();
        self.world_line = self.initial_world_line.clone();
        self.phase = GamePhase::Playing;
        self.turn = 0;
        self.history.clear();
    }
}

/// Builder for constructing GameState with custom settings.
pub struct GameStateBuilder {
    cube: Option<TimeCube>,
    config: GameConfig,
}

impl GameStateBuilder {
    /// Create a new builder.
    pub fn new() -> Self {
        Self {
            cube: None,
            config: GameConfig::default(),
        }
    }

    /// Provide a TimeCube.
    pub fn with_cube(mut self, cube: TimeCube) -> Self {
        self.cube = Some(cube);
        self
    }

    /// Provide a custom config.
    pub fn with_config(mut self, config: GameConfig) -> Self {
        self.config = config;
        self
    }

    /// Set light speed.
    pub fn with_light_speed(mut self, speed: u32) -> Self {
        self.config.light_speed = speed;
        self
    }

    /// Set level name.
    pub fn with_level_name(mut self, name: impl Into<String>) -> Self {
        self.config.level_name = name.into();
        self
    }

    /// Build a GameState.
    pub fn build(self) -> Result<GameState, GameError> {
        let cube = self.cube.ok_or(GameError::MissingCube)?;
        GameState::new(cube, self.config)
    }
}

impl Default for GameStateBuilder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{Entity, Position, TimeCube};
    use crate::game::{apply_action, Action};

    fn basic_cube_with_player() -> TimeCube {
        let mut cube = TimeCube::new(5, 5, 3);
        cube.spawn(Entity::player(Position::new(1, 1, 0)))
            .unwrap();
        cube
    }

    #[test]
    fn test_game_state_new_finds_player() {
        let cube = basic_cube_with_player();
        let state = GameState::from_cube(cube).unwrap();
        assert_eq!(state.player_position(), Position::new(1, 1, 0));
    }

    #[test]
    fn test_game_state_new_fails_no_player() {
        let cube = TimeCube::new(5, 5, 3);
        let err = GameState::from_cube(cube).unwrap_err();
        assert_eq!(err, GameError::NoPlayer);
    }

    #[test]
    fn test_game_state_new_fails_multiple_players() {
        let mut cube = TimeCube::new(5, 5, 3);
        cube.spawn(Entity::player(Position::new(1, 1, 0)))
            .unwrap();
        cube.spawn(Entity::player(Position::new(2, 2, 0)))
            .unwrap();
        let err = GameState::from_cube(cube).unwrap_err();
        assert_eq!(err, GameError::MultiplePlayers);
    }

    #[test]
    fn test_player_position_matches_world_line() {
        let cube = basic_cube_with_player();
        let state = GameState::from_cube(cube).unwrap();
        assert_eq!(state.player_position(), state.world_line.current().unwrap());
    }

    #[test]
    fn test_current_time_matches_player_t() {
        let cube = basic_cube_with_player();
        let state = GameState::from_cube(cube).unwrap();
        assert_eq!(state.current_time(), 0);
    }

    #[test]
    fn test_is_active_when_playing() {
        let cube = basic_cube_with_player();
        let state = GameState::from_cube(cube).unwrap();
        assert!(state.is_active());
    }

    #[test]
    fn test_is_active_false_when_won() {
        let mut cube = TimeCube::new(5, 5, 3);
        let start = Position::new(1, 1, 0);
        cube.spawn(Entity::player(start)).unwrap();
        cube.spawn_and_propagate(Entity::exit(start)).unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let result = apply_action(&state, Action::Wait).unwrap();
        assert!(!result.state.is_active());
        assert!(result.state.has_won());
    }

    #[test]
    fn test_can_move_to_empty_space() {
        let cube = basic_cube_with_player();
        let state = GameState::from_cube(cube).unwrap();
        assert!(state.can_move_to(Position::new(2, 1, 1)));
    }

    #[test]
    fn test_can_move_to_blocked_by_wall() {
        let mut cube = basic_cube_with_player();
        cube.spawn(Entity::wall(Position::new(2, 1, 1))).unwrap();
        let state = GameState::from_cube(cube).unwrap();
        assert!(!state.can_move_to(Position::new(2, 1, 1)));
    }

    #[test]
    fn test_can_move_to_self_intersection() {
        let cube = basic_cube_with_player();
        let mut state = GameState::from_cube(cube).unwrap();
        state
            .world_line
            .extend(Position::new(2, 1, 1))
            .unwrap();
        assert!(!state.can_move_to(Position::new(2, 1, 1)));
    }

    #[test]
    fn test_at_rift_detection() {
        let mut cube = basic_cube_with_player();
        cube.spawn(Entity::rift(Position::new(1, 1, 0), Position::new(2, 2, 0), false))
            .unwrap();
        let state = GameState::from_cube(cube).unwrap();
        assert!(state.at_rift());
    }

    #[test]
    fn test_valid_actions_at_rift() {
        let mut cube = TimeCube::new(5, 5, 5);
        cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
        cube.spawn(Entity::rift(Position::new(1, 1, 0), Position::new(2, 2, 2), false))
            .unwrap();
        let state = GameState::from_cube(cube).unwrap();
        let actions = state.valid_actions();
        assert!(actions.contains(&Action::UseRift));
    }

    #[test]
    fn test_at_exit_detection() {
        let mut cube = basic_cube_with_player();
        cube.spawn(Entity::exit(Position::new(1, 1, 0))).unwrap();
        let state = GameState::from_cube(cube).unwrap();
        assert!(state.at_exit());
    }

    #[test]
    fn test_reachable_positions() {
        let cube = basic_cube_with_player();
        let state = GameState::from_cube(cube).unwrap();
        let positions = state.reachable_positions();
        assert!(positions.contains(&Position::new(1, 1, 1)));
    }

    #[test]
    fn test_builder_pattern() {
        let cube = basic_cube_with_player();
        let state = GameStateBuilder::new()
            .with_cube(cube)
            .with_level_name("Test")
            .build()
            .unwrap();
        assert_eq!(state.config.level_name, "Test");
    }
}
