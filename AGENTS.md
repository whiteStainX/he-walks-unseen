# Agent Workflow Reference: He Walks Unseen

> **Note:** For project context, tech stack, coding conventions, and architecture details, see **[CLAUDE.md](./CLAUDE.md)**.

---

## Agent Roles

When working on this project with multiple agents, use these role assignments:

### Core Logic Agent
- **Scope:** `src/core/`
- **Focus:** TimeCube, Entity system, WorldLine, propagation, light cone
- **Testing:** Must include unit tests for all paradox edge cases

### Game Loop Agent
- **Scope:** `src/game/`
- **Focus:** State management, input handling, action validation
- **Dependencies:** Depends on Core Logic being stable

### Rendering Agent
- **Scope:** `src/render/`
- **Focus:** Ratatui widgets, theme application, UI layout
- **Independence:** Can mock game state for development

### Data Layer Agent
- **Scope:** `src/data/`, `data/`
- **Focus:** TOML/JSON parsing, config management, hot-reload
- **Deliverables:** Level loader, theme loader, config manager

### Integration Agent
- **Scope:** `src/lib.rs`, `src/main.rs`, `tests/`
- **Focus:** Wiring modules together, integration tests
- **Timing:** After individual modules are complete

---

## Coordination Rules

1. **Interface First:** Define trait boundaries before implementing
2. **No Cross-Dependency:** Core logic must not import rendering
3. **Test Contracts:** Each module exports a test suite validating its public API
4. **Data Contracts:** Level/theme formats are frozen after Phase 2

---

## Handoff Checklist

Before handing off to another agent:
- [ ] All public types documented with `///`
- [ ] Unit tests passing
- [ ] `cargo clippy` clean
- [ ] `cargo fmt` applied
- [ ] Module boundary traits defined
