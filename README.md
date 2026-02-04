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

In development. Web rewrite in progress.

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
| `W/A/S/D` / Arrow Keys | Move in space |
| `Space` | Use rift |
| `Q` / `Esc` | Quit |
| `R` | Restart level |
| `P` | Toggle preview |

## Documentation

- [Web Design Docs](docs/web-design/OVERALL.md)
- [Math Model (Core)](docs/web-design/MATH_MODEL.md)
- [Web Implementation Plan](docs/web-implementation/PLAN.md)
- [Agent Guide](AGENTS.md)

## License

MIT — see [LICENSE](LICENSE)
