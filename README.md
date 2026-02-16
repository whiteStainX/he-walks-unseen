# He Walks Unseen

A web-based, turn-based puzzle stealth game where **time is a spatial dimension**.

Navigate a 3D Space-Time Cube to reach the exit without being detected by enemies who perceive through causal light cones.

## Concept

- **X/Y axes:** Physical space (the room)
- **Z axis:** Time (the timeline)
- **You:** A 3D creature who can move through time via rifts
- **Enemies:** 2D creatures with light cone vision — they see where you *were*, not where you *are*

Exploit causality. Move faster than light. Walk unseen.

## Status

Web rewrite is in active development.

Current playable baseline:
- Turn/time separation with `WorldLineState`
- Rift-based time travel
- Object occupancy with push/pull interactions
- Detection + paradox failure phases (`Detected`, `Paradox`)
- Isometric TimeCube helper panel
- Windowed HUD with action-mode selection and log overlay
- Intent-first input state machine with layer-aware directional gating
- Settings overlay with persisted UI toggles
- Data-driven content packs loaded from `frontend/public/data/` with runtime pack switching
- Data-driven enemy logic with validated movement policies and per-enemy detection profile overrides

## Requirements

- Node.js 18+
- npm, pnpm, or yarn

## Quick Start

```bash
cd frontend
npm install
npm run dev
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
| `V` | Cycle content pack (`default` / `variant`) |
| `[` / `]` | Rift delta - / + |
| `-` / `=` | Max push chain - / + |
| `R` | Restart |

## Documentation

- [Web Design Docs](docs/web-design/OVERALL.md)
- [Phase 6 Content System](docs/web-design/PHASE_06_CONTENT_SYSTEM.md)
- [Enemy Logic V1 Design](docs/web-design/ENEMY_LOGIC_V1.md)
- [Math Model (Core)](docs/web-design/MATH_MODEL.md)
- [UI Window System Spec](docs/web-design/UI_WINDOW_SYSTEM.md)
- [Modular Interaction Architecture](docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md)
- [Web Implementation Plan](docs/web-implementation/PLAN.md)
- [Phase 7 Paradox Plan](docs/web-implementation/PHASE_07_PARADOX.md)
- [Phase 8 Polish Plan](docs/web-implementation/PHASE_08_POLISH.md)
- [Phase 10 Enemy Logic Plan](docs/web-implementation/PHASE_10_ENEMY_LOGIC_DATA_DRIVEN.md)
- [Agent Guide](AGENTS.md)

## License

MIT — see [LICENSE](LICENSE)
