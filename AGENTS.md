# Agent Workflow Reference (Web): He Walks Unseen

> **Note:** For project context, web stack, and architecture details, see **[CLAUDE.md](./CLAUDE.md)**.

---

## Agent Roles (Web)

### Core Logic Agent
- **Scope:** `frontend/src/core/`
- **Focus:** Player `WorldLineState`, TimeCube occupancy, Entity system, propagation, light cone math
- **Testing:** Unit tests for paradox and detection edge cases

### Game Loop Agent
- **Scope:** `frontend/src/game/`
- **Focus:** State management, action validation, reducers
- **Dependencies:** Core logic must be stable

### Rendering Agent
- **Scope:** `frontend/src/render/`
- **Focus:** Canvas rendering, UI overlays, layout
- **Independence:** May mock `GameState`

### Data Layer Agent
- **Scope:** `frontend/src/data/`, `frontend/public/data/`
- **Focus:** Level/theme loading, parsing, config
- **Deliverables:** Level loader, theme loader

### Integration Agent
- **Scope:** `frontend/src/app/`, `frontend/src/main.tsx`, `frontend/tests/`
- **Focus:** Wiring modules, integration tests
- **Timing:** After module completion

---

## Coordination Rules

1. **Interface First:** Define type boundaries before implementation
2. **No Cross-Dependency:** Core logic must not import React
3. **Test Contracts:** Each module exports a test suite validating its public API
4. **Data Contracts:** Level/theme formats freeze after Phase 2
5. **Truth Model:** Player state is world-line truth; object state is cube occupancy truth
6. **Shared Result Type:** Reuse `Result<T, E>` from `frontend/src/core/result.ts`; do not redefine local `Result` aliases
7. **Render Feature Folders:** Place feature-specific render code under `frontend/src/render/<feature>/` (for example `board/`, `iso/`); keep only shared render utilities at `frontend/src/render/` (for example `theme.ts`)
8. **Modular Interactions:** Follow `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`; new interactions must be handler-based and registry-dispatched, not reducer-branch expansions
9. **Intent-First Input:** Input/UI selects interaction intent first (mode/action selection), then target/direction; avoid making multi-key direction chords the primary extensibility path

---

## Handoff Checklist

Before handing off to another agent:
- [ ] All public types documented with `/** */`
- [ ] Unit tests passing (`npm test` or equivalent)
- [ ] `eslint` clean
- [ ] `tsc --noEmit` clean
- [ ] `prettier` applied
- [ ] Module boundary types defined
