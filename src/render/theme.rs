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
    /// Past-turn player color.
    pub player_ghost: Color,
    /// Enemy color.
    pub enemy: Color,
    /// Enemy vision/danger zone color.
    pub enemy_vision: Color,
    /// Exit color.
    pub exit: Color,
    /// Rift color.
    pub rift: Color,
    /// Box color.
    pub box_: Color,
    /// Accent color (headers, highlights).
    pub accent: Color,
}

impl Default for Theme {
    fn default() -> Self {
        Self {
            bg: Color::Black,
            fg: Color::Gray,
            wall: Color::DarkGray,
            player: Color::Cyan,
            player_ghost: Color::DarkGray,
            enemy: Color::Red,
            enemy_vision: Color::Rgb(51, 17, 17),
            exit: Color::Green,
            rift: Color::Magenta,
            box_: Color::Yellow,
            accent: Color::Blue,
        }
    }
}
