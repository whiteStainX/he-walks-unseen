# He Walks Unseen (Web)

This folder contains the Vite + React + TypeScript web app.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Test

```bash
npm test
```

## Lint / Format

```bash
npm run lint
```

## Controls

| Key | Action |
|-----|--------|
| `F` | Open/close action menu |
| `1 / 2 / 3` | Select directional mode: Move / Push / Pull |
| `W/A/S/D` / Arrow Keys | Apply selected directional mode |
| `Space` | Use default rift |
| `Enter` | Wait one turn |
| `L` | Open/close full log overlay |
| `P` | Toggle danger preview overlay |
| `V` | Cycle content pack (`default` / `variant`) |
| `[` / `]` | Rift delta - / + |
| `-` / `=` | Max push chain - / + |
| `R` | Restart |

## Assets

- Levels and themes should live in `frontend/public/data/`.
- Content pack manifest lives at `frontend/public/data/index.json`.
- Core logic lives in `frontend/src/core/` and must remain UI-agnostic.
- Interaction handlers live in `frontend/src/game/interactions/`.
- Render features are organized under `frontend/src/render/board/` and `frontend/src/render/iso/`.

## References

- `docs/web-design/OVERALL.md`
- `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`
- `docs/web-design/MATH_MODEL.md`
- `docs/web-design/UI_WINDOW_SYSTEM.md`
- `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`
