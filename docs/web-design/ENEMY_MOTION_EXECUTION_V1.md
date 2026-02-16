# Enemy Motion Execution Design (V1)

> **Purpose:** Define how enemy movement policies are executed into runtime state.
> **Scope:** Movement execution only (not detection semantics, not chase AI).
> **Related:** `docs/web-design/ENEMY_LOGIC_V1.md`, `docs/web-design/MATH_MODEL.md`, `docs/web-design/GAME_STATE.md`

---

## 1. Goal

Execute data-driven enemy trajectories so enemies are spatially different across time slices and visibly move as player time changes.

---

## 2. Core Decision

V1 executes enemy motion by **projecting policy trajectories into TimeCube occupancy by absolute time `t`**.

Implications:
1. Enemy movement remains deterministic and pure from policy.
2. No mutable per-enemy runtime FSM/state is required in V1.
3. Reading slice `t` always yields policy-consistent enemy position at `t`.

---

## 3. Motion Function

For each enemy instance `e`:

`E_e(t) -> (x, y)`

Where:
1. `E_e` is resolved from assigned behavior policy (`Static`, `PatrolLoop`, `PatrolPingPong`).
2. `t` is world time, not turn count.
3. `E_e(t)` is side-effect free.

---

## 4. Execution Contract

Execution occurs when building run state:
1. default boot content load
2. public content pack load
3. restart

At those points:
1. For each enemy and each slice `t in [0, timeDepth)`, resolve `E_e(t)`.
2. Materialize enemy occupancy at `(x, y, t)` in the cube.
3. Keep non-enemy object placement logic unchanged.

No per-turn “enemy tick” is needed for V1.

---

## 5. Ordering Contract (Pipeline)

Gameplay phase ordering remains:
1. `Paradox`
2. `Won`
3. `Detected`

Enemy motion does not add a new post-action pipeline branch in V1 because motion is already encoded in cube occupancy by `t`.

---

## 6. Invariants

1. Truth model unchanged:
- player truth = `WorldLineState`
- object/enemy truth = `TimeCube`
2. For fixed content + same action history, enemy positions are identical.
3. Enemy occupancy at time `t` depends only on policy + `t`, not turn `n`.
4. Time travel to past/future slices always shows correct enemy position for that target `t`.

---

## 7. Collision and Blocking Policy (V1)

1. Enemies remain `BlocksMovement`.
2. Enemy policy projection does not pathfind around dynamic blockers in V1.
3. If enemy and another object occupy the same cell in a slice, both are present in occupancy (existing multi-occupancy model).
4. Detection logic uses enemy position from the same occupancy source.

---

## 8. Data Requirements

Reuses existing `BehaviorConfig`:
1. `policies`
2. `assignments`

No schema migration required for motion execution V1.

Validation requirements:
1. Assigned policy exists.
2. Policy path points are in bounds.
3. Unsupported policy kinds rejected in V1 mode (as currently defined).

---

## 9. Test Contract

Must cover:
1. `Static` policy: same enemy cell across all `t`.
2. `PatrolLoop`: periodic cycle correctness by `t`.
3. `PatrolPingPong`: boundary reversal correctness by `t`.
4. Restart/content reload reproducibility.
5. Detection uses moved enemy position at current slice.

---

## 10. Out of Scope

1. Chase/alert FSM.
2. Enemy reaction to player position.
3. Dynamic obstacle avoidance/pathfinding.
4. Group coordination.
