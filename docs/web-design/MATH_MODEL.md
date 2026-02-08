# Mathematical Model (Web): Space-Time Cube and Detection

> **Purpose:** Formalize the mathematical foundations of "He Walks Unseen" for the web app. This is the authoritative reference for cube-time geometry, world lines, detection, and the two-time model.

---

## 1. The Space-Time Cube

### 1.1 Coordinate System

The game world is a discrete 3D lattice:

```
W = { (x, y, t) ∈ ℤ³ | 0 ≤ x < W, 0 ≤ y < H, 0 ≤ t < T }
```

Where:
- `W` = spatial width
- `H` = spatial height
- `T` = temporal depth (time slices)

**Interpretation:**
- `(x, y)` = spatial position
- `t` = cube-time coordinate
- Each `(x, y, t)` is a specific location at a specific cube-time

### 1.2 Entities as World Lines

Every entity exists as a **world line** (set of points in the cube):

```
Entity E = { (x_t, y_t, t) | t ∈ [t_start, t_end] }
```

**Static entities** form vertical lines:
```
Wall at (3, 5): { (3, 5, t) | 0 ≤ t < T }
```

**Time-persistent entities** propagate forward:
```
Box at (2, 4, 0): { (2, 4, t) | 0 ≤ t < T }  (until moved)
```

**Moved entities** have kinked world lines:
```
Box moved at t=5 from (2,4) to (3,4):
  { (2, 4, t) | 0 ≤ t < 5 } ∪ { (3, 4, t) | 5 ≤ t < T }
```

### 1.3 The Player's World Line

The player is unique: they traverse the cube non-monotonically.

```
Player World Line P = [(x₀,y₀,t₀), (x₁,y₁,t₁), ..., (xₙ,yₙ,tₙ)]
```

**Normal movement:** `t_{i+1} = t_i + 1`

**Rift travel:** `t_{i+1}` can be any valid time (including past)

**Self-intersection rule:**
```
∀i,j where i ≠ j: (xᵢ, yᵢ, tᵢ) ≠ (xⱼ, yⱼ, tⱼ)
```

### 1.4 The Explored Boundary

Only the time range the player has explored is "real":

```
T_min = min(tᵢ)
T_max = max(tᵢ)
```

Validation and detection are limited to `[T_min, T_max]`. Future slices beyond `T_max` are projections, not committed history.

---

## 2. Movement Validity

### 2.1 Basic Move Validation
A move from `(x, y, t)` to `(x', y', t')` is valid if:

1. In bounds: `(x', y', t') ∈ W`
2. Not blocked: no `BlocksMovement` at `(x', y', t')`
3. No self-intersection: `(x', y', t') ∉ P`
4. Adjacency: `|x'-x| + |y'-y| ≤ 1` and `t' = t + 1`

### 2.2 Rift Move Validation
Rift from `(x, y, t)` to `(x', y', t')`:

1. Rift exists at `(x, y, t)` with target `(x', y', t')`
2. Target in bounds
3. No self-intersection
4. No grandfather paradox (later phase)

### 2.3 Push/Pull Validity
When pushing entity `E` from `(ex, ey, t)` to `(ex', ey', t+1)`:

1. Future world line shifts: all `(ex, ey, t')` for `t' > t` become `(ex', ey', t')`
2. No collision with blocking entities or player world line
3. Push chains are bounded by max length

---

## 3. The Light Cone Problem

### 3.1 Baseline Definition
Enemy at `(ex, ey, te)` sees player at `(px, py, tp)` if:

```
te > tp
AND distance(ex, ey, px, py) ≤ c × (te - tp)
AND line_of_sight_clear
```

**Interpretation:** Information travels at finite speed. An enemy `d` tiles away sees the player with a delay of `ceil(d / c)` turns.

### 3.2 Complexity Drivers

**Multiple source points:** Player visits many positions; each creates a cone.

**Dynamic enemy positions:** Enemy patrols create a cone trail over time.

**Interference patterns:** Overlapping cones create unintuitive detection zones.

