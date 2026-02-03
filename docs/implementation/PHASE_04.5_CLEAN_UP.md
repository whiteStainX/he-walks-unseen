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

### 1. ~~Propagation API Consolidation~~ ✅ COMPLETED

**Status:** Already implemented.

`TimeCube::propagate_slice` and `propagate_all` already delegate to `core/propagation.rs` (see `src/core/time_cube.rs:309-324`).

**Verified implementation:**
```rust
pub fn propagate_slice(&mut self, from_t: i32) -> Result<usize, CubeError> {
    let result = propagation::propagate_from_with_options(
        self,
        from_t,
        propagation::PropagationOptions {
            stop_at: Some(from_t + 1),
            ..Default::default()
        },
    )?;
    Ok(result.context.slices_updated)
}

pub fn propagate_all(&mut self) -> Result<PropagationResult, CubeError> {
    propagation::propagate_from(self, 0)
}
```

**No action needed.**

---

### 2. Arrow Key Support ✅ COMPLETED

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

Note: Existing `state()` helper in `render/app.rs` starts player at `(0,0,0)`, making north/west out-of-bounds. Use East/South or update the helper.

```rust
// Option A: Use valid directions from (0,0,0)
#[test]
fn test_arrow_key_down_moves_south() {
    let mut app = RenderApp::new(state());
    app.handle_key(KeyCode::Down);
    assert_eq!(app.pending_action, Some(Action::Move(MoveDir::South)));
}

#[test]
fn test_arrow_key_right_moves_east() {
    let mut app = RenderApp::new(state());
    app.handle_key(KeyCode::Right);
    assert_eq!(app.pending_action, Some(Action::Move(MoveDir::East)));
}

// Option B: Update helper to start at (1,1,0) for full coverage
fn state_centered() -> GameState {
    let mut cube = TimeCube::new(3, 3, 2);
    cube.spawn(Entity::player(Position::new(1, 1, 0))).unwrap();
    GameState::from_cube(cube).unwrap()
}

#[test]
fn test_arrow_key_up_moves_north() {
    let mut app = RenderApp::new(state_centered());
    app.handle_key(KeyCode::Up);
    assert_eq!(app.pending_action, Some(Action::Move(MoveDir::North)));
}
```

**Update:** Bottom bar help text to include arrows:
```rust
" Q: Quit | WASD/Arrows: Move | Space: Rift | R: Restart | P: Preview "
```

---

### 3. Fix Preview Overlay Positioning ✅ COMPLETED

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
- `test_preview_overlay_does_not_panic_small_area` (minimal, no render assertions)

---

### 4. Add Missing Test Coverage ✅ COMPLETED

**Priority:** Medium
**Files:** `src/game/state.rs`, `src/game/actions.rs`, `src/game/validation.rs`

**Dependency:** Task 7 (`Entity::pullable_box`) must be completed first — pull tests reference it.

**Missing Tests from Spec:**

#### state.rs
```rust
#[test]
fn test_is_active_false_when_won() {
    let mut cube = TimeCube::new(5, 5, 3);
    let start = Position::new(1, 1, 0);
    cube.spawn(Entity::player(start)).unwrap();
    // Exit must be propagated so it exists at t=1 when player arrives
    cube.spawn_and_propagate(Entity::exit(start)).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    // Player starts on exit, wait advances time to t=1 and triggers win
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

**Note:** `test_apply_move_east` already verifies time advances to `t=1`. These additional tests add explicit coverage for world_line length:

```rust
#[test]
fn test_apply_move_extends_world_line() {
    let state = basic_state();
    assert_eq!(state.world_line().len(), 1);
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
    // Wall spawned directly at t=1 (not propagated from t=0)
    // Push validation checks target positions at t+1, so wall blocks the box
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
    // Exit must be propagated so it exists at t=1 when player arrives
    cube.spawn_and_propagate(Entity::exit(Position::new(2, 1, 0))).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    let result = apply_action(&state, Action::Move(Direction::East)).unwrap();
    assert!(result.state.has_won());
    assert!(matches!(result.outcome, ActionOutcome::Won { .. }));
}
```

#### validation.rs

**IMPORTANT:** `test_validate_pull_not_pullable` - current logic returns `NotPullable` when entity exists but lacks Pullable component. Update expected error accordingly:

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
    // Pushable box (not pullable) - current code returns NotPullable
    cube.spawn(Entity::pushable_box(Position::new(1, 1, 0))).unwrap();
    let state = GameState::from_cube(cube).unwrap();
    let err = validate_pull(&state, Direction::East).unwrap_err();
    // Note: Returns NotPullable (entity exists but lacks Pullable component)
    assert!(matches!(err, ActionError::NotPullable { .. }));
}

#[test]
fn test_validate_pull_nothing_there() {
    let mut cube = TimeCube::new(5, 5, 5);
    cube.spawn(Entity::player(Position::new(2, 1, 0))).unwrap();
    // Nothing at pull position
    let state = GameState::from_cube(cube).unwrap();
    let err = validate_pull(&state, Direction::East).unwrap_err();
    assert!(matches!(err, ActionError::NothingToPull { .. }));
}
```

