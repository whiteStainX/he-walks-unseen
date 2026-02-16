# Enemy Logic Design (V1)

> **Purpose:** Define deterministic enemy movement + detection behavior that can be used by gameplay, validation, and future map generation.
> **Scope:** Enemy trajectory model, sensing contract, update ordering, and content contracts.
> **Related:** `docs/web-design/MATH_MODEL.md`, `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`, `docs/web-design/GAME_STATE.md`

---

## 1. Goals

1. Keep enemy behavior deterministic and data-driven.
2. Keep V1 simple enough for robust puzzle reasoning and solvability checks.
3. Make enemy logic a stable dependency for procedural map generation.
4. Preserve current truth model:
- player truth is `WorldLineState`
- object/enemy truth is `TimeCube` occupancy

---

## 2. V1 Scope

Included:
1. Patrol/position policy evaluation by time.
2. Detection check using discrete-delay model.
3. Deterministic ordering with existing interaction pipeline.
4. Content validation rules for enemy paths.

Not included:
1. Chase/alert state machine.
2. Learning, memory, communication between enemies.
3. Dynamic pathfinding around new obstacles.
4. Probabilistic behavior.

---

## 3. Terminology

1. `time (t)`: in-world cube time.
2. `turn (n)`: real-world input step count.
3. `enemy trajectory`: mapping from `t` to `(x,y)` for an enemy.
4. `observed time`: `t_obs = t_now - delayTurns`.
5. `detection event`: enemy at `t_now` sees player at `t_obs` within range.

---

## 4. Enemy Trajectory Model

Each enemy has a pure trajectory function:

`E_i(t) -> (x_i(t), y_i(t))`

V1 uses existing policy kinds:
1. `Static`
2. `PatrolLoop`
3. `PatrolPingPong`
4. `ScriptedTimeline` (allowed when explicitly enabled)

Determinism rule:
- For fixed policy data, `E_i(t)` must be stable and side-effect free.

### 4.1 Spatial Validity Rules

All trajectory points must be valid at content-validation time:
1. In bounds.
2. Not on static blocking terrain (wall/base blockers).
3. No invalid time references for scripted timeline points.

V1 rule:
- invalid enemy policy/path is a load error, not a runtime fallback.

---

## 5. Detection Model Contract

V1 keeps existing discrete-delay contract:

1. At current player time `t_now`, compute `t_obs = t_now - delayTurns`.
2. Compare enemy positions at `t_now` against player selves at `t_obs`.
3. Trigger detection when Manhattan distance `<= maxDistance`.

Configuration:
1. Global level defaults from `GameRulesConfig.detection`.
2. Per-enemy override from `BehaviorConfig` (`detectionProfiles`, `detectionAssignments`, `defaultDetectionProfile`).

---

## 6. Turn/Time Ordering Contract

For each successful player action:
1. Commit player/object outcome.
2. Increment `turn`, set `currentTime`.
3. Run paradox evaluation.
4. Run win check.
5. Run detection evaluation.

Priority remains:
1. `Paradox`
2. `Won`
3. `Detected`

Enemy logic V1 must not violate this ordering.

---

## 7. Interaction with Object Movement

V1 behavior:
1. Enemies are represented as objects in `TimeCube`.
2. Enemy trajectory continuity must remain visible in isometric rendering even when other objects are moved via push/pull.
3. Non-enemy object relocations do not redefine enemy policy trajectories.

Design consequence:
- map/generator validation should avoid designs where movable-object mechanics are expected to rewrite enemy patrol logic.

---

## 8. Data Contract (Concrete V1)

This section defines the concrete, data-driven contract to keep enemy logic configurable without code edits.

### 8.1 Canonical Config Shape

`BehaviorConfig` stays the canonical enemy behavior source:

1. `schemaVersion: 1`
2. `policies: Record<string, BehaviorPolicy>`
3. `assignments: Record<string, string>`

Where:
1. policy key is reusable behavior profile id
2. assignment key is object instance id
3. assignment value is policy key

V1 detection profile extension (implemented, non-breaking):
1. `detectionProfiles?: Record<string, DetectionConfig>`
2. `detectionAssignments?: Record<string, string>`
3. `defaultDetectionProfile?: string`

### 8.2 Resolution Precedence

Movement policy resolution for enemy `enemyId`:
1. look up `assignments[enemyId]`
2. resolve to `policies[policyKey]`
3. evaluate `E_i(t)` with the resolved policy

