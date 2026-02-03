//! Preview overlay (placeholder for Phase 4).

use ratatui::layout::{Alignment, Rect};
use ratatui::style::{Color, Style};
use ratatui::widgets::Paragraph;
use ratatui::Frame;

/// Render a placeholder preview overlay.
pub fn render_preview_overlay(area: Rect, frame: &mut Frame, enabled: bool) {
    if !enabled {
        return;
    }

    let label_area = preview_label_area(area, 10);
    let label = Paragraph::new("[Preview]")
        .style(Style::default().fg(Color::DarkGray))
        .alignment(Alignment::Right);
    frame.render_widget(label, label_area);
}

fn preview_label_area(area: Rect, label_width: u16) -> Rect {
    let width = label_width.min(area.width);
    let x = area.x.saturating_add(area.width.saturating_sub(width));
    Rect {
        x,
        y: area.y,
        width,
        height: 1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preview_label_area_small() {
        let area = Rect::new(0, 0, 4, 2);
        let label = preview_label_area(area, 10);
        assert_eq!(label.width, 4);
        assert_eq!(label.height, 1);
        assert_eq!(label.x, 0);
        assert_eq!(label.y, 0);
    }
}
