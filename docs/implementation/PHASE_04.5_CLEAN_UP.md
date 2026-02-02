# Phase 4.5: Cleanup & Consolidation

> **Depends on:** Phase 4 (Rendering)
> **Enables:** Phase 5 (Light Cone Vision)

---

## Overview

This phase addresses technical debt, documentation inconsistencies, and missing functionality discovered during the Phase 3/4 review. Completing these items ensures a solid foundation before implementing light cone vision.

**Goal:** Resolve all discrepancies between design docs and implementation, add missing test coverage, and fix minor UX issues.

**Estimated Scope:** Small fixes, no architectural changes.

---

## Task List

### 1. Propagation API Consolidation

**Priority:** High
**Files:** `src/core/time_cube.rs`, `src/core/propagation.rs`

**Problem:** Phase 2 `TimeCube::propagate_slice()` and `propagate_all()` have standalone implementations. Phase 3 introduced `propagation.rs` as the "authoritative" module, but Phase 2 methods weren't updated to wrap it.

**Current State:**
- `time_cube.rs:306-345` has independent propagation logic
- `actions.rs` directly calls `propagation::propagate_from_with_options()`
- Two parallel code paths exist

**Solution:** Update Phase 2 methods to delegate to the propagation module.

**Implementation:**

```rust
// src/core/time_cube.rs

impl TimeCube {
    /// Propagate all time-persistent entities from t to t+1.
    ///
    /// Wrapper around `propagation::propagate_from` for single-slice propagation.
    pub fn propagate_slice(&mut self, from_t: i32) -> Result<usize, CubeError> {
        let result = crate::core::propagation::propagate_from_with_options(
            self,
            from_t,
            crate::core::propagation::PropagationOptions {
                stop_at: Some(from_t + 1),
                ..Default::default()
            },
        )?;
        Ok(result.context.slices_updated)
    }

    /// Propagate all time-persistent entities from t=0 to time_depth-1.
    ///
    /// Wrapper around `propagation::propagate_from`.
    pub fn propagate_all(&mut self) -> Result<crate::core::propagation::PropagationResult, CubeError> {
        crate::core::propagation::propagate_from(self, 0)
    }
}
```

**Tests to Add:**
- `test_propagate_slice_wrapper_matches_module`
- `test_propagate_all_wrapper_matches_module`

**Verification:**
- Existing tests still pass
- `propagate_slice` returns count consistent with `PropagationResult.slices_updated`

---

### 2. Arrow Key Support

**Priority:** Medium
**Files:** `src/render/app.rs`

**Problem:** OVERALL.md specifies "Directional (WASD/Arrows)" but only WASD is implemented.

**Implementation:**

```rust
// src/render/app.rs, in handle_key()

pub fn handle_key(&mut self, key: KeyCode) {
    match key {
        KeyCode::Char('q') | KeyCode::Esc => {
            self.should_quit = true;
        }
        KeyCode::Char('w') | KeyCode::Char('W') | KeyCode::Up => {
            self.pending_action = Some(Action::Move(MoveDir::North));
        }
        KeyCode::Char('a') | KeyCode::Char('A') | KeyCode::Left => {
            self.pending_action = Some(Action::Move(MoveDir::West));
        }
        KeyCode::Char('s') | KeyCode::Char('S') | KeyCode::Down => {
            self.pending_action = Some(Action::Move(MoveDir::South));
        }
        KeyCode::Char('d') | KeyCode::Char('D') | KeyCode::Right => {
            self.pending_action = Some(Action::Move(MoveDir::East));
        }
        // ... rest unchanged
    }
}
```

**Tests to Add:**
- `test_arrow_key_up_moves_north`
- `test_arrow_key_left_moves_west`

**Update:** Bottom bar help text to include arrows:
```rust
" Q: Quit | WASD/Arrows: Move | Space: Rift | R: Restart | P: Preview "
```

---

### 3. Fix Preview Overlay Positioning

**Priority:** Low
**Files:** `src/render/preview.rs`

**Problem:** The `[Preview]` label renders at position (0,0) of the grid area, potentially overlapping game content.

**Solution:** Position the label in the top-right corner of the grid area.

**Implementation:**

```rust
// src/render/preview.rs

use ratatui::layout::{Alignment, Rect};
use ratatui::style::{Color, Style};
use ratatui::widgets::Paragraph;
use ratatui::Frame;

/// Render a placeholder preview overlay.
pub fn render_preview_overlay(area: Rect, frame: &mut Frame, enabled: bool) {
    if !enabled {
        return;
    }

    // Position in top-right corner
    let label_width = 10u16; // "[Preview]" + padding
    let label_area = Rect {
        x: area.x.saturating_add(area.width.saturating_sub(label_width)),
        y: area.y,
        width: label_width.min(area.width),
        height: 1,
    };

    let label = Paragraph::new("[Preview]")
        .style(Style::default().fg(Color::DarkGray))
        .alignment(Alignment::Right);
    frame.render_widget(label, label_area);
}
```

