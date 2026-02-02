//! Ratatui application bridge for game state.

use crossterm::event::KeyCode;
use ratatui::layout::{Constraint, Direction, Layout, Rect};
use ratatui::style::{Color, Style};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::core::Direction as MoveDir;
use crate::game::{apply_action, Action, ActionError, ActionOutcome, GameState};
use crate::render::grid::render_grid;
use crate::render::preview::render_preview_overlay;
use crate::render::sidebar::render_sidebar;
use crate::render::theme::Theme;

/// Render app that owns the game state and UI state.
pub struct RenderApp {
    game: GameState,
    render_state: RenderState,
    should_quit: bool,
    pending_action: Option<Action>,
    theme: Theme,
}

/// UI-only state.
pub struct RenderState {
    /// Show preview overlay.
    pub show_preview: bool,
    /// Last action outcome.
    pub last_outcome: Option<ActionOutcome>,
    /// Status message (errors).
    pub status: Option<String>,
}

impl RenderApp {
    /// Create a new render app.
    pub fn new(game: GameState) -> Self {
        Self {
            game,
            render_state: RenderState {
                show_preview: false,
                last_outcome: None,
                status: None,
            },
            should_quit: false,
            pending_action: None,
            theme: Theme::default(),
        }
    }

    /// Check if the app should quit.
    pub fn should_quit(&self) -> bool {
        self.should_quit
    }

    /// Handle a single key input.
    pub fn handle_key(&mut self, key: KeyCode) {
        match key {
            KeyCode::Char('q') | KeyCode::Esc => {
                self.should_quit = true;
            }
            KeyCode::Char('w') | KeyCode::Char('W') => {
                self.pending_action = Some(Action::Move(MoveDir::North));
            }
            KeyCode::Char('a') | KeyCode::Char('A') => {
                self.pending_action = Some(Action::Move(MoveDir::West));
            }
            KeyCode::Char('s') | KeyCode::Char('S') => {
                self.pending_action = Some(Action::Move(MoveDir::South));
            }
            KeyCode::Char('d') | KeyCode::Char('D') => {
                self.pending_action = Some(Action::Move(MoveDir::East));
            }
            KeyCode::Char(' ') => {
                self.pending_action = Some(Action::UseRift);
            }
            KeyCode::Char('r') | KeyCode::Char('R') => {
                self.pending_action = Some(Action::Restart);
            }
            KeyCode::Char('p') | KeyCode::Char('P') => {
                self.render_state.show_preview = !self.render_state.show_preview;
            }
            _ => {}
        }
    }

    /// Apply any pending action.
    pub fn update(&mut self) -> Result<(), ActionError> {
        let Some(action) = self.pending_action.take() else {
            return Ok(());
        };

        match apply_action(&self.game, action) {
            Ok(result) => {
                self.game = result.state;
                self.render_state.last_outcome = Some(result.outcome);
                self.render_state.status = None;
                Ok(())
            }
            Err(err) => {
                self.render_state.status = Some(status_message(&err).to_string());
                Err(err)
            }
        }
    }

    /// Render the UI for the current frame.
    pub fn render(&self, frame: &mut Frame) {
        let area = frame.area();
        let main_layout = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([
                Constraint::Min(20),
                Constraint::Length(18),
            ])
            .split(area);

        let game_layout = Layout::default()
            .direction(Direction::Vertical)
            .constraints([
                Constraint::Min(10),
                Constraint::Length(3),
            ])
            .split(main_layout[0]);

        render_grid(game_layout[0], frame, &self.game, &self.theme);
        render_sidebar(
            main_layout[1],
            frame,
            &self.game,
            &self.render_state,
            &self.theme,
        );
        render_bottom_bar(game_layout[1], frame, &self.theme);
        render_preview_overlay(game_layout[0], frame, self.render_state.show_preview);
    }
}

fn render_bottom_bar(area: Rect, frame: &mut Frame, theme: &Theme) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(theme.wall));
    let inner = block.inner(area);
    frame.render_widget(block, area);

    let help = Paragraph::new(" Q: Quit | WASD: Move | Space: Rift | R: Restart | P: Preview ")
        .style(Style::default().fg(Color::DarkGray));
    frame.render_widget(help, inner);
}

fn status_message(error: &ActionError) -> &'static str {
    match error {
        ActionError::GameNotActive { .. } => "Not active",
        ActionError::MoveBlocked(_) => "Blocked",
        ActionError::NoRiftHere => "No rift",
        ActionError::InvalidRiftTarget { .. } => "Invalid rift",
        ActionError::NothingToPush { .. } => "Nothing to push",
        ActionError::PushBlocked { .. } => "Push blocked",
        ActionError::PushChainTooLong { .. } => "Push chain too long",
        ActionError::NothingToPull { .. } => "Nothing to pull",
        ActionError::NotPullable { .. } => "Not pullable",
        ActionError::Internal(_) => "Internal error",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{Entity, Position, TimeCube};
    use crate::game::GameState;

    fn state() -> GameState {
        let mut cube = TimeCube::new(3, 3, 2);
        cube.spawn(Entity::player(Position::new(0, 0, 0))).unwrap();
        GameState::from_cube(cube).unwrap()
    }

    #[test]
    fn test_preview_toggle() {
        let mut app = RenderApp::new(state());
        assert!(!app.render_state.show_preview);
        app.handle_key(KeyCode::Char('p'));
        assert!(app.render_state.show_preview);
    }

    #[test]
    fn test_status_message_on_error() {
        let mut app = RenderApp::new(state());
        app.handle_key(KeyCode::Char('a'));
        let _ = app.update();
        assert!(app.render_state.status.is_some());
    }
}
