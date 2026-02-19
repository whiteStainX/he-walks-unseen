# Level Authoring Workflow (Web)

> **Purpose:** Single source of truth for creating and iterating content packs (manual + generated).
> **Scope:** `frontend/public/data/`, loader/validator contracts, deterministic playtest loop.
> **Related:** `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`, `docs/web-design/MAP_GENERATION_V1.md`, `docs/web-design/ENEMY_LOGIC_V1.md`

---

## 1. Canonical Pack Files

A playable pack uses one shared `<packId>` across these files:

1. `frontend/public/data/<packId>.level.json`
2. `frontend/public/data/<packId>.behavior.json`
3. `frontend/public/data/<packId>.rules.json`
4. `frontend/public/data/<packId>.theme.json`

The pack must be registered in:

5. `frontend/public/data/index.json`

Example:
1. `default.level.json`
2. `default.behavior.json`
3. `default.rules.json`
4. `default.theme.json`
5. manifest entry `{ "id": "default", "name": "Default Lab" }`

---

## 2. Manual Authoring Steps

1. Pick a stable `<packId>` (for example `lab-01`).
2. Create all four content files under `frontend/public/data/`.
3. Add the pack entry to `frontend/public/data/index.json`.
4. Run local checks:
- `cd frontend`
- `npm run lint`
- `npm run test -- src/data/validate.test.ts src/data/loader.test.ts --run`
5. Run and verify in game:
- `npm run dev`
- cycle packs with `V` until the new pack is active
- verify boot status, movement, win/loss transitions, and overlays.

---

## 3. Contract Checklist (Must Pass)

## 3.1 Level (`*.level.json`)

1. `schemaVersion` must be `1`.
2. `map.width`, `map.height`, `map.timeDepth` must be `> 0`.
3. `map.start` must be in-bounds (`x/y`) and `0 <= t < timeDepth`.
4. Every instance must reference an existing archetype key.
5. Every instance position must be in-bounds.
6. `render.symbol` (if provided) must be a non-empty string.
7. Rift components must target valid in-bounds `Position3D`.
8. Two different rift targets cannot share the same exact source cell/time.

## 3.2 Behavior (`*.behavior.json`)

1. `schemaVersion` must be `1`.
2. Every assignment target instance id must exist in level instances.
3. Every assignment policy key must exist in `policies`.
4. Policy path points must be in level bounds.
5. Runtime-supported policy kinds today:
- `Static`
- `PatrolLoop`
- `PatrolPingPong`
6. `ScriptedTimeline` is contract-defined but currently rejected by runtime validation.

Detection profiles:
1. profile shape: `{ enabled:boolean, delayTurns:int>=1, maxDistance:number>=0 }`
2. `detectionAssignments` keys must reference existing instances.
3. assigned profile keys must exist.
4. `defaultDetectionProfile` requires `detectionProfiles`.

## 3.3 Rules (`*.rules.json`)

1. `schemaVersion` must be `1`.
2. `rift.defaultDelta` and interaction/detection values must be valid for runtime expectations.

## 3.4 Theme (`*.theme.json`)

1. `schemaVersion` must be `1`.
2. `id` must be non-empty.
3. `iconPackId` must be non-empty and loadable.
4. `cssVars` must be an object of CSS variable keys.

---

## 4. Deterministic Playtest Loop

Use this loop for safe iteration:

1. Edit one pack file set (`level/behavior/rules/theme`) at a time.
2. Run validation tests (`validate` + `loader` tests).
3. Boot in dev and switch to the target pack.
4. Execute a repeatable key sequence and compare outcomes:
- turn/time progression
- detection/paradox behavior
- push/pull/rift results
5. If behavior changed unexpectedly, inspect:
- file diffs
- status/log entries
- pack registration and icon pack id.

---

## 5. Generated Pack Workflow

Use generator CLI for deterministic pack creation:

```bash
cd frontend
npm run gen:pack -- \
  --seed demo-001 \
  --pack-id demo-001 \
  --difficulty normal \
  --width 12 \
  --height 12 \
  --time-depth 16
```

What it does:
1. Generates content with deterministic seed.
2. Writes files to `frontend/public/data/generated/` by default.
3. Adds/updates manifest entry in `frontend/public/data/index.json`.

Recommended post-generation checks:
1. Open generated files and review placements/policies.
2. Run `npm run test -- src/data/generation/index.test.ts src/data/generation/export.test.ts --run`.
3. Load the generated pack in dev and perform quick solvability sanity playtest.

---

## 6. Authoring Guardrails

1. Prefer data changes over reducer/logic changes for level tuning.
2. Keep ids stable (`instance.id`, policy keys) to reduce cross-file churn.
3. Keep archetype `render.symbol` aligned with icon pack slots.
4. Treat generation profile tuning and manual level tuning as separate concerns:
- manual packs for curated puzzle design
- generated packs for fast breadth and stress tests.

---

## 7. Progression Program Baseline (14E)

Progression manifest source:
1. `frontend/public/data/progression/index.json`

Current baseline uses a coherent 3-slot ramp (bootstrap set), with explicit expansion target to 8-12 slots as new curated packs are added.

| Slot | Pack ID | Class | Difficulty | Mechanic Focus | Intended Challenge Profile |
|---|---|---|---|---|---|
| 01 | `default` | curated | easy | movement + first rift usage | low branching, onboarding, deterministic warm-up |
| 02 | `variant` | curated | normal | push/pull + patrol pressure | medium branching, higher local tactical cost |
| 03 | `generated/fixture-001` | generated | hard | integrated pressure test | full-system stress under deterministic constraints |

Authoring expectation per future slot:
1. Each new slot must state one primary mechanic focus and one secondary pressure source.
2. Difficulty labels should form a non-decreasing ramp unless a deliberate cooldown slot is documented.
3. Unlock conditions should remain simple (`CompletePack`) unless design docs define a new approved condition kind.
4. Generated-class slots used in main progression must remain solver-validated and quality-gated.
5. Promotion from generated to curated/hybrid should be documented in pack metadata (`class`, `source`, `tags`) and progression entry metadata (`title`, `difficulty`, `tags`).
