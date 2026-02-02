//! Preview overlay (placeholder for Phase 4).

use ratatui::layout::Rect;
use ratatui::style::{Color, Style};
use ratatui::widgets::Paragraph;
use ratatui::Frame;

/// Render a placeholder preview overlay.
pub fn render_preview_overlay(area: Rect, frame: &mut Frame, enabled: bool) {
    if !enabled {
        return;
    }

    let label = Paragraph::new("[Preview]").style(Style::default().fg(Color::DarkGray));
    frame.render_widget(label, area);
}

 
