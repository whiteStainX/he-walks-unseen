# Phase 7: Paradox Detection (Web)

> **Depends on:** `docs/web-implementation/PHASE_06_DATA_LOADING.md`
> **Design References:** `docs/web-design/MATH_MODEL.md`, `docs/web-design/GAME_STATE.md`, `docs/web-design/CORE_DATA.md`, `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`
> **Enables:** Phase 8 polish with stable failure-state semantics

---

## Goal

Add deterministic paradox validation based on committed history.

Phase 7 target:
- detect causality inconsistency after successful interaction commits
- transition to `GamePhase = 'Paradox'`
- block further gameplay actions until restart

---

## Status

- `Status`: Planned

---

## Locked Rules

1. Truth boundaries remain unchanged:
- player truth: `WorldLineState`
- object truth: `TimeCube` occupancy
2. Paradox evaluation is a pure read (no mutation in evaluator).
3. Pipeline post-check order is fixed:
- `Paradox -> Won -> Detected`
4. If multiple post-check outcomes are true on the same action, `Paradox` wins.
5. Detection and paradox remain separate systems with separate reports.

---

## Scope

### In Scope

- Core paradox contracts and evaluator (`frontend/src/core/paradox.ts`)
- Anchor capture from successful interaction commits
- Reducer/pipeline integration for paradox phase transition
- Minimal UI/status/log surfacing for paradox outcomes
- Unit + reducer/integration tests for edge cases and ordering

### Out of Scope

- Strict retroactive observer-consistency mode (the deferred "future self always visible" variant)
- Probabilistic or narrative paradox systems
- Timeline repair/undo flows beyond restart

---

## Model Baseline (V1)

At turn `n`:
- `P_n`: committed player world-line prefix
- `S_n`: realized occupancy state from committed interactions
- `A_n`: causal anchors captured from successful actions

Paradox condition:

```txt
exists anchor a in A_n such that satisfies(S_n, a) is false
```

Anchor requirement kinds (V1):
- `PlayerAt(position, sourceTurn)`
- `ObjectAt(objectId, position, sourceTurn)`

Violation reasons (V1):
- `PlayerMissing`
- `ObjectMissing`
- `ObjectMismatch`

---

## Contracts (Interface First)

Target module: `frontend/src/core/paradox.ts`

```ts
export interface ParadoxConfig {
  enabled: boolean
}

export type CausalRequirement =
  | { kind: 'PlayerAt'; position: Position3D; sourceTurn: number }
  | { kind: 'ObjectAt'; objectId: string; position: Position3D; sourceTurn: number }

export interface CausalAnchor {
  id: string
  requirement: CausalRequirement
}

export interface ParadoxViolation {
  anchorId: string
  requirement: CausalRequirement
  reason: 'PlayerMissing' | 'ObjectMissing' | 'ObjectMismatch'
}

export interface ParadoxReport {
  paradox: boolean
  checkedFromTime: number
  earliestSourceTurn: number | null
  violations: ParadoxViolation[]
}

export function evaluateParadoxV1(input: {
  cube: TimeCube
  worldLine: WorldLineState
  anchors: CausalAnchor[]
  checkedFromTime: number
  config: ParadoxConfig
}): ParadoxReport
```

---

## Pipeline Integration

Current pipeline (`runInteractionPipeline`) will be extended after successful handler execution:

1. Guard phase (`Playing` only)
2. Execute registered interaction
3. Commit player/object mutations and turn/time/history update
4. Capture anchors for this committed action
5. Run paradox evaluator with affected-time window
6. If paradox:
- set `phase = 'Paradox'`
- set `lastParadox`
- deterministic status message
- stop pipeline
7. Else run existing win/detection checks in order (`Won` then `Detected`)

State additions in `InteractionState` / `GameState`:
- `paradoxConfig: ParadoxConfig`
- `lastParadox: ParadoxReport | null`
- `anchors: CausalAnchor[]` (or equivalent persisted anchor history field)

Restart behavior:
- clear `lastParadox`
- clear anchor history

---

## Anchor Capture Strategy (V1)

Each successful interaction emits commit metadata:
- `affectedFromTime: number`
- `anchors: CausalAnchor[]`

Baseline mapping:
1. `Move`, `Wait`, `ApplyRift`
- add `PlayerAt` anchor for resulting player position
- `affectedFromTime = nextPlayer.t`
2. `Push`, `Pull`
- add resulting `PlayerAt`
- add `ObjectAt` anchors for each moved object at commit time
- `affectedFromTime = commit time of relocation`

Windowed revalidation:
- only evaluate anchors whose requirement time is `>= affectedFromTime`

---

## Implementation Plan

1. Add core paradox contracts/evaluator:
- `frontend/src/core/paradox.ts`
- `frontend/src/core/paradox.test.ts`

2. Extend interaction outcome metadata:
- add commit metadata type(s) in `frontend/src/game/interactions/types.ts`
- return metadata from handlers and registry execution path

3. Extend reducer state shape:
- add paradox config/report/anchor history fields in `frontend/src/game/gameSlice.ts`
- initialize defaults and clear on restart/content load

4. Integrate paradox post-check in pipeline:
- update `frontend/src/game/interactions/pipeline.ts`
- enforce priority `Paradox -> Won -> Detected`

5. Update UI surfaces:
- show `Paradox` phase in state window
- add concise paradox status/log text

6. Add test coverage:
- core paradox tests
- reducer pipeline ordering tests
- restart/reset tests for paradox state

---

## File Targets

Core:
- `frontend/src/core/paradox.ts` (new)
- `frontend/src/core/paradox.test.ts` (new)

Game:
- `frontend/src/game/interactions/types.ts`
- `frontend/src/game/interactions/pipeline.ts`
- `frontend/src/game/gameSlice.ts`
- `frontend/src/game/gameSlice.test.ts`

Render/UI:
- `frontend/src/app/GameShell.tsx`
- `frontend/src/render/board/GameBoardCanvas.tsx` (only if paradox marker rendering is added)

Docs:
- `docs/web-implementation/PLAN.md`
- `docs/web-design/GAME_STATE.md` (if contract names change during implementation)

---

## Test Requirements

1. Core paradox evaluator tests:
- no paradox when all anchors are satisfied
- `PlayerMissing` violation detection
- `ObjectMissing` and `ObjectMismatch` detection
- windowed evaluation respects `checkedFromTime`

2. Pipeline/reducer tests:
- paradox transitions phase to `Paradox`
- post-paradox actions are blocked until restart
- restart clears paradox report and anchors
- ordering: paradox beats win and detection when both could trigger

3. Regression tests:
- existing move/rift/push/pull behavior remains deterministic
- existing `Won`/`Detected` behavior unchanged when paradox does not occur

---

## Acceptance Criteria

1. Paradox model is deterministic and contract-driven.
2. Any committed inconsistency triggers `Paradox`.
3. `Paradox` is surfaced clearly in phase/status/log.
4. Post-check ordering is enforced and test-covered.
5. `npm run lint`, `npm run test`, and `npm run build` pass.

---

## Risks and Mitigations

1. Over-anchoring causes false positives.
- Mitigation: keep V1 anchors minimal (`PlayerAt`, moved `ObjectAt`) and expand only with tests.

2. Missing commit metadata from handlers.
- Mitigation: enforce commit metadata in shared interaction result types.

3. Ordering regressions with existing win/detection behavior.
- Mitigation: add explicit ordering tests at reducer pipeline level.