---

### 5. Update Documentation ✅ COMPLETED

**Priority:** Low
**Files:**
- `docs/design/GAME_STATE.md` (required)
- `docs/implementation/PHASE_03_GAME_STATE.md` (required)
- `docs/design/RENDERING.md` (optional — if arrow keys and preview positioning are documented there)

#### GAME_STATE.md - Restart Behavior
**Current:** `phase = Restarted`
**Update to:** `phase = Playing`

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

#### PHASE_03_GAME_STATE.md - Propagation Diagram

**Current (incorrect):** References `propagation::propagate_slice()` which doesn't exist.

**Update to:**

```markdown
### Propagation: Replace & Wrap (Single Source of Truth)

Phase 2 methods (`TimeCube::propagate_slice`, `propagate_all`) are thin wrappers
that delegate to `core/propagation.rs`:

```
Phase 2 (wrappers):                    Phase 3 (implementation):
┌─────────────────────────┐            ┌─────────────────────────────────┐
│ TimeCube::propagate_slice() ────────►│ propagation::propagate_from()   │
│   (stop_at: from_t + 1)              │   with PropagationOptions       │
│                                      │                                 │
│ TimeCube::propagate_all()   ────────►│ propagation::propagate_from()   │
│   (from t=0)                         │   with defaults                 │
└─────────────────────────┘            └─────────────────────────────────┘
```
```

---

### 6. Add Code Comments for Time Semantics ✅ COMPLETED

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
```

---

### 7. Add Entity::pullable_box Constructor ✅ COMPLETED

**Priority:** Medium (required for pull tests)
**Files:** `src/core/entity.rs`

**Problem:** `Entity::pullable_box()` does not exist. Tests referencing it will fail.

**Implementation:**

```rust
impl Entity {
    /// Create a pullable (and pushable) box entity.
    ///
    /// This box can be both pushed and pulled by the player.
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
1. Task 7: Entity::pullable_box (required for tests) ✅
2. Task 4: Add missing tests ✅
3. Task 2: Arrow key support ✅
4. Task 3: Preview overlay fix ✅
5. Task 5: Documentation updates ✅
6. Task 6: Code comments ✅
7. Final: Run all tests, clippy check ✅
```

**Note:** Task 1 is already complete — no action needed.

---

## Exit Criteria

- [x] `TimeCube::propagate_slice` delegates to `propagation` module ✅
- [x] `TimeCube::propagate_all` delegates to `propagation` module ✅
- [x] Arrow keys (Up/Down/Left/Right) work for movement ✅
- [x] Preview overlay positioned in corner, not overlapping grid ✅
- [x] `Entity::pullable_box()` constructor exists ✅
- [x] All new tests pass (push chain, pull, win detection) ✅
- [x] Documentation updated (GAME_STATE.md, PHASE_03) ✅
- [x] `cargo test` passes ✅
- [x] `cargo clippy` clean ✅
- [x] Total test count increased by ~12+ ✅

---

## Verification Commands

```bash
# Run all tests
cargo test

# Check specific new tests
cargo test test_is_active_false_when_won
cargo test test_valid_actions_at_rift
cargo test test_apply_push
cargo test test_apply_pull
cargo test test_win_on_exit
cargo test test_arrow_key
cargo test test_validate_pull

# Clippy check
cargo clippy

# Run game to manually verify arrow keys and preview
cargo run
```

---

## Test Expectations Summary

| Test | Expected Error/Result |
|------|----------------------|
| `test_validate_pull_not_pullable` | `ActionError::NotPullable { .. }` |
| `test_validate_pull_nothing_there` | `ActionError::NothingToPull { .. }` |
| `test_apply_push_blocked_by_wall` | `ActionError::PushBlocked { .. }` |
| `test_validate_push_chain_limit` | `ActionError::PushChainTooLong { .. }` |

---

## Related Documents

- [Phase 3 Implementation Plan](PHASE_03_GAME_STATE.md)
- [Phase 4 Implementation Plan](PHASE_04_RENDERING.md)
- [Game State Design](../design/GAME_STATE.md)
- [Rendering Design](../design/RENDERING.md)
