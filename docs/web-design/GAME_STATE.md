# Game State Design (Web)

> **Module target:** `frontend/src/game/`
> **Status:** Phase 4 implemented, Phase 5 planned

This document defines the reducer state shape, interaction pipeline, and phase transitions for the web app.

---

## 1. Truth Model

Player and objects are intentionally split:

1. Player truth: `WorldLineState`
2. Object truth: `TimeCube` occupancy

Rules:
- Never derive player history from `TimeCube`.
- Never validate object occupancy from `WorldLineState`.
- Render combines both sources at current `t`.

---

## 2. Canonical Interfaces

Current game state is reducer-owned and interaction-first.

```ts
export type GamePhase = 'Playing' | 'Won' | 'Detected'

export interface DetectionConfig {
  enabled: boolean
  delayTurns: number
  maxDistance: number
}

export interface DetectionEvent {
  enemyId: string
  enemyPosition: Position3D
  observedPlayer: Position3D
  observedTurn: number
}

export interface DetectionReport {
  detected: boolean
  atTime: number
  events: DetectionEvent[]
}

export interface GameState {
  boardSize: number
  timeDepth: number
  objectRegistry: ObjectRegistry
  cube: TimeCube
  worldLine: WorldLineState
  currentTime: number
  turn: number
  phase: GamePhase
  riftSettings: RiftSettings
  riftResources: RiftResources
  interactionConfig: InteractionConfig
  history: InteractionHistoryEntry[]
  detectionConfig: DetectionConfig
  lastDetection: DetectionReport | null
  status: string
}
```

Notes:
- `Detected` is Phase 5 target and intentionally separate from Phase 7 paradox.
- `Paradox` is deferred to Phase 7 and should not be mixed into Phase 5 detection logic.

---

## 3. Interaction Contracts

Reducer actions should dispatch typed interaction intents.

```ts
type InteractionAction =
  | { kind: 'Move'; direction: Direction2D }
  | { kind: 'Wait' }
  | { kind: 'ApplyRift'; instruction?: RiftInstruction }
  | { kind: 'Push'; direction: Direction2D }
  | { kind: 'Pull'; direction: Direction2D }
```

```ts
interface InteractionHistoryEntry {
  turn: number
  action: InteractionAction
  outcome: SuccessfulOutcome
}
```

---

## 4. Pipeline Order

For each interaction action:

1. Guard phase (`Playing` only).
2. Execute interaction handler from registry.
3. On success: update `turn`, `currentTime`, `history`, `status`.
4. Check win (`hasExit`) first.
5. If not won and detection enabled: run detection evaluator.
6. If detected: set `phase = 'Detected'` with deterministic status message.

Outcome priority in same action:
1. `Won`
2. `Detected`

---

## 5. Phase Semantics

| Phase | Meaning | Input Handling |
|-------|---------|----------------|
| `Playing` | Active gameplay | interactions allowed |
| `Won` | Exit reached | blocked until restart |
| `Detected` | Enemy detection triggered | blocked until restart |

Restart semantics:
- resets world line and occupancy state
- resets turn/time/phase
- clears history and last detection report

---

## 6. Error / Result Model

Interaction handlers use typed error unions and shared `Result` contract:

```ts
import type { Result } from '../core/result'
```

Guideline:
- do not throw for expected gameplay validation failures
- return typed errors and map them to deterministic status text

---

## 7. Detection Integration (Phase 5)

Detection is a pure read of current state:
- inputs: `TimeCube`, `WorldLineState`, `currentTime`, `DetectionConfig`
- output: `DetectionReport`
- no mutation inside detector

The reducer is responsible for phase transition and status text.

---

## Related Documents
- `docs/web-design/CORE_DATA.md`
- `docs/web-design/MATH_MODEL.md`
- `docs/web-implementation/PHASE_05_DETECTION.md`
