//! Position and spatial math utilities.

/// A position in the 3D Space-Time Cube.
///
/// Valid ranges:
/// - `x`: 0 <= x < width (defined by TimeCube)
/// - `y`: 0 <= y < height (defined by TimeCube)
/// - `t`: 0 <= t < time_depth (defined by TimeCube)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct Position {
    /// X coordinate
    pub x: i32,
    /// Y coordinate
    pub y: i32,
    /// Time coordinate
    pub t: i32,
}

/// A 2D spatial position (no time component).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct SpatialPos {
    /// X coordinate
    pub x: i32,
    /// Y coordinate
    pub y: i32,
}

/// Cardinal directions for movement (no diagonals).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Direction {
    /// y - 1
    North,
    /// y + 1
    South,
    /// x + 1
    East,
    /// x - 1
    West,
}

impl Position {
    /// Create a new position.
    pub const fn new(x: i32, y: i32, t: i32) -> Self {
        Self { x, y, t }
    }

    /// Get the spatial component (x, y).
    pub const fn spatial(&self) -> SpatialPos {
        SpatialPos::new(self.x, self.y)
    }

    /// Move in a direction (time unchanged).
    pub const fn move_dir(&self, dir: Direction) -> Self {
        let (dx, dy) = dir.delta();
        Self::new(self.x + dx, self.y + dy, self.t)
    }

    /// Advance time by 1 (position unchanged).
    pub const fn tick(&self) -> Self {
        Self::new(self.x, self.y, self.t + 1)
    }

    /// Move in direction AND advance time (standard game move).
    pub const fn step(&self, dir: Direction) -> Self {
        let (dx, dy) = dir.delta();
        Self::new(self.x + dx, self.y + dy, self.t + 1)
    }

    /// Wait in place (advance time only).
    pub const fn wait(&self) -> Self {
        self.tick()
    }

    /// Manhattan distance to another position (spatial only, ignores t).
    pub fn manhattan_distance(&self, other: &Position) -> u32 {
        (self.x - other.x).unsigned_abs() + (self.y - other.y).unsigned_abs()
    }

    /// Euclidean distance to another position (spatial only, ignores t).
    pub fn euclidean_distance(&self, other: &Position) -> f64 {
        let dx = (self.x - other.x) as f64;
        let dy = (self.y - other.y) as f64;
        (dx * dx + dy * dy).sqrt()
    }

    /// Check if same (x, y, t).
    pub const fn same_spacetime(&self, other: &Position) -> bool {
        self.x == other.x && self.y == other.y && self.t == other.t
    }

    /// Check if same (x, y), ignoring t.
    pub const fn same_space(&self, other: &Position) -> bool {
        self.x == other.x && self.y == other.y
    }

    /// Check if this position is spatially adjacent to another (Manhattan distance = 1).
    pub fn is_adjacent(&self, other: &Position) -> bool {
        self.manhattan_distance(other) == 1
    }

    /// Check if this is a valid next step from current position.
    /// Valid: same space with t+1, OR adjacent space with t+1.
    pub fn is_valid_step_from(&self, current: &Position) -> bool {
        self.t == current.t + 1 && current.manhattan_distance(self) <= 1
    }
}

impl SpatialPos {
    /// Create a new spatial position.
    pub const fn new(x: i32, y: i32) -> Self {
        Self { x, y }
    }

    /// Manhattan distance to another spatial position.
    pub fn manhattan_distance(&self, other: &SpatialPos) -> u32 {
        (self.x - other.x).unsigned_abs() + (self.y - other.y).unsigned_abs()
    }

    /// Check if this position is spatially adjacent (Manhattan distance = 1).
    pub fn is_adjacent(&self, other: &SpatialPos) -> bool {
        self.manhattan_distance(other) == 1
    }
}

impl Direction {
    /// Get the (dx, dy) delta for this direction.
    pub const fn delta(&self) -> (i32, i32) {
        match self {
            Direction::North => (0, -1),
            Direction::South => (0, 1),
            Direction::East => (1, 0),
            Direction::West => (-1, 0),
        }
    }

    /// Get the opposite direction.
    pub const fn opposite(&self) -> Direction {
        match self {
            Direction::North => Direction::South,
            Direction::South => Direction::North,
            Direction::East => Direction::West,
            Direction::West => Direction::East,
        }
    }

    /// All four cardinal directions.
    pub const fn all() -> [Direction; 4] {
        [Direction::North, Direction::South, Direction::East, Direction::West]
    }

