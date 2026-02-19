# Web Project Reference: He Walks Unseen

## Project Overview

A web-based, turn-based puzzle stealth game where **time is a spatial dimension**. The player navigates a 3D Space-Time Cube and avoids detection from enemies who perceive via causal light cones.

**Design Reference:** `docs/web-design/OVERALL.md`
**Interaction Architecture Reference:** `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`

---

## Web Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI | React 19 | Component layout and overlays |
| Build | Vite | Fast dev server and bundling |
| Language | TypeScript | Static typing for core math and state |
| Rendering | Canvas 2D | Grid drawing and overlays |
| Testing | Vitest + Testing Library | Unit and UI tests |

---

## Project Structure (Web)

```
frontend/
├── src/
│   ├── app/                 # App shell, routing, layout
│   ├── core/                # Core game logic (no React)
│   ├── game/                # State container, actions, validation
│   │   └── interactions/    # Handler registry + per-action interaction modules
│   ├── render/              # Rendering modules (feature folders + shared theme)
│   │   ├── board/           # Main time-slice board renderer
│   │   ├── iso/             # Isometric TimeCube renderer and selectors
│   │   └── theme.ts         # Shared render tokens
│   ├── data/                # Level/theme loading
│   ├── main.tsx             # React entry
│   └── styles/              # CSS / theme tokens
├── public/
│   └── data/                # Bundled levels/themes
└── tests/
    ├── core/
    └── integration/
```

---

## Key Concepts

### Space-Time Cube
- 3D grid: X/Y space, Z time
- Player is 3D (world line), other entities are 2D per slice

### World Line
- Player path through the cube (turn-ordered)
- Cannot self-intersect

### Truth Model
- Player truth: `WorldLineState` (`path` + sparse `visited` index)
- Object truth: `TimeCube` occupancy for non-player entities
- Rift: reusable resolver (`resolveRift`) before world-line extension

### Causal Detection
- Enemy sees past positions via light cones
- Detection is geometric intersection in cube-time

---

## Coding Conventions (TypeScript)

- Use `PascalCase` for types
- Use `camelCase` for functions/variables
- Use discriminated unions for components and errors
- Avoid `any`; prefer explicit unions or generics
- Core logic must be pure and deterministic

## Render Module Convention

- Use feature folders under `frontend/src/render/<feature>/` for feature-specific rendering logic and tests.
- Keep shared render utilities at `frontend/src/render/` only (for example `theme.ts`).
- Current baseline features: `render/board/` and `render/iso/`.

## Interaction Modularity Convention

- Follow `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`.
- Interactions are handler modules dispatched by a registry keyed by action kind.
- Adding a new interaction should require:
  - adding one action type
  - adding one handler module
  - registering handler in registry
  - adding tests
- Avoid growing a monolithic reducer with action-specific branching.
- Keep input intent-first: UI/input chooses action mode first, then direction/target; handlers stay keyed to typed `InteractionAction`.

## LLM Provider Policy

- For story-to-level generation and any future LLM integration, Ollama is the default provider.
- Any change to that default must be made as an explicit design decision and documented.
- Keep provider abstractions schema-stable (`StorySpec`) across providers.

---

## Error Handling

Use typed error unions instead of throwing in core logic.

```ts
import type { Result } from './result';
```

Canonical location:
- `frontend/src/core/result.ts`

Rule:
- Reuse the shared `Result<T, E>` type across `core` and `game`.
- Do not redeclare local `Result` aliases in module files.

---

## Testing

- Unit tests for all core math and paradox edge cases
- Integration tests for action pipelines
- Canvas rendering tests via snapshot or pixel hash (optional)

---

## Common Commands (Web)

```bash
# Dev server
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Format
npm run format
```

If using another package manager (pnpm/yarn), use equivalent commands.

---

## Performance Targets

- 60 FPS rendering
- <2ms per move validation (typical levels)
- Stable state updates without React jank

---

## Known Complexity Areas

- Grandfather paradox detection during propagation
- Light cone ray-casting with blockers
- Multiple player positions on same time slice