**Counterintuitive behavior:** "I moved away, but was seen later by my past position."

### 3.3 Naive Cost

```
O(T × E × P × ray_cast_cost)
```

Where:
- `T` = time depth
- `E` = enemy count
- `P` = player world line length

---

## 4. Alternative Detection Models (Design Options)

### 4.1 Model A: Discrete Delay
Enemy at `te` sees player at `te - k`.

**Pros:** Simple, cheap, intuitive
**Cons:** Not distance-based

### 4.2 Model B: Instant Vision + Alert Propagation
Immediate detection, then alert wave spreads to other enemies.

**Pros:** Traditional stealth feel
**Cons:** Two-phase system, less causal purity

### 4.3 Model C: Temporal Shadows
Player leaves fading shadows over `N` turns.

**Pros:** Intuitive, tunable
**Cons:** Less physically grounded

### 4.4 Model D: Snapshot Vision
Enemies see only current position at current time.

**Pros:** Simplest
**Cons:** Ignores time-travel mechanics

### 4.5 Model E: Layered Light Cone
Instant close range + delayed far range.

**Pros:** Intuitive danger close, causal at distance
**Cons:** More parameters

---

## 5. Proposed Model: Causal Horizon

### 5.1 Core Rules
1. **Immediate Zone (R0):** Instant detection
2. **Causal Zone (R0–R1):** Delayed detection via light cone
3. **Safe Zone (> R1):** No detection

### 5.2 Boundary Simplification
Only check enemy positions within explored time range `[T_min, T_max]`.

### 5.3 Optimization Sketch
- Index player positions by time for O(1) lookup
- Only check `tp` where `te - tp ≤ R1 / c`

### 5.4 Default Parameters
| Parameter | Default | Meaning |
|----------|---------|---------|
| `c` | 3 | Speed of light |
| `R0` | 2 | Instant radius |
| `R1` | 12 | Max detection radius |

---

## 6. Visual Representation

### 6.1 Light Cone Visualization
- Instant zone: solid red
- Causal zone: gradient
- Safe zone: none

### 6.2 Player Trail
- Recent past positions fade with time
- Only show up to the causal horizon look-back

---

## 7. Edge Cases & Paradoxes

### 7.1 Time Travel Detection
Rifting to the past inserts new world line points; all enemies at `t > tp` can potentially see those points.

### 7.2 Grandfather Paradox of Detection
Enemy sees where player **was**, not where they **are**.

### 7.3 Moving Enemies
Enemy patrol positions at `te` determine what they can see, even if player position is older.

---

## 8. Recommendation (Web MVP)

1. Start with **Model A (Discrete Delay)**
2. Allow **Model E (Layered Light Cone)** as optional per-level config
3. Provide strong visual feedback (danger zones, fading trail)

Config example:
```toml
[detection]
model = "causal_horizon"
speed_of_light = 3
instant_radius = 2
max_radius = 12
```

---

## 9. The Two Times Problem (Critical Insight)

### 9.1 Two Distinct Time Concepts

| Concept | Symbol | Nature | Description |
|---------|--------|--------|-------------|
| **Cube Time** | `t` | Spatial | Third axis of the cube; static coordinate |
| **Turn Time** | `n` | Sequence | The player’s action order in the real world |

### 9.2 Why This Matters
"Can I rift away before the light reaches the enemy?" conflates the two.

- In **cube time**, the world line is a static path. Detection is geometric intersection.
- In **turn time**, the player incrementally constructs the world line.

### 9.3 Correct Framing

Detection is a geometric intersection:

```
Detected = ∃ (px, py, tp) ∈ P, ∃ (ex, ey, te) ∈ E :
           LightCone(ex, ey, te) contains (px, py, tp)
```

The light cone extends **backward in cube time**.

### 9.4 “Before” and “After”
"Before" means `tp < te` in cube time, not turn order.

### 9.5 Implications for Rifts
Rifting adds points to the world line; those points must be checked against all enemy cones.

