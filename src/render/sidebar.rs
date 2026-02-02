//! Sidebar rendering for time and status info.

use ratatui::layout::Rect;
use ratatui::style::Style;
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, Borders, Paragraph};
use ratatui::Frame;

use crate::game::{ActionOutcome, GameState};
use crate::render::app::RenderState;
use crate::render::theme::Theme;

/// Render the sidebar.
pub fn render_sidebar(
    area: Rect,
    frame: &mut Frame,
    state: &GameState,
    render_state: &RenderState,
    theme: &Theme,
) {
    let block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(theme.accent))
        .title(" Time ");

    let inner = block.inner(area);
    frame.render_widget(block, area);

    let outcome_text = render_state
        .last_outcome
        .as_ref()
        .map(outcome_summary)
        .unwrap_or_else(|| "—".to_string());
    let status_text = render_state
        .status
        .as_deref()
        .unwrap_or("—");

    let mut lines = Vec::new();
    lines.push(Line::from(Span::styled(
        format!("Level: {}", state.config().level_name),
        Style::default().fg(theme.fg),
    )));
    lines.push(Line::from(Span::styled(
        format!("t = {}", state.current_time()),
        Style::default().fg(theme.fg),
    )));
    lines.push(Line::from(Span::styled(
        format!("Turn: {}", state.turn()),
        Style::default().fg(theme.fg),
    )));
    lines.push(Line::from(Span::styled(
        format!("Outcome: {}", outcome_text),
        Style::default().fg(theme.fg),
    )));
    lines.push(Line::from(Span::styled(
        format!("Status: {}", status_text),
        Style::default().fg(theme.fg),
    )));

    frame.render_widget(Paragraph::new(lines), inner);
}

fn outcome_summary(outcome: &ActionOutcome) -> String {
    match outcome {
        ActionOutcome::Moved { to, .. } => format!("Moved → ({},{},{})", to.x, to.y, to.t),
        ActionOutcome::Waited { .. } => "Wait".to_string(),
        ActionOutcome::Rifted { to, .. } => format!("Rift → ({},{},{})", to.x, to.y, to.t),
        ActionOutcome::Pushed { pushed, .. } => format!("Pushed {}", pushed.len()),
        ActionOutcome::Pulled { .. } => "Pulled".to_string(),
        ActionOutcome::Restarted => "Restarted".to_string(),
        ActionOutcome::Won { .. } => "Won!".to_string(),
        ActionOutcome::Detected { .. } => "Detected".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::Position;

    #[test]
    fn test_outcome_summary_moved() {
        let summary = outcome_summary(&ActionOutcome::Moved {
            from: Position::new(0, 0, 0),
            to: Position::new(1, 2, 3),
        });
        assert_eq!(summary, "Moved → (1,2,3)");
    }

    #[test]
    fn test_outcome_summary_pushed() {
        let summary = outcome_summary(&ActionOutcome::Pushed {
            player_to: Position::new(1, 1, 1),
            pushed: vec![],
        });
        assert_eq!(summary, "Pushed 0");
    }
}
