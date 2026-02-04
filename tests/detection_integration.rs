use he_walks_unseen::core::{
    DetectionConfig, DetectionModel, Direction, Entity, PatrolData, Position, SpatialPos, TimeCube,
    VisionData,
};
use he_walks_unseen::game::{apply_action, Action, GameConfig, GamePhase, GameState};

#[test]
fn test_detection_scenario_discrete_delay() {
    let mut cube = TimeCube::new(100, 100, 10);

    let player_start = Position::new(2, 2, 0);
    cube.spawn(Entity::player(player_start)).unwrap();

    let patrol = PatrolData::new(vec![SpatialPos::new(5, 2)], true);
    let vision = VisionData::omnidirectional(3);
    let enemy = Entity::enemy(Position::new(5, 2, 0), patrol, vision);
    cube.spawn(enemy).unwrap();

    cube.propagate_all().unwrap();

    let config = GameConfig {
        detection: DetectionConfig {
            model: DetectionModel::DiscreteDelay,
            delay_turns: 2,
            vision_radius: 5,
        },
        ..GameConfig::default()
    };

    let state = GameState::new(cube, config).unwrap();

    let result = apply_action(&state, Action::Move(Direction::East)).unwrap();
    assert_eq!(result.state.phase(), GamePhase::Playing);

    let result = apply_action(&result.state, Action::Move(Direction::East)).unwrap();
    assert_eq!(result.state.phase(), GamePhase::Detected);
}
