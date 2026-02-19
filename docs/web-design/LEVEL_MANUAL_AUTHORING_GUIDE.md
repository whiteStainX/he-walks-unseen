# Manual Level Authoring Guide (Web)

> **Purpose:** Practical step-by-step reference for creating a playable pack by hand.
> **Scope:** file creation, schema-safe templates, registration, progression wiring, and validation loop.
> **Related:** `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`, `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`, `frontend/src/data/contracts.ts`, `frontend/src/data/validate.ts`

---

## 1. Create a Pack (Required Files)

Pick `<packId>` (example: `lab-01`) and create:

1. `frontend/public/data/<packId>.level.json`
2. `frontend/public/data/<packId>.behavior.json`
3. `frontend/public/data/<packId>.rules.json`
4. `frontend/public/data/<packId>.theme.json`

Then register in:

5. `frontend/public/data/index.json`

---

## 2. Minimal Working Templates

### 2.1 `lab-01.level.json`

```json
{
  "schemaVersion": 1,
  "meta": { "id": "lab-01", "name": "Lab 01" },
  "map": {
    "width": 12,
    "height": 12,
    "timeDepth": 24,
    "start": { "x": 1, "y": 1, "t": 0 }
  },
  "archetypes": {
    "wall": {
      "kind": "wall",
      "components": [{ "kind": "BlocksMovement" }, { "kind": "BlocksVision" }, { "kind": "TimePersistent" }],
      "render": { "symbol": "wall" }
    },
    "exit": {
      "kind": "exit",
      "components": [{ "kind": "Exit" }, { "kind": "TimePersistent" }],
      "render": { "symbol": "exit" }
    },
    "enemy": {
      "kind": "enemy",
      "components": [{ "kind": "BlocksMovement" }, { "kind": "TimePersistent" }],
      "render": { "symbol": "enemy" }
    },
    "box": {
      "kind": "box",
      "components": [{ "kind": "BlocksMovement" }, { "kind": "Pushable" }, { "kind": "Pullable" }, { "kind": "TimePersistent" }],
      "render": { "symbol": "box" }
    }
  },
  "instances": [
    { "id": "exit.main", "archetype": "exit", "position": { "x": 10, "y": 10, "t": 0 } },
    { "id": "enemy.a", "archetype": "enemy", "position": { "x": 6, "y": 6, "t": 0 } },
    { "id": "box.a", "archetype": "box", "position": { "x": 4, "y": 4, "t": 0 } },
    { "id": "wall.1", "archetype": "wall", "position": { "x": 5, "y": 5, "t": 0 } }
  ]
}
```

### 2.2 `lab-01.behavior.json`

```json
{
  "schemaVersion": 1,
  "policies": {
    "enemy_patrol": {
      "kind": "PatrolLoop",
      "path": [{ "x": 6, "y": 6 }, { "x": 7, "y": 6 }, { "x": 7, "y": 7 }]
    }
  },
  "assignments": {
    "enemy.a": "enemy_patrol"
  },
  "detectionProfiles": {
    "close": { "enabled": true, "delayTurns": 1, "maxDistance": 2 }
  },
  "detectionAssignments": {
    "enemy.a": "close"
  },
  "defaultDetectionProfile": "close"
}
```

### 2.3 `lab-01.rules.json`

```json
{
  "schemaVersion": 1,
  "rift": { "defaultDelta": 3, "baseEnergyCost": 0 },
  "interaction": { "maxPushChain": 4, "allowPull": true },
  "detection": { "enabled": true, "delayTurns": 1, "maxDistance": 2 }
}
```

### 2.4 `lab-01.theme.json`

```json
{
  "schemaVersion": 1,
  "id": "mono",
  "iconPackId": "default-mono",
  "cssVars": {
    "--ink": "#111111",
    "--paper": "#ffffff",
    "--panel": "#ffffff",
    "--accent": "#111111",
    "--grid": "#111111",
    "--border": "#111111",
    "--muted": "#666666"
  }
}
```

### 2.5 Add Manifest Entry (`frontend/public/data/index.json`)

```json
{
  "id": "lab-01",
  "name": "Lab 01",
  "class": "curated",
  "difficulty": "easy",
  "tags": ["curated", "manual"],
  "source": { "kind": "manual", "author": "you" }
}
```

---

## 3. Optional: Add to Progression

Add an entry in `frontend/public/data/progression/index.json` under track `main`:

```json
{
  "packId": "lab-01",
  "title": "S04 Lab 01",
  "difficulty": "normal",
  "difficultyTarget": "normal",
  "difficultyFlavor": "Route pressure increases with patrol timing.",
  "unlock": { "kind": "CompletePack", "packId": "generated/fixture-001" },
  "tags": ["slot-04", "manual", "patrol"]
}
```

Notes:
1. `main` track ramp is validated (cooldown + expert gate policy).
2. Difficulty should resolve to `easy|normal|hard|expert`.

---

## 4. Authoring Rules You Must Respect

1. All instance `id`s must be unique and stable.
2. `instance.archetype` must exist in `archetypes`.
3. Every position must be in map bounds; `t` must be within `0..timeDepth-1`.
4. `behavior.assignments` keys must reference existing instance ids.
5. `behavior.assignments` values must reference existing policy keys.
6. `render.symbol` should match an icon slot in `frontend/public/data/icons/default-mono.pack.json` (or chosen pack).
7. Avoid conflicting rift definitions from the same source cell/time.

---

## 5. Validation + Runtime Loop

From `frontend/`:

```bash
npm run lint
npm run test -- src/data/validate.test.ts src/data/loader.test.ts src/data/progression.test.ts --run
npm run validate:pack -- --all
npm run eval:difficulty -- --pack-id lab-01
npm run dev
```

In runtime:
1. Press `V` to cycle packs (or use `G` progression overlay).
2. Confirm boot, movement, rift, win/loss, and overlays.

---

## 6. Common Failure Patterns

1. `UnknownArchetypeReference`: instance archetype key typo.
2. `UnknownBehaviorAssignmentInstance`: behavior assignment targets missing instance id.
3. `InvalidBehaviorPathPoint`: patrol path point out of bounds.
4. `InvalidIconSlotReference`: `render.symbol` not found in selected icon pack slots.
5. `InvalidProgressionDifficulty`: progression entry uses unsupported difficulty label.
6. `InvalidProgressionRamp`: main track violates cooldown/expert gate rules.

---

## 7. LLM-Ready Authoring Direction

To support future story-to-level conversion:

1. Keep ids deterministic (`enemy.a`, `wall.1`, `exit.main`) and avoid ad-hoc naming.
2. Keep behavior/rules/theme separated from geometry to preserve modular generation.
3. Prefer small, explicit archetypes/components over overloaded polymorphic entries.
4. Keep progression metadata (`difficultyTarget`, `difficultyFlavor`) authored as presentation layer only.