    /// Try to determine direction from one position to adjacent position.
    pub fn from_delta(dx: i32, dy: i32) -> Option<Direction> {
        match (dx, dy) {
            (0, -1) => Some(Direction::North),
            (0, 1) => Some(Direction::South),
            (1, 0) => Some(Direction::East),
            (-1, 0) => Some(Direction::West),
            _ => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_position_creation() {
        let pos = Position::new(1, 2, 3);
        assert_eq!(pos.x, 1);
        assert_eq!(pos.y, 2);
        assert_eq!(pos.t, 3);
    }

    #[test]
    fn test_move_direction_north_south_east_west() {
        let pos = Position::new(5, 5, 0);
        assert_eq!(pos.move_dir(Direction::North), Position::new(5, 4, 0));
        assert_eq!(pos.move_dir(Direction::South), Position::new(5, 6, 0));
        assert_eq!(pos.move_dir(Direction::East), Position::new(6, 5, 0));
        assert_eq!(pos.move_dir(Direction::West), Position::new(4, 5, 0));
    }

    #[test]
    fn test_tick_advances_time_only() {
        let pos = Position::new(1, 2, 3);
        assert_eq!(pos.tick(), Position::new(1, 2, 4));
    }

    #[test]
    fn test_step_moves_and_ticks() {
        let pos = Position::new(1, 2, 3);
        assert_eq!(pos.step(Direction::East), Position::new(2, 2, 4));
    }

    #[test]
    fn test_wait_equals_tick() {
        let pos = Position::new(0, 0, 0);
        assert_eq!(pos.wait(), pos.tick());
    }

    #[test]
    fn test_manhattan_distance() {
        let a = Position::new(0, 0, 0);
        let b = Position::new(3, 4, 5);
        assert_eq!(a.manhattan_distance(&b), 7);
    }

    #[test]
    fn test_euclidean_distance() {
        let a = Position::new(0, 0, 0);
        let b = Position::new(3, 4, 5);
        assert_eq!(a.euclidean_distance(&b), 5.0);
    }

    #[test]
    fn test_same_spacetime() {
        let a = Position::new(1, 2, 3);
        let b = Position::new(1, 2, 3);
        let c = Position::new(1, 2, 4);
        assert!(a.same_spacetime(&b));
        assert!(!a.same_spacetime(&c));
    }

    #[test]
    fn test_same_space_different_time() {
        let a = Position::new(1, 2, 3);
        let b = Position::new(1, 2, 4);
        assert!(a.same_space(&b));
        assert!(!a.same_spacetime(&b));
    }

    #[test]
    fn test_is_adjacent() {
        let a = Position::new(1, 1, 0);
        let b = Position::new(2, 1, 0);
        let c = Position::new(1, 2, 0);
        let d = Position::new(2, 2, 0);
        assert!(a.is_adjacent(&b));
        assert!(a.is_adjacent(&c));
        assert!(!a.is_adjacent(&d));
    }

    #[test]
    fn test_is_valid_step_from() {
        let current = Position::new(1, 1, 0);
        let same_space = Position::new(1, 1, 1);
        let adjacent = Position::new(2, 1, 1);
        let diagonal = Position::new(2, 2, 1);
        let wrong_time = Position::new(2, 1, 2);
        assert!(same_space.is_valid_step_from(&current));
        assert!(adjacent.is_valid_step_from(&current));
        assert!(!diagonal.is_valid_step_from(&current));
        assert!(!wrong_time.is_valid_step_from(&current));
    }

    #[test]
    fn test_direction_delta() {
        assert_eq!(Direction::North.delta(), (0, -1));
        assert_eq!(Direction::South.delta(), (0, 1));
        assert_eq!(Direction::East.delta(), (1, 0));
        assert_eq!(Direction::West.delta(), (-1, 0));
    }

    #[test]
    fn test_direction_opposite() {
        assert_eq!(Direction::North.opposite(), Direction::South);
        assert_eq!(Direction::South.opposite(), Direction::North);
        assert_eq!(Direction::East.opposite(), Direction::West);
        assert_eq!(Direction::West.opposite(), Direction::East);
    }

    #[test]
    fn test_direction_from_delta() {
        assert_eq!(Direction::from_delta(0, -1), Some(Direction::North));
        assert_eq!(Direction::from_delta(0, 1), Some(Direction::South));
        assert_eq!(Direction::from_delta(1, 0), Some(Direction::East));
        assert_eq!(Direction::from_delta(-1, 0), Some(Direction::West));
        assert_eq!(Direction::from_delta(1, 1), None);
    }
}
