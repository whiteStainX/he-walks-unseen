//! He Walks Unseen - Terminal Entry Point

use std::io::{self, stdout};
use std::time::Duration;

use crossterm::{
    event::{self, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Style},
    widgets::{Block, Borders, Paragraph},
    Frame, Terminal,
};

/// Application state
struct App {
    /// Whether the app should exit
    should_quit: bool,
}

impl App {
    fn new() -> Self {
        Self { should_quit: false }
    }

    /// Handle key events
    fn handle_key(&mut self, key: KeyCode) {
        match key {
            KeyCode::Char('q') | KeyCode::Esc => {
                self.should_quit = true;
            }
            // Future: WASD movement, etc.
            _ => {}
        }
    }
}

fn main() -> io::Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create app state
    let mut app = App::new();

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
    app: &mut App,
) -> io::Result<()> {
    loop {
        // Render
        terminal.draw(|frame| render(frame, app))?;

        // Handle input (with 16ms timeout for ~60fps)
        if event::poll(Duration::from_millis(16))? {
            if let Event::Key(key) = event::read()? {
                // Only handle key press events (not release)
                if key.kind == KeyEventKind::Press {
                    app.handle_key(key.code);
                }
            }
        }

        // Check exit condition
        if app.should_quit {
            break;
        }
    }

    Ok(())
}

/// Render the UI
fn render(frame: &mut Frame, _app: &App) {
    let area = frame.area();

    // Create main layout: game area + sidebar
    let main_layout = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Min(20),    // Game grid (flexible)
            Constraint::Length(15), // Sidebar (fixed width)
        ])
        .split(area);

    // Create vertical layout for game area + bottom bar
    let game_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Min(10),   // Game grid
            Constraint::Length(3), // Bottom bar
        ])
        .split(main_layout[0]);

    // Render game grid placeholder
    render_game_grid(frame, game_layout[0]);

    // Render sidebar placeholder
    render_sidebar(frame, main_layout[1]);

    // Render bottom bar
    render_bottom_bar(frame, game_layout[1]);
}

/// Render the game grid area
fn render_game_grid(frame: &mut Frame, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray))
        .title(" He Walks Unseen ");

    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Placeholder text
    let placeholder = Paragraph::new("Game grid will render here\n\nPhase 1: Foundation Complete")
        .style(Style::default().fg(Color::DarkGray));
    frame.render_widget(placeholder, inner);
}

/// Render the sidebar
fn render_sidebar(frame: &mut Frame, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray))
        .title(" Time ");

    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Time indicator placeholder
    let time_text = Paragraph::new("t = 0\n████████")
        .style(Style::default().fg(Color::Cyan));
    frame.render_widget(time_text, inner);
}

/// Render the bottom bar
fn render_bottom_bar(frame: &mut Frame, area: Rect) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray));

    let inner = block.inner(area);
    frame.render_widget(block, area);

    // Help text
    let help = Paragraph::new(" Q: Quit | WASD: Move (coming soon) | R: Restart (coming soon)")
        .style(Style::default().fg(Color::DarkGray));
    frame.render_widget(help, inner);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_app_creation() {
        let app = App::new();
        assert!(!app.should_quit);
    }

    #[test]
    fn test_quit_on_q() {
        let mut app = App::new();
        app.handle_key(KeyCode::Char('q'));
        assert!(app.should_quit);
    }

    #[test]
    fn test_quit_on_esc() {
        let mut app = App::new();
        app.handle_key(KeyCode::Esc);
        assert!(app.should_quit);
    }

    #[test]
    fn test_other_keys_dont_quit() {
        let mut app = App::new();
        app.handle_key(KeyCode::Char('w'));
        assert!(!app.should_quit);
    }
}
