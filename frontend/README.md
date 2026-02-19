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

Optional dev fallback:
- Set `VITE_ENABLE_DEV_FALLBACK_LEVEL=true` to allow booting with the built-in fallback level only when default content boot fails.
- Without this flag, boot failure is fail-fast (`BootError`) until a valid content pack loads.

## Build

```bash
npm run build
npm run preview
```

## Generate Pack

```bash
npm run gen:pack -- --seed demo-001 --pack-id demo-001 --difficulty normal --width 12 --height 12 --time-depth 16
```

Notes:
- Writes files to `frontend/public/data/generated/` by default.
- Updates `frontend/public/data/index.json` with the generated pack id.
- Optional metadata flags:
  - `--class generated|hybrid|curated|experimental`
  - `--tag <label>` (repeatable)
  - `--author <name>`

## Validate Packs

```bash
npm run validate:pack -- --all
npm run validate:pack -- --pack-id default
```

Policy notes:
- `generated` and `hybrid` packs enforce solver + quality gates.
- `curated` packs enforce content/schema validity and emit solver warnings when not solver-confirmed.

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
| `M` | Open/close settings overlay |
| `P` | Toggle danger preview overlay |
| `V` | Cycle content pack entries from `frontend/public/data/index.json` |
| `[` / `]` | Rift delta - / + |
| `-` / `=` | Max push chain - / + |
| `R` | Restart |

## Assets

- Levels and themes should live in `frontend/public/data/`.
- Content pack manifest lives at `frontend/public/data/index.json`.
- Core logic lives in `frontend/src/core/` and must remain UI-agnostic.
- Interaction handlers live in `frontend/src/game/interactions/`.
- Behavior resolver + enemy detection profile wiring live in `frontend/src/data/behaviorResolver.ts`.
- Shared content-to-runtime adapter lives in `frontend/src/data/contentAdapter.ts` (reused by loader and generation solver).
- Enemy motion projection during bootstrap/load lives in `frontend/src/game/levelObjects.ts`.
- Map-generation foundation lives in `frontend/src/data/generation/`.
- Default generation profile fixture lives in `frontend/public/data/generation/default.profile.json`.
- Generation profile now includes solver gate presets, quality weights, and topology/patrol strategy selectors.
- Generated candidates now include baseline rift anchors and rift validation checks.
- Generated export utilities live in `frontend/src/data/generation/export.ts`.
- Generated pack CLI exporter lives in `frontend/scripts/export-generated-pack.ts`.
- Render features are organized under `frontend/src/render/board/` and `frontend/src/render/iso/`.
- Isometric rendering is split by responsibility (`IsoTimeCubePanel`, `IsoSlices`, `IsoTracks`, `IsoActors`, `IsoCameraControls`) under `frontend/src/render/iso/`.
- Input state machine lives under `frontend/src/app/inputStateMachine.ts`.
- App shell hooks/components live under `frontend/src/app/shell/` (HUD, overlays, keyboard/content loading hooks).
- Board action preview model lives under `frontend/src/render/board/preview.ts`.
- Board canvas rendering is container-measured and DPR-aware (`frontend/src/render/board/GameBoardCanvas.tsx`).

## References

- `docs/web-design/OVERALL.md`
- `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`
- `docs/web-design/ENEMY_LOGIC_V1.md`
- `docs/web-design/MAP_GENERATION_V1.md`
- `docs/web-design/MATH_MODEL.md`
- `docs/web-design/UI_WINDOW_SYSTEM.md`
- `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`
- `docs/web-design/ICON_PACK_AUTHORING.md`
- `docs/web-design/LEVEL_SYSTEM_FULL.md`
- `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`
- `docs/web-implementation/PHASE_07_PARADOX.md`
- `docs/web-implementation/PHASE_08_POLISH.md`
- `docs/web-implementation/PHASE_10_ENEMY_LOGIC_DATA_DRIVEN.md`
- `docs/web-implementation/PHASE_12_MAP_GENERATION.md`
