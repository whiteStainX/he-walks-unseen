# Web Project Reference: He Walks Unseen

## Project Overview

A web-based, turn-based puzzle stealth game where **time is a spatial dimension**. The player navigates a 3D Space-Time Cube and avoids detection from enemies who perceive via causal light cones.

**Design Reference:** `docs/web-design/OVERALL.md`

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
│   ├── render/              # Canvas drawing, UI overlays
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

---

## Error Handling

Use typed error unions instead of throwing in core logic.

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

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
