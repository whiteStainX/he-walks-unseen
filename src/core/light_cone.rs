//! Light cone geometry and ray casting for detection.

use crate::core::{Position, SpatialPos, TimeCube};

/// Bresenham's line algorithm for ray casting.
pub fn bresenham_line(x1: i32, y1: i32, x2: i32, y2: i32) -> Vec<(i32, i32)> {
    let mut points = Vec::new();

    let dx = (x2 - x1).abs();
    let dy = (y2 - y1).abs();
    let sx = if x1 < x2 { 1 } else { -1 };
    let sy = if y1 < y2 { 1 } else { -1 };
    let mut err = dx - dy;

    let mut x = x1;
    let mut y = y1;

    loop {
        points.push((x, y));

        if x == x2 && y == y2 {
            break;
        }

        let e2 = 2 * err;
        if e2 > -dy {
            err -= dy;
            x += sx;
        }
        if e2 < dx {
            err += dx;
            y += sy;
        }
    }

    points
}

/// Check if line of sight is blocked between two points at time t.
pub fn is_line_blocked(cube: &TimeCube, from: SpatialPos, to: SpatialPos, t: i32) -> bool {
    for (x, y) in bresenham_line(from.x, from.y, to.x, to.y) {
        if (x == from.x && y == from.y) || (x == to.x && y == to.y) {
            continue;
        }
        let pos = Position::new(x, y, t);
        if cube.blocks_vision(pos) {
            return true;
        }
    }
    false
}

/// Manhattan distance between two spatial positions.
pub fn manhattan_distance(a: SpatialPos, b: SpatialPos) -> i32 {
    (a.x - b.x).abs() + (a.y - b.y).abs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bresenham_horizontal() {
        let points = bresenham_line(0, 0, 3, 0);
        assert_eq!(points, vec![(0, 0), (1, 0), (2, 0), (3, 0)]);
    }

    #[test]
    fn test_bresenham_vertical() {
        let points = bresenham_line(0, 0, 0, 3);
        assert_eq!(points, vec![(0, 0), (0, 1), (0, 2), (0, 3)]);
    }

    #[test]
    fn test_bresenham_diagonal() {
        let points = bresenham_line(0, 0, 3, 3);
        assert_eq!(points, vec![(0, 0), (1, 1), (2, 2), (3, 3)]);
    }

    #[test]
    fn test_manhattan_distance() {
        assert_eq!(manhattan_distance(SpatialPos::new(0, 0), SpatialPos::new(3, 4)), 7);
    }
}
