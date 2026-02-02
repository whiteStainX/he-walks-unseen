# He Walks Unseen

A terminal-based, turn-based puzzle stealth game where **time is a spatial dimension**.

Navigate a 3D Space-Time Cube to reach the exit without being detected by enemies who perceive through causal light cones.

## Concept

- **X/Y axes:** Physical space (the room)
- **Z axis:** Time (the timeline)
- **You:** A 3D creature who can move through time via rifts
- **Enemies:** 2D creatures with light cone vision — they see where you *were*, not where you *are*

Exploit causality. Move faster than light. Walk unseen.

## Status

🚧 **In Development** — Phase 1 (Foundation) complete.

## Requirements

- Rust 2026 edition
- A terminal with Unicode support (ASCII fallback available)

## Build & Run

```bash
# Build
cargo build

# Run
cargo run

# Test
cargo test
```

Press `q` to quit.

## Controls

| Key | Action |
|-----|--------|
| `W/A/S/D` | Move in space |
| `Space` | Interact (rift/push) |
| `Q` / `Esc` | Quit |
| `R` | Restart level |

## Documentation

- [Design Document](docs/design/OVERALL.md)
- [Implementation Plan](docs/implementation/PLAN.md)

## License

MIT — see [LICENSE](LICENSE)
