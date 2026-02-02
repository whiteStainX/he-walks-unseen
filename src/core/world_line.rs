//! World line tracking for the player.

use std::collections::HashSet;

use crate::core::position::Position;

/// The player's path through space-time.
///
/// **Invariants:**
/// - No two positions share the same `(x, y, t)` — no self-intersection.
/// - Path is ordered by **turn number** (move sequence), NOT by `t` coordinate.
/// - The `t` values may be non-monotonic (rifts can send player to the past).
#[derive(Debug, Clone)]
pub struct WorldLine {
    /// Ordered sequence of positions visited (by turn, not by t).
    path: Vec<Position>,
    /// Set for O(1) self-intersection checks.
    visited: HashSet<Position>,
}

/// Error types for world line operations.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum WorldLineError {
    /// Self-intersection at position.
    #[error("Self-intersection: position ({x}, {y}, {t}) already in world line")]
    SelfIntersection {
        /// X coordinate.
        x: i32,
        /// Y coordinate.
        y: i32,
        /// T coordinate.
        t: i32,
    },
    /// World line is empty.
    #[error("World line is empty")]
    Empty,
    /// Invalid step for normal movement.
    #[error("Invalid step: from ({fx}, {fy}, {ft}) to ({tx}, {ty}, {tt}) - must be same space or adjacent with t+1")]
    InvalidStep {
        /// From x.
        fx: i32,
        /// From y.
        fy: i32,
        /// From t.
        ft: i32,
        /// To x.
        tx: i32,
        /// To y.
        ty: i32,
        /// To t.
        tt: i32,
    },
}

impl WorldLine {
    /// Create a new world line starting at position (turn 0).
    pub fn new(start: Position) -> Self {
        let mut visited = HashSet::new();
        visited.insert(start);
        Self {
            path: vec![start],
            visited,
        }
    }

    /// Create an empty world line.
    pub fn empty() -> Self {
        Self {
            path: Vec::new(),
            visited: HashSet::new(),
        }
    }

    /// Get the current (last) position, or None if empty.
    pub fn current(&self) -> Option<Position> {
        self.path.last().copied()
    }

    /// Get the current time (t coordinate of last position).
    pub fn current_time(&self) -> Option<i32> {
        self.current().map(|pos| pos.t)
    }

    /// Get the starting position (turn 0), or None if empty.
    pub fn start(&self) -> Option<Position> {
        self.path.first().copied()
    }

    /// Get the full path as a slice (ordered by turn).
    pub fn path(&self) -> &[Position] {
        &self.path
    }

    /// Get position at a specific turn number.
    pub fn position_at_turn(&self, turn: usize) -> Option<Position> {
        self.path.get(turn).copied()
    }

    /// Get the number of turns (positions) in the line.
    pub fn len(&self) -> usize {
        self.path.len()
    }

    /// Get the current turn number (len - 1, or None if empty).
    pub fn current_turn(&self) -> Option<usize> {
        if self.path.is_empty() {
            None
        } else {
            Some(self.path.len() - 1)
        }
    }

    /// Check if empty.
    pub fn is_empty(&self) -> bool {
        self.path.is_empty()
    }

    /// Check if a position would cause self-intersection.
    pub fn would_intersect(&self, pos: Position) -> bool {
        self.visited.contains(&pos)
    }

    /// Check if adding position is a valid normal step (same space or adjacent, with t+1).
    pub fn is_valid_step(&self, pos: Position) -> bool {
        let current = match self.current() {
            Some(current) => current,
            None => return false,
        };
        pos.is_valid_step_from(&current)
    }

    /// Extend with a standard move (validates adjacency + t+1 + no intersection).
    pub fn extend(&mut self, pos: Position) -> Result<(), WorldLineError> {
        let current = self.current().ok_or(WorldLineError::Empty)?;
        if !pos.is_valid_step_from(&current) {
            return Err(WorldLineError::InvalidStep {
                fx: current.x,
                fy: current.y,
                ft: current.t,
                tx: pos.x,
                ty: pos.y,
                tt: pos.t,
            });
        }
        if self.would_intersect(pos) {
            return Err(WorldLineError::SelfIntersection {
                x: pos.x,
                y: pos.y,
                t: pos.t,
            });
        }
        self.path.push(pos);
        self.visited.insert(pos);
        Ok(())
    }

