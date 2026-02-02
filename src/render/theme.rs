//! Theme colors for the UI.

use ratatui::style::Color;

/// Color palette for rendering.
#[derive(Debug, Clone, Copy)]
pub struct Theme {
    /// Background color.
    pub bg: Color,
    /// Default foreground color.
    pub fg: Color,
    /// Wall color.
    pub wall: Color,
    /// Player color.
    pub player: Color,
    /// Enemy color.
    pub enemy: Color,
    /// Exit color.
    pub exit: Color,
    /// Rift color.
    pub rift: Color,
    /// Box color.
    pub box_: Color,
    /// Accent color (headers, highlights).
    pub accent: Color,
}

impl Theme {
    /// Default Phase 4 palette.
    pub fn default() -> Self {
        Self {
            bg: Color::Black,
            fg: Color::Gray,
            wall: Color::DarkGray,
            player: Color::Cyan,
            enemy: Color::Red,
            exit: Color::Green,
            rift: Color::Magenta,
            box_: Color::Yellow,
            accent: Color::Blue,
        }
    }
}