**Tests to Add:**
- `test_preview_overlay_does_not_panic_small_area`

---

### 4. Add Missing Test Coverage

**Priority:** Medium
**Files:** `src/game/state.rs`, `src/game/actions.rs`, `src/game/validation.rs`

**Missing Tests from Spec:**

#### state.rs
```rust
#[test]
fn test_is_active_false_when_won() {
    let mut cube = TimeCube::new(5, 5, 3);
    cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
    cube.spawn(Entity::exit(Position::new(1, 1, 0))).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    // Player starts on exit
    let result = apply_action(&state, Action::Wait).unwrap();
    assert!(!result.state.is_active());
    assert!(result.state.has_won());
}

#[test]
fn test_valid_actions_at_rift() {
    let mut cube = TimeCube::new(5, 5, 5);
    cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
    cube.spawn(Entity::rift(Position::new(1, 1, 0), Position::new(2, 2, 2), false)).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    let actions = state.valid_actions();
    assert!(actions.contains(&Action::UseRift));
}
```

#### actions.rs
```rust
#[test]
fn test_apply_move_advances_time() {
    let state = basic_state();
    let result = apply_action(&state, Action::Move(Direction::East)).unwrap();
    assert_eq!(result.state.current_time(), 1);
}

#[test]
fn test_apply_move_extends_world_line() {
    let state = basic_state();
    let result = apply_action(&state, Action::Move(Direction::East)).unwrap();
    assert_eq!(result.state.world_line().len(), 2);
}

#[test]
fn test_apply_push_single_box() {
    let mut cube = TimeCube::new(5, 5, 5);
    cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
    cube.spawn(Entity::pushable_box(Position::new(2, 1, 0))).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    let result = apply_action(&state, Action::Push(Direction::East)).unwrap();
    assert_eq!(result.state.player_position(), Position::new(2, 1, 1));
    // Box should be at (3, 1, 1)
    assert!(result.state.cube().entities_at(Position::new(3, 1, 1))
        .iter().any(|e| e.entity_type() == EntityType::Box));
}

#[test]
fn test_apply_push_blocked_by_wall() {
    let mut cube = TimeCube::new(5, 5, 5);
    cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
    cube.spawn(Entity::pushable_box(Position::new(2, 1, 0))).unwrap();
    cube.spawn(Entity::wall(Position::new(3, 1, 1))).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    let err = apply_action(&state, Action::Push(Direction::East)).unwrap_err();
    assert!(matches!(err, ActionError::PushBlocked { .. }));
}

#[test]
fn test_apply_pull_success() {
    let mut cube = TimeCube::new(5, 5, 5);
    cube.spawn(Entity::player(Position::new(2, 1, 0))).unwrap();
    cube.spawn(Entity::pullable_box(Position::new(1, 1, 0))).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    let result = apply_action(&state, Action::Pull(Direction::East)).unwrap();
    assert_eq!(result.state.player_position(), Position::new(3, 1, 1));
    // Pulled box should be at player's old position (2, 1, 1)
    assert!(result.state.cube().entities_at(Position::new(2, 1, 1))
        .iter().any(|e| e.entity_type() == EntityType::Box));
}

#[test]
fn test_win_on_exit() {
    let mut cube = TimeCube::new(5, 5, 5);
    cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
    cube.spawn(Entity::exit(Position::new(2, 1, 0))).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    let result = apply_action(&state, Action::Move(Direction::East)).unwrap();
    assert!(result.state.has_won());
    assert!(matches!(result.outcome, ActionOutcome::Won { .. }));
}
```

#### validation.rs
```rust
#[test]
fn test_validate_push_chain() {
    let mut cube = TimeCube::new(10, 5, 5);
    cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
    cube.spawn(Entity::pushable_box(Position::new(2, 1, 0))).unwrap();
    cube.spawn(Entity::pushable_box(Position::new(3, 1, 0))).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    let chain = validate_push(&state, Direction::East).unwrap();
    assert_eq!(chain.len(), 2);
}

#[test]
fn test_validate_push_chain_limit() {
    let mut cube = TimeCube::new(10, 5, 5);
    cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
    // Create 4 boxes (exceeds default max_push_chain of 3)
    for x in 2..6 {
        cube.spawn(Entity::pushable_box(Position::new(x, 1, 0))).unwrap();
    }
    let state = GameState::from_cube(cube).unwrap();
    let err = validate_push(&state, Direction::East).unwrap_err();
    assert!(matches!(err, ActionError::PushChainTooLong { .. }));
}

#[test]
fn test_validate_pull_not_pullable() {
    let mut cube = TimeCube::new(5, 5, 5);
    cube.spawn(Entity::player(Position::new(2, 1, 0))).unwrap();
    // Wall is not pullable
    cube.spawn(Entity::wall(Position::new(1, 1, 0))).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    let err = validate_pull(&state, Direction::East).unwrap_err();
    assert!(matches!(err, ActionError::NothingToPull { .. }));
}
```

---