    /// Extend via rift (validates only self-intersection, skips adjacency/time check).
    pub fn extend_via_rift(&mut self, pos: Position) -> Result<(), WorldLineError> {
        if self.is_empty() {
            return Err(WorldLineError::Empty);
        }
        if self.would_intersect(pos) {
            return Err(WorldLineError::SelfIntersection {
                x: pos.x,
                y: pos.y,
                t: pos.t,
            });
        }
        self.path.push(pos);
        self.visited.insert(pos);
        Ok(())
    }

    /// Try to extend with standard move, returns false on any validation failure.
    pub fn try_extend(&mut self, pos: Position) -> bool {
        self.extend(pos).is_ok()
    }

    /// Check if the world line contains a position (same x, y, t).
    pub fn contains(&self, pos: Position) -> bool {
        self.visited.contains(&pos)
    }

    /// Get ALL positions at a specific time t (may be multiple due to time travel).
    /// Returns empty vec if none.
    pub fn positions_at_time(&self, t: i32) -> Vec<Position> {
        self.path.iter().copied().filter(|pos| pos.t == t).collect()
    }

    /// Get the time range (min_t, max_t) across all positions, or None if empty.
    pub fn time_range(&self) -> Option<(i32, i32)> {
        let mut iter = self.path.iter();
        let first = iter.next()?;
        let mut min_t = first.t;
        let mut max_t = first.t;
        for pos in iter {
            if pos.t < min_t {
                min_t = pos.t;
            }
            if pos.t > max_t {
                max_t = pos.t;
            }
        }
        Some((min_t, max_t))
    }

    /// Get all unique time values visited, sorted ascending.
    pub fn visited_times(&self) -> Vec<i32> {
        let mut unique: Vec<i32> = self.path.iter().map(|pos| pos.t).collect();
        unique.sort_unstable();
        unique.dedup();
        unique
    }

    /// Reset to a new starting position (clears history).
    pub fn reset(&mut self, start: Position) {
        self.path.clear();
        self.visited.clear();
        self.path.push(start);
        self.visited.insert(start);
    }

    /// Clear the world line entirely.
    pub fn clear(&mut self) {
        self.path.clear();
        self.visited.clear();
    }

    /// Iterator over positions (in turn order).
    pub fn iter(&self) -> impl Iterator<Item = &Position> {
        self.path.iter()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_world_line_new() {
        let wl = WorldLine::new(Position::new(0, 0, 0));
        assert_eq!(wl.len(), 1);
        assert_eq!(wl.current(), Some(Position::new(0, 0, 0)));
    }

    #[test]
    fn test_world_line_empty() {
        let wl = WorldLine::empty();
        assert!(wl.is_empty());
        assert_eq!(wl.current(), None);
    }

    #[test]
    fn test_world_line_extend_valid() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        assert_eq!(wl.len(), 2);
    }

