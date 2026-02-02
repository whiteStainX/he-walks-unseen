//! He Walks Unseen - Terminal Entry Point

use std::io::{self, stdout};
use std::time::Duration;

use crossterm::{
    event::{self, Event, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};

use he_walks_unseen::core::{Entity, Position, TimeCube};
use he_walks_unseen::game::{GameConfig, GameState};
use he_walks_unseen::render::RenderApp;

fn main() -> io::Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create app state
    let game_state = build_demo_state();
    let mut app = RenderApp::new(game_state);

    // Main game loop
    let result = run_game_loop(&mut terminal, &mut app);

    // Restore terminal
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;

    result
}

/// Main game loop
fn run_game_loop(
    terminal: &mut Terminal<CrosstermBackend<io::Stdout>>,
    app: &mut RenderApp,
) -> io::Result<()> {
    loop {
        terminal.draw(|frame| app.render(frame))?;

        if event::poll(Duration::from_millis(16))?
            && let Event::Key(key) = event::read()?
            && key.kind == KeyEventKind::Press
        {
            app.handle_key(key.code);
            let _ = app.update();
        }

        if app.should_quit() {
            break;
        }
    }

    Ok(())
}

fn build_demo_state() -> GameState {
    let mut cube = TimeCube::new(12, 10, 30);

    // Border walls
    for x in 0..cube.width {
        let top = Position::new(x, 0, 0);
        let bottom = Position::new(x, cube.height - 1, 0);
        cube.spawn_and_propagate(Entity::wall(top)).unwrap();
        cube.spawn_and_propagate(Entity::wall(bottom)).unwrap();
    }
    for y in 0..cube.height {
        let left = Position::new(0, y, 0);
        let right = Position::new(cube.width - 1, y, 0);
        cube.spawn_and_propagate(Entity::wall(left)).unwrap();
        cube.spawn_and_propagate(Entity::wall(right)).unwrap();
    }

    // Player + exit
    cube.spawn(Entity::player(Position::new(1, 1, 0)))
        .unwrap();
    cube.spawn_and_propagate(Entity::exit(Position::new(10, 8, 0)))
        .unwrap();

    // Simple obstacles
    cube.spawn_and_propagate(Entity::wall(Position::new(5, 3, 0)))
        .unwrap();
    cube.spawn_and_propagate(Entity::wall(Position::new(5, 4, 0)))
        .unwrap();
    cube.spawn_and_propagate(Entity::pushable_box(Position::new(3, 3, 0)))
        .unwrap();

    // Rift demo
    cube.spawn_and_propagate(Entity::rift(
        Position::new(2, 2, 0),
        Position::new(8, 2, 2),
        true,
    ))
    .unwrap();

    let config = GameConfig {
        level_name: String::from("Phase 4 Prototype"),
        level_id: String::from("phase4-demo"),
        ..GameConfig::default()
    };

    GameState::new(cube, config).unwrap()
}