### 5. Update Documentation

**Priority:** Low
**Files:** `docs/design/GAME_STATE.md`, `docs/implementation/PHASE_03_GAME_STATE.md`

#### GAME_STATE.md Line 233
**Current:** `phase = Restarted`
**Update to:** `phase = Playing` (with note that Restarted is for UI feedback only)

```markdown
### Restart Behavior

`Action::Restart` resets the game to initial snapshots:
- `cube = initial_cube.clone()`
- `world_line = initial_world_line.clone()`
- `phase = Playing`  // Game immediately becomes playable
- `turn = 0`
- `history` cleared

Note: `ActionOutcome::Restarted` is returned for UI feedback, but the game
phase is set to `Playing` to allow immediate play.
```

#### PHASE_03_GAME_STATE.md Propagation Section
**Update:** Clarify the actual relationship between Phase 2 wrappers and Phase 3 module.

After completing Task 1 (propagation consolidation), update the diagram:

```markdown
### Propagation: Replace & Wrap (Single Source of Truth)

Phase 2 methods (`TimeCube::propagate_slice`, `propagate_all`) are thin wrappers
that delegate to `core/propagation.rs`:

```
Phase 2 (wrappers):                    Phase 3 (implementation):
┌─────────────────────────┐            ┌─────────────────────────────────┐
│ TimeCube::propagate_slice() ────────►│ propagation::propagate_from()   │
│ TimeCube::propagate_all()   ────────►│   with stop_at option           │
└─────────────────────────┘            └─────────────────────────────────┘
```
```

---

### 6. Add Code Comments for Time Semantics

**Priority:** Low
**Files:** `src/game/validation.rs`

**Add to `validate_push`:**

```rust
/// Validate a push action.
///
/// # Time Slice Semantics
///
/// - **Chain computation:** Scans the **current slice** (`t = current_time`) for
///   adjacent pushable entities in the given direction.
/// - **Target validation:** Checks that all pushed entities can occupy their
///   **next slice** positions (`t + 1`). Walls and blocking entities are checked
///   at `t + 1`, not the current slice.
/// - **Player movement:** Player also moves to `t + 1`.
///
/// This ensures push validation reflects the state *after* time advances.
pub fn validate_push(
    state: &GameState,
    direction: Direction,
) -> Result<Vec<(EntityId, Position, Position)>, ActionError> {
    // ... implementation
}
```

**Add to `validate_pull`:**

```rust
/// Validate a pull action.
///
/// # Time Slice Semantics
///
/// - **Entity lookup:** Finds pullable entity in **current slice** (`t`) at
///   the position opposite to the movement direction.
/// - **Target validation:** Validates player and pulled entity positions at
///   **next slice** (`t + 1`).
pub fn validate_pull(
    state: &GameState,
    direction: Direction,
) -> Result<(EntityId, Position, Position), ActionError> {
    // ... implementation
}
```

---

### 7. Add Entity::pullable_box Constructor (If Missing)

**Priority:** Medium
**Files:** `src/core/entity.rs`

**Check:** Verify `Entity::pullable_box()` exists for test cases. If not:

```rust
impl Entity {
    /// Create a pullable box entity.
    pub fn pullable_box(position: Position) -> Self {
        Self::new(
            position,
            vec![
                Component::Pushable,
                Component::Pullable,
                Component::BlocksMovement,
                Component::TimePersistent,
            ],
        )
    }
}
```

---

## Implementation Order

```
1. Task 7: Entity::pullable_box (if needed for tests)
2. Task 4: Add missing tests (some may fail initially)
3. Task 1: Propagation API consolidation
4. Task 2: Arrow key support
5. Task 3: Preview overlay fix
6. Task 5: Documentation updates
7. Task 6: Code comments
8. Final: Run all tests, clippy check
```

---

## Exit Criteria

- [ ] `TimeCube::propagate_slice` delegates to `propagation` module
- [ ] `TimeCube::propagate_all` delegates to `propagation` module
- [ ] Arrow keys (Up/Down/Left/Right) work for movement
- [ ] Preview overlay positioned in corner, not overlapping grid
- [ ] All new tests pass (push chain, pull, win detection)
- [ ] Documentation updated (GAME_STATE.md, PHASE_03)
- [ ] `cargo test` passes
- [ ] `cargo clippy` clean
- [ ] Total test count increased by ~15+

---

## Verification Commands

```bash
# Run all tests
cargo test

# Check specific new tests
cargo test test_is_active_false_when_won
cargo test test_valid_actions_at_rift
cargo test test_apply_push
cargo test test_win_on_exit
cargo test test_arrow_key

# Clippy check
cargo clippy

# Run game to manually verify arrow keys and preview
cargo run
```

---

## Related Documents

- [Phase 3 Implementation Plan](PHASE_03_GAME_STATE.md)
- [Phase 4 Implementation Plan](PHASE_04_RENDERING.md)
- [Game State Design](../design/GAME_STATE.md)
- [Rendering Design](../design/RENDERING.md)