### 9.5.1 Rift as World-Line Extension Operator
Implementation should treat rift as an operator that appends exactly one new point:

```
Rift(P_n, instruction) -> P_{n+1}
```

Where the appended point may change:
- only `t` (delta/default rift), or
- `x, y, t` together (tunnel rift)

Validity constraints remain unchanged:
1. target must be within world bounds
2. target must satisfy configured rift constraints (for example, resource cost)
3. target `(x, y, t)` must not already exist in `P_n`

### 9.6 Committed Prefix Semantics (Implementation Rule)

To remove ambiguity between cube-time geometry and turn-time progression, the engine
uses two explicit objects:

1. `P_n`: committed player world-line prefix up to turn `n`
2. `S_n(t)`: realized slice at cube-time `t`, computed from `P_n` plus propagation

At turn `n`, gameplay and rendering use `S_n`, not an unknown future-complete timeline.

### 9.7 Same Slice, Different Turns (Tricky Case)

Scenario:
- At `(n1, t1)`, player is at `(x1, y1)`
- Later at `(n2, t1)` with `n2 > n1`, player rifts back and is at `(x2, y2)`

Result under committed prefix semantics:
- `S_n1(t1)` shows only the `n1` self
- `S_n2(t1)` shows both `n1` self and `n2` self

This is intentional. The future self is not rendered at turn `n1` because it is not yet
committed in `P_n1`.

### 9.8 Optional Strict Consistency Mode (Deferred)

If a strict "future self was always observable" mode is desired:

1. Record observable cells/entities each turn
2. After a past-rift action, recompute affected slices
3. Reject action if prior observations would be contradicted

This is a harder paradox system and is not part of baseline v1 rules.

---

## 10. Past-Turn Selves (Same Time Slice)

### 10.1 Scenario
Rifting to a cube-time already visited creates multiple positions at the same `t`:

- Past-turn self: earlier turn index
- Current-turn self: latest turn index
- Visibility is evaluated against current committed prefix `P_n`

### 10.2 Rendering Implications
- Current-turn self rendered bright
- Past-turn selves rendered dim

### 10.3 Interaction Rules
- Past-turn selves are inert
- Self-intersection forbids occupying same `(x,y,t)`

---

## 11. Resolved Design Decisions

1. **Detection = Immediate Game Over**
2. **Walls block light cones** (ray-cast)
3. **Any detection = failure** (no stacking)
4. **No alert phase** (deferred)
5. **Rift safety is geometric**
6. **Turn-time semantics are committed-prefix (`P_n`, `S_n`)**

---

## 12. Pure Geometric Model

The cube is a static 3D sculpture containing:
- Entity world lines
- Player world line
- Enemy backward light cones

Detection occurs if:

```
WorldLine ∩ (⋃ LightCones) ≠ ∅
```

---

## 13. Simplified Model Decision

Start with **Discrete Delay**, then upgrade to full light cone later if needed.

---

## 14. Notation & Glossary

### Notation
| Symbol | Meaning |
|--------|---------|
| `W` | World (space-time cube) |
| `(x, y, t)` | Cube coordinate |
| `P` | Player world line |
| `P_n` | Player world-line prefix committed at turn `n` |
| `E` | Set of enemies |
| `c` | Speed of light |
| `k` | Fixed delay (discrete model) |
| `T` | Time depth |
| `T_max` | Explored frontier |
| `n` | Turn number |
| `S_n(t)` | Realized slice at cube-time `t` under committed prefix `P_n` |

### Glossary
| Term | Definition |
|------|------------|
| Cube Time (`t`) | Spatial time axis of the cube |
| Turn Time (`n`) | Player action sequence |
| World Line | Path through the cube |
| Light Cone | Backward-visible volume from enemy position |
| Detection | World line intersects light cone |
| Explored Boundary | `[T_min, T_max]` from world line |
| Current-Turn Self | Latest turn position |
| Past-Turn Self | Earlier turn positions |
| Committed Prefix | World-line history fixed up to current turn `n` |