    #[test]
    fn test_world_line_extend_self_intersection() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(0, 0, 1)).unwrap();
        let err = wl.extend_via_rift(Position::new(0, 0, 0)).unwrap_err();
        assert!(matches!(err, WorldLineError::SelfIntersection { .. }));
    }

    #[test]
    fn test_world_line_extend_invalid_step_wrong_time() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        let err = wl.extend(Position::new(1, 0, 2)).unwrap_err();
        assert!(matches!(err, WorldLineError::InvalidStep { .. }));
    }

    #[test]
    fn test_world_line_extend_invalid_step_not_adjacent() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        let err = wl.extend(Position::new(2, 0, 1)).unwrap_err();
        assert!(matches!(err, WorldLineError::InvalidStep { .. }));
    }

    #[test]
    fn test_world_line_extend_wait() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(0, 0, 1)).unwrap();
        assert_eq!(wl.current(), Some(Position::new(0, 0, 1)));
    }

    #[test]
    fn test_world_line_extend_via_rift_to_past() {
        let mut wl = WorldLine::new(Position::new(1, 1, 1));
        wl.extend_via_rift(Position::new(0, 0, 0)).unwrap();
        assert_eq!(wl.current(), Some(Position::new(0, 0, 0)));
    }

    #[test]
    fn test_world_line_extend_via_rift_to_future() {
        let mut wl = WorldLine::new(Position::new(1, 1, 1));
        wl.extend_via_rift(Position::new(2, 2, 5)).unwrap();
        assert_eq!(wl.current_time(), Some(5));
    }

    #[test]
    fn test_world_line_rift_then_normal_move() {
        let mut wl = WorldLine::new(Position::new(1, 1, 1));
        wl.extend_via_rift(Position::new(0, 0, 0)).unwrap();
        wl.extend(Position::new(0, 0, 1)).unwrap();
        assert_eq!(wl.current(), Some(Position::new(0, 0, 1)));
    }

    #[test]
    fn test_world_line_would_intersect() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        assert!(wl.would_intersect(Position::new(0, 0, 0)));
    }

    #[test]
    fn test_world_line_would_intersect_after_rift() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend_via_rift(Position::new(1, 1, 0)).unwrap();
        assert!(wl.would_intersect(Position::new(1, 1, 0)));
    }

    #[test]
    fn test_world_line_is_valid_step() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        assert!(wl.is_valid_step(Position::new(0, 0, 1)));
        assert!(wl.is_valid_step(Position::new(1, 0, 1)));
        assert!(!wl.is_valid_step(Position::new(2, 0, 1)));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        assert!(wl.is_valid_step(Position::new(1, 0, 2)));
    }

    #[test]
    fn test_world_line_contains() {
        let wl = WorldLine::new(Position::new(0, 0, 0));
        assert!(wl.contains(Position::new(0, 0, 0)));
        assert!(!wl.contains(Position::new(1, 0, 0)));
    }

    #[test]
    fn test_world_line_positions_at_time_single() {
        let wl = WorldLine::new(Position::new(0, 0, 0));
        let positions = wl.positions_at_time(0);
        assert_eq!(positions.len(), 1);
    }

    #[test]
    fn test_world_line_positions_at_time_multiple() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        wl.extend_via_rift(Position::new(2, 2, 0)).unwrap();
        let positions = wl.positions_at_time(0);
        assert_eq!(positions.len(), 2);
    }

    #[test]
    fn test_world_line_positions_at_time_none() {
        let wl = WorldLine::new(Position::new(0, 0, 0));
        let positions = wl.positions_at_time(5);
        assert!(positions.is_empty());
    }

    #[test]
    fn test_world_line_time_range() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        assert_eq!(wl.time_range(), Some((0, 1)));
    }

    #[test]
    fn test_world_line_time_range_non_monotonic() {
        let mut wl = WorldLine::new(Position::new(0, 0, 1));
        wl.extend_via_rift(Position::new(1, 1, 0)).unwrap();
        assert_eq!(wl.time_range(), Some((0, 1)));
    }

    #[test]
    fn test_world_line_visited_times() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        wl.extend_via_rift(Position::new(2, 2, 0)).unwrap();
        assert_eq!(wl.visited_times(), vec![0, 1]);
    }

    #[test]
    fn test_world_line_current_time() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        assert_eq!(wl.current_time(), Some(1));
    }

    #[test]
    fn test_world_line_current_turn() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        assert_eq!(wl.current_turn(), Some(1));
    }

    #[test]
    fn test_world_line_position_at_turn() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        assert_eq!(wl.position_at_turn(1), Some(Position::new(1, 0, 1)));
    }

    #[test]
    fn test_world_line_reset() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        wl.reset(Position::new(2, 2, 0));
        assert_eq!(wl.len(), 1);
        assert_eq!(wl.current(), Some(Position::new(2, 2, 0)));
    }

    #[test]
    fn test_world_line_clear() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.clear();
        assert!(wl.is_empty());
    }

    #[test]
    fn test_world_line_try_extend() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        assert!(wl.try_extend(Position::new(1, 0, 1)));
        assert!(!wl.try_extend(Position::new(3, 0, 2)));
    }

    #[test]
    fn test_world_line_iteration_order() {
        let mut wl = WorldLine::new(Position::new(0, 0, 0));
        wl.extend(Position::new(1, 0, 1)).unwrap();
        wl.extend(Position::new(2, 0, 2)).unwrap();
        let positions: Vec<Position> = wl.iter().copied().collect();
        assert_eq!(
            positions,
            vec![
                Position::new(0, 0, 0),
                Position::new(1, 0, 1),
                Position::new(2, 0, 2)
            ]
        );
    }
}