Detection config resolution for enemy `enemyId` (when extension enabled):
1. if `detectionAssignments[enemyId]` exists, use that profile
2. else if `defaultDetectionProfile` exists, use it
3. else use level default from `GameRulesConfig.detection`

This precedence must be identical in runtime, tests, and generator tooling.

Runtime representation note:
1. Loader materializes `enemyDetectionConfigById` as behavior-level override map.
2. Runtime detection still falls back to `GameRulesConfig.detection` when an enemy has no behavior override.

### 8.3 Reference JSON Example

```json
{
  "schemaVersion": 1,
  "policies": {
    "guard.static": { "kind": "Static" },
    "patrol.loop.alpha": {
      "kind": "PatrolLoop",
      "path": [{ "x": 2, "y": 8 }, { "x": 3, "y": 8 }, { "x": 3, "y": 9 }]
    },
    "patrol.ping.beta": {
      "kind": "PatrolPingPong",
      "path": [{ "x": 10, "y": 4 }, { "x": 10, "y": 5 }, { "x": 10, "y": 6 }]
    }
  },
  "assignments": {
    "enemy.alpha": "patrol.loop.alpha",
    "enemy.beta": "patrol.ping.beta"
  },
  "detectionProfiles": {
    "watch.short": { "enabled": true, "delayTurns": 1, "maxDistance": 2 },
    "watch.long": { "enabled": true, "delayTurns": 1, "maxDistance": 4 }
  },
  "defaultDetectionProfile": "watch.short",
  "detectionAssignments": {
    "enemy.beta": "watch.long"
  }
}
```

### 8.4 Validation Contract

Required validation checks:
1. every `assignments` key references an existing instance id.
2. every `assignments` value references an existing policy key.
3. policy data shape matches discriminated union contract.
4. all policy points are in map bounds and valid for static blockers.
5. if detection extension is present:
- every `detectionAssignments` value references existing detection profile.
- `defaultDetectionProfile` references existing detection profile.
- detection profile fields satisfy runtime constraints (`delayTurns >= 1`, `maxDistance >= 0`).

### 8.5 Structured Error Surface

Validation should return stable, actionable error kinds:
1. `UnknownBehaviorAssignmentInstance`
2. `UnknownBehaviorReference`
3. `UnsupportedBehaviorPolicy`
4. `InvalidBehaviorPathPoint`
5. `UnknownDetectionProfileReference`
6. `InvalidDetectionProfile`

Rule:
- fail fast on load; no runtime silent fallback for invalid behavior config.

---

## 9. Generator Dependency Contract

Map generation will depend on this enemy logic.

Generator must evaluate levels with:
1. Same trajectory function `E_i(t)` as runtime.
2. Same detection function and parameters.
3. Same phase ordering and stop conditions.

This avoids generator/runtime mismatch.

---

## 10. Metrics for Future Generation

Enemy logic should expose metrics that generator can consume:
1. Coverage score:
- fraction of `(x,y,t)` cells observed by at least one enemy.

2. Detection pressure:
- earliest turn/time where detection becomes unavoidable under naive play.

3. Safe corridor continuity:
- length of contiguous safe path from start toward exit in `(x,y,t)` space.

These metrics are advisory for map quality filtering.

---

## 11. Test Requirements

Core tests:
1. Policy evaluation determinism for all policy kinds.
2. Edge cases: empty paths, one-point paths, ping-pong boundaries.
3. Detection correctness for delay/range boundaries.
4. Pipeline priority (`Paradox -> Won -> Detected`) unaffected by enemy updates.

Data tests:
1. Reject out-of-bounds policy points.
2. Reject unknown behavior assignments.
3. Reject unsupported policy kinds when V1 mode forbids them.
4. Verify resolution precedence for movement assignments.
5. Verify detection profile fallback chain (`enemy override -> default profile -> rules default`).

---

## 12. Acceptance Criteria (V1)

1. Enemy positions are fully data-driven and deterministic.
2. Detection results are deterministic for fixed state/action history.
3. Validation catches invalid enemy paths before gameplay starts.
4. Runtime and future generator can share the same policy + detection functions.
5. Existing gameplay phase ordering remains unchanged.
6. Enemy behavior tuning can be done by editing content files only (no code changes required).
7. Resolver precedence is documented and covered by tests.

---

## 13. V2 Extension Path (Not in V1)

Planned later:
1. Alert/chase states.
2. Per-enemy detection cones or LOS occlusion.
3. Adaptive behavior based on observed player history.
4. Group tactics and communication.
