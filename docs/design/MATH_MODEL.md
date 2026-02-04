# Mathematical Model: Space-Time Cube and Detection

> **Purpose:** Formalize the mathematical foundations of "He Walks Unseen" to ensure the game mechanics are computationally tractable, intuitively understandable, and strategically interesting.

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
- `T` = temporal depth (maximum time slices)

**Interpretation:**
- `(x, y)` = spatial position (the "room")
- `t` = temporal position (the "moment")
- Each point `(x, y, t)` represents a specific location at a specific moment

### 1.2 Entities as World Lines

Every entity exists as a **world line** — a set of points in the cube:

```
Entity E = { (x_t, y_t, t) | t ∈ [t_start, t_end] }
```

**Static entities** (walls, exits) form vertical lines:
```
Wall at (3, 5): { (3, 5, t) | 0 ≤ t < T }
```

**Time-persistent entities** (boxes, enemies) propagate forward:
```
Box initially at (2, 4, 0): { (2, 4, t) | 0 ≤ t < T }  (until moved)
```

**Moved entities** have kinked world lines:
```
Box moved at t=5 from (2,4) to (3,4):
  { (2, 4, t) | 0 ≤ t < 5 } ∪ { (3, 4, t) | 5 ≤ t < T }
```

### 1.3 The Player's World Line

The player is unique — they traverse the cube non-monotonically:

```
Player World Line P = [(x₀,y₀,t₀), (x₁,y₁,t₁), ..., (xₙ,yₙ,tₙ)]
```

**Normal movement:** `t_{i+1} = t_i + 1` (time advances)

**Rift travel:** `t_{i+1}` can be any valid time (including past)

**Self-intersection rule:** No two points share `(x, y, t)`:
```
∀i,j where i ≠ j: (xᵢ, yᵢ, tᵢ) ≠ (xⱼ, yⱼ, tⱼ)
```

### 1.4 The Explored Boundary

**Key concept:** Only the time range the player has explored is "real":

```
T_explored = [0, max(t_i for all i in player's world line)]
```

Or more precisely, the **convex hull** of visited times:
```
T_min = min(tᵢ)  (usually 0)
T_max = max(tᵢ)  (the "frontier")
```

**Validation scope:** We only validate states within `[T_min, T_max]`.

Future times beyond `T_max` are "unwritten" — entities there are projections based on propagation rules, not concrete state.

---

## 2. Movement Validity

### 2.1 Basic Move Validation

A move from `(x, y, t)` to `(x', y', t')` is valid if:

1. **In bounds:** `(x', y', t') ∈ W`
2. **Not blocked:** No entity with `BlocksMovement` at `(x', y', t')`
3. **No self-intersection:** `(x', y', t') ∉ P` (player's existing world line)
4. **Adjacency:** For normal moves, `|x'-x| + |y'-y| ≤ 1` and `t' = t + 1`

### 2.2 Rift Move Validation

Rift from `(x, y, t)` to `(x', y', t')`:

1. **Rift exists:** There's a rift entity at `(x, y, t)` with target `(x', y', t')`
2. **Target valid:** `(x', y', t') ∈ W`
3. **No self-intersection:** `(x', y', t') ∉ P`
4. **No grandfather paradox:** (deferred to Phase 7)

### 2.3 Push/Pull Validity

When player pushes entity E from `(ex, ey, t)` to `(ex', ey', t+1)`:

1. **E's future world line shifts:** All points `(ex, ey, t') where t' > t` become `(ex', ey', t')`
2. **No collision:** The shifted world line doesn't intersect:
   - Other blocking entities
   - The player's world line
3. **Cascade limit:** Push chains have maximum length

---

## 3. The Light Cone Problem

### 3.1 Original Design (from OVERALL.md)

Enemy at `(ex, ey, te)` sees player at `(px, py, tp)` if:

```
te > tp                                    (1) Causality: enemy is in future
distance(ex, ey, px, py) ≤ c × (te - tp)   (2) Within light cone
¬blocked(ex, ey, te, px, py, tp)           (3) Line of sight clear
```

Where `c` = speed of light (configurable, e.g., 3 tiles/turn)

**Interpretation:** Information travels at finite speed. An enemy `d` tiles away sees the player with a delay of `⌈d/c⌉` turns.

### 3.2 Why This Is Complex

**Problem 1: Multiple Source Points**

The player visits N positions. Each creates a light cone:

```
For player at (px, py, tp), light cone at time te:
  Cone(px, py, tp, te) = { (x, y) | distance(x, y, px, py) ≤ c × (te - tp) }
```

An enemy at `(ex, ey, te)` must check ALL player positions:
```
Detected = ∃i : (pxᵢ, pyᵢ, tpᵢ) such that
           te > tpᵢ AND
           distance(ex, ey, pxᵢ, pyᵢ) ≤ c × (te - tpᵢ) AND
           ¬blocked(...)
```

**Complexity:** O(|P| × |E| × T) where |P| = world line length, |E| = enemy count

**Problem 2: Dynamic Enemy Positions**

Enemies patrol. Their positions change over time:
```
Enemy E at time t: position = patrol(E, t)
```

Each enemy position generates its own "reverse light cone" looking into the past.

**Problem 3: Interference Patterns**

Multiple light cones can overlap, creating complex detection zones. Players must mentally track:
- Where they've been
- When they were there
- Which enemies could see each past position
- When that information "reaches" each enemy

**Problem 4: Counterintuitive Behavior**

"I moved away from the guard, but 3 turns later he detected me because light from my past position reached him."

This is physically accurate but cognitively demanding.

### 3.3 Computational Cost

For each game state validation:

```python
def is_detected(player_world_line, enemies, time_current, c, cube):
    for (ex, ey, te) in enemies_at_all_times(enemies, 0, time_current):
        for (px, py, tp) in player_world_line:
            if te > tp:
                d = distance(ex, ey, px, py)
                if d <= c * (te - tp):
                    if not blocked(cube, ex, ey, te, px, py, tp):
                        return True, (ex, ey, te), (px, py, tp)
    return False, None, None
```

**Worst case:** O(T × E × P × ray_cast_cost)

For T=50, E=5, P=50: 12,500 visibility checks per move.

---

## 4. Alternative Detection Models

### 4.1 Model A: Discrete Delay (Simplified Light Cone)

**Rule:** Enemy at time `te` sees player's position at time `te - k` (fixed delay `k`).

```
Detected if: player_was_at(te - k) is visible from enemy_at(te)
```

**Pros:**
- O(E) per check (constant world line lookup)
- Easy to understand: "Guards see 2 turns into the past"
- Predictable behavior

**Cons:**
- Loses distance-dependent delay
- Less physically motivated
- Binary: either delayed or not

### 4.2 Model B: Instant Vision with Alert Propagation

**Rule:**
1. Enemy sees player instantly if in line of sight
2. Detection triggers an "alert wave" that spreads at speed `c`
3. Other enemies become alerted when wave reaches them

```
if player visible to enemy E at time t:
    alert_origin = (E.x, E.y, t)
    for other_enemy F:
        F.alerted_at = t + distance(E, F) / c
```

**Pros:**
- Traditional stealth game feel (instant detection)
- Alert propagation adds tactical depth
- Computationally cheap for initial detection

**Cons:**
- Two-phase system (detection + propagation)
- Different feel from "causal vision"

### 4.3 Model C: Temporal Shadows

**Rule:** Player leaves "shadows" at visited positions that fade over `N` turns.

```
Shadow at (x, y, t) exists for times [t, t + N]
Shadow_intensity(x, y, t, t') = max(0, 1 - (t' - t) / N)
Enemy detects if Shadow_intensity > threshold at enemy's position/time
```

**Pros:**
- Intuitive: "Don't linger, or your shadow will be seen"
- Tunable via N and threshold
- Equivalent to simplified light cone with finite range

**Cons:**
- "Shadow" metaphor less physically grounded
- May feel arbitrary

### 4.4 Model D: Snapshot Vision (No Temporal Component)

**Rule:** Enemies only see the player's CURRENT position at CURRENT time.

```
Detected if: player_at(t_current) is visible from any enemy_at(t_current)
```

**Pros:**
- Simplest possible model
- Traditional stealth game
- O(E) per check

**Cons:**
- Completely ignores the time-travel aspect
- Wastes the Space-Time Cube's potential
- No causal mechanics

### 4.5 Model E: Layered Light Cone

**Rule:** Combine instant vision (close range) with delayed vision (far range).

```
if distance(player, enemy) ≤ R_instant:
    # Close range: instant detection
    Detected immediately
else if distance(player, enemy) ≤ R_max:
    # Far range: light cone applies
    delay = (distance - R_instant) / c
    Detected at enemy_time + delay
```

**Pros:**
- Close encounters are dangerous (intuitive)
- Distance still matters
- Bounded computation (ignore beyond R_max)

**Cons:**
- Two-regime system
- More parameters to tune

---

## 5. Proposed Model: "Causal Horizon"

After analysis, I propose a **hybrid model** that preserves the causal flavor while remaining tractable:

### 5.1 Core Rules

1. **Immediate Zone (radius R₀):** Instant detection. If player is within R₀ of enemy at any shared time, instant game over.

2. **Causal Zone (radius R₀ to R₁):** Light cone applies. Enemy at `te` sees player positions `tp < te` where:
   ```
   R₀ < distance ≤ R₁
   distance ≤ c × (te - tp)
   ```

3. **Safe Zone (radius > R₁):** No detection possible. Information doesn't propagate that far.

### 5.2 Boundary Simplification

**Key insight:** We only need to check light cones within the player's explored time range.

```
For enemy at (ex, ey, te):
    if te > T_max (player's frontier):
        # Enemy is in "unwritten future" — no detection yet
        skip
    else:
        # Check against player positions tp ∈ [0, te)
        check light cone intersection
```

### 5.3 Computational Optimization

**Spatial indexing:** Pre-compute player positions by time for O(1) lookup.

**Cone pruning:** Only check player times `tp` where `te - tp ≤ R₁/c` (light can't travel further).

**Lazy evaluation:** Only compute detection when player takes an action, not continuously.

```python
def check_detection_optimized(player_world_line, enemies, c, R0, R1):
    # Index player positions by time
    player_at = {tp: (px, py) for (px, py, tp) in player_world_line}
    T_max = max(player_at.keys())

    for enemy in enemies:
        for te in range(0, T_max + 1):
            ex, ey = enemy.position_at(te)

            # Only check times within light travel distance
            max_delay = R1 // c
            for tp in range(max(0, te - max_delay), te):
                if tp not in player_at:
                    continue
                px, py = player_at[tp]
                d = distance(ex, ey, px, py)

                if d <= R0:
                    return INSTANT_DETECTION
                elif d <= R1 and d <= c * (te - tp):
                    if not blocked(ex, ey, px, py, te):
                        return CAUSAL_DETECTION

    return NO_DETECTION
```

**Complexity:** O(E × T × (R₁/c)) — bounded by light travel time, not full history.

### 5.4 Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `c` | 3 | Speed of light (tiles/turn) |
| `R₀` | 2 | Instant detection radius |
| `R₁` | 12 | Maximum detection radius |
| `R₁/c` | 4 | Maximum look-back time |

With these defaults:
- Within 2 tiles: instant death
- 3-12 tiles: causal detection (1-4 turn delay)
- Beyond 12 tiles: safe

---

## 6. Visual Representation

### 6.1 Light Cone Visualization

For UI feedback, show the "danger zone" at each time slice:

```
At time t, danger zone for enemy at (ex, ey):
  - Red (solid): radius R₀ — instant death
  - Red (gradient): expanding ring from R₀ to min(R₁, c × Δt)
  - Gray: beyond R₁ — safe
```

### 6.2 Player Trail Visualization

Show the player's past positions with fading intensity:
```
Position at t-1: bright cyan
Position at t-2: dim cyan
Position at t-3: faint cyan
Position at t-4+: invisible (beyond light cone reach)
```

This helps players understand which past positions are "still dangerous."

---

## 7. Edge Cases and Paradoxes

### 7.1 Time Travel Detection

If player rifts to past time `t_past`:

```
Scenario: Player at t=10, rifts to t=3

Question: Can enemies at t=4,5,6,... now detect the player at t=3?

Answer: YES. The player's world line now includes (px, py, 3).
        All enemies at t > 3 can potentially see this position.
```

**Implication:** Rifting to the past is dangerous — you're inserting yourself into a time where enemies may already have "seen" you (causally).

### 7.2 The Grandfather Paradox of Detection

```
Scenario:
1. Player at (5, 5, 10)
2. Enemy at (5, 8, 10) — 3 tiles away
3. With c=3, enemy sees player at t=9 (1 turn delay)
4. But player wasn't at (5, 5, 9) — they were at (4, 5, 9)

Question: Does the enemy see the player?
```

**Answer:** The enemy sees where the player WAS at `te - delay`, not where they ARE. If player was at (4, 5, 9) and enemy is at (5, 8, 10):
- Distance from (4, 5) to (5, 8) = √10 ≈ 3.16
- Delay = 10 - 9 = 1
- Light travel = c × 1 = 3
- 3.16 > 3 → NOT detected

### 7.3 Moving Enemies

```
Scenario:
- Enemy patrols: (2, 2) at t=5, (3, 2) at t=6
- Player was at (5, 2) at t=4

Detection check at t=6:
- Enemy at (3, 2), player was at (5, 2) at t=4
- Distance = 2, time delta = 2, c=3
- Light travel = 3 × 2 = 6 > 2 → DETECTED
```

The enemy's patrol pattern affects what they can see and when.

---

## 8. Recommendation

### For Phase 5 Implementation:

1. **Start with Model A (Discrete Delay)** as the baseline:
   - Fixed delay `k = 2` turns
   - Simpler to implement and debug
   - Establishes the "enemies see the past" concept

2. **Add Model E (Layered Light Cone)** as an option:
   - Instant zone R₀ = 2
   - Causal zone R₁ = 12, c = 3
   - Per-level configuration

3. **Provide visual feedback:**
   - Show danger zones on the grid
   - Show player's fading trail
   - Preview detection before committing moves

### Configuration in Level Files:

```toml
[detection]
model = "causal_horizon"  # or "discrete_delay" or "instant"
speed_of_light = 3
instant_radius = 2
max_radius = 12
```

---

## 9. The Two Times Problem (Critical Insight)

### 9.1 Two Distinct Time Concepts

**This is the most important conceptual clarification in the entire design.**

There are TWO completely different "time" concepts in this game:

| Concept | Symbol | Nature | Description |
|---------|--------|--------|-------------|
| **Cube Time** | `t` | Spatial dimension | The third axis of the space-time cube. Static. All moments exist simultaneously. |
| **Turn Time** | `n` | Player progression | The sequence of moves the player makes. External to the cube. |

**Cube Time (`t`):**
- A coordinate, like `x` and `y`
- The cube is a **static sculpture** — all `t` values exist simultaneously
- There is no "before" or "after" within the cube — just positions
- An entity at `(3, 5, t=7)` doesn't "wait" for `t=7` to arrive — it simply *exists* at that coordinate

**Turn Time (`n`):**
- The player's progression through the game
- Turn 0: Player at `(x₀, y₀, t₀)`
- Turn 1: Player at `(x₁, y₁, t₁)`
- This is **external** to the cube — it's the player in the real world making decisions

### 9.2 Why This Distinction Matters

**Common Confusion:** "Can I rift away *before* the light reaches the enemy?"

This question conflates the two times. Let's decompose it:

**In Cube Time:** There is no "before" or "after." The world line is a complete path:
```
P = [(x₀,y₀,t₀), (x₁,y₁,t₁), ..., (xₙ,yₙ,tₙ)]
```
The enemy's light cone is a static geometric volume. Detection happens if **any point** in the world line intersects **any** light cone. It's a pure geometry problem.

**In Turn Time:** The player constructs the world line incrementally. At turn `n`, they've committed to positions `0` through `n-1`. The question becomes: "Given my committed world line, will adding this next position cause detection?"

### 9.3 The Correct Framing

**Detection is a geometric intersection test:**

```
Detected = ∃ (px, py, tp) ∈ P, ∃ (ex, ey, te) ∈ E :
           LightCone(ex, ey, te) contains (px, py, tp)
```

Where `LightCone(ex, ey, te)` is the set of all points `(x, y, t)` such that:
```
t < te  AND  distance(x, y, ex, ey) ≤ c × (te - t)  AND  ¬blocked
```

**Key insight:** The light cone extends **backwards in cube time** from the enemy's position. It's a past-pointing cone, not a future-pointing one.

```
        Enemy at (ex, ey, te)
                 │
                 ▼
        ─────────●─────────  t = te
               /│\
              / │ \
             /  │  \    Light cone extends BACKWARD in t
            /   │   \
           /    │    \
        ──/─────┼─────\──  t = te - 1
         /      │      \
        /       │       \
       ────────────────────  t = te - 2

       Player's world line passes through this cone?
       If yes → Detected
```

### 9.4 "Before" and "After" in Cube Coordinates

When we say "the player was seen before they escaped":

**Wrong interpretation:** Real-world time sequence (turn order)

**Correct interpretation:** The player's world line point `(px, py, tp)` has cube-time `tp < te` (enemy's cube-time), and falls within the light cone.

The word "before" refers to `tp < te` (cube time comparison), NOT "the player made this move earlier in turn sequence."

### 9.5 Implications for Rifts

**Scenario:** Player at `(5, 5, 10)`, rifts to `(5, 5, 3)`.

**Question:** "Is the player safe from enemies at `t > 10`?"

**Answer:** Irrelevant framing. The correct question is:

"Does the world line point `(5, 5, 3)` fall inside any enemy's backward light cone?"

For an enemy at `(ex, ey, te)`:
- If `te > 3` and `distance(5, 5, ex, ey) ≤ c × (te - 3)` and not blocked → **Detected**

The rift doesn't "save" the player from detection — it just adds another point to the world line that must be checked against all light cones.

---

## 10. Past-Turn Selves: Multiple Positions on Same Time Slice

### 10.1 The Scenario

When the player uses a rift to revisit a cube-time `t` they've already visited, multiple world line points share the same `t` coordinate:

```
Turn n=1: Player at (3, 5, t=7)
Turn n=2: Player moves to (3, 5, t=8)
Turn n=3: Player moves to (4, 5, t=9)
...
Turn n=5: Player rifts to (6, 2, t=7)  ← Same t, different (x, y)
```

**Result:** The world line contains TWO points at `t=7`:
- `(3, 5, t=7)` — from turn n=1 (past-turn self)
- `(6, 2, t=7)` — from turn n=5 (current-turn self)

### 10.2 Terminology

| Term | Definition |
|------|------------|
| **Current-turn self** | The player position at the current turn `n`. This is the controllable entity. |
| **Past-turn self** | Any player position from an earlier turn `n' < n`. These are fixed, uncontrollable "echoes." |
| **Same time slice** | Multiple selves can exist at the same cube-time `t` as long as they occupy different spatial positions `(x, y)`. |

**Critical distinction:**
- "Past" and "current" refer to **turn time** (`n`), not cube-time (`t`)
- Selves on the same time slice share the same cube-time but differ in turn time
- The self-intersection rule prevents selves from sharing `(x, y, t)`, not just `t`

### 10.3 Rendering Implications

When rendering a time slice `t`, the renderer must:

1. **Query all world line points at `t`:** There may be 0, 1, or many.
2. **Identify the current-turn self:** The most recent point in turn order.
3. **Render distinctly:**
   - Current-turn self: bright color (e.g., cyan `#00ffff`)
   - Past-turn selves: dim color (e.g., dim cyan `#004444`)

```
Time slice t=7:

  . . . . . . . . .
  . . . @ . . . . .   ← Past-turn self (dim) at (3, 5)
  . . . . . . . . .
  . . . . . . @ . .   ← Current-turn self (bright) at (6, 2)
  . . . . . . . . .
```

### 10.4 Gameplay Implications

This mechanic creates strategic depth:

1. **Spatial planning:** Past-turn selves block future movement to those positions (self-intersection rule).
2. **Mental model burden:** The player must track their own world line — this IS the puzzle.
3. **Visual feedback:** Seeing past-turn selves helps players understand their committed path.

### 10.5 Interaction Rules

Past-turn selves are **inert** — they cannot be interacted with:

- Cannot push past-turn self
- Cannot be blocked by past-turn self (they already occupy that space-time point)
- Past-turn self does not trigger enemy detection separately (the world line point already exists)

The only constraint is **prevention**: you cannot move to a position occupied by a past-turn self.

---

## 11. Resolved Design Decisions

Based on the two-times clarification (Section 9) and past-turn selves (Section 10):

### 11.1 Detection is Immediate Game Over

**Decision:** Detection cannot be undone. Any world line point inside any light cone = failure.

**Rationale:** The world line is a permanent record. There's no "undo" because the position is committed to the cube.

### 11.2 Walls Block Light Cones

**Decision:** Walls are static vertical surfaces in the cube. Light cones cannot penetrate them.

**Implementation:** Ray-cast from enemy position to player position, checking for `BlocksVision` entities along the path.

### 11.3 Any Detection = Failure

**Decision:** Multiple detections don't compound. First detection ends the level.

**Rationale:** Detection is a binary state (seen/unseen). Being seen by multiple enemies isn't "more" seen.

### 11.4 No "Alert Phase" (Deferred)

**Decision:** Alert concept is deferred. It introduces turn-time mechanics that complicate the pure cube-time model.

**Note:** Alert would mean "player has N turns (turn-time) to fix their world line before detection becomes permanent." This is a different game mode that could be added later.

### 11.5 Rift Safety is Geometric

**Decision:** Whether a rift "saves" the player depends entirely on the geometry of the new world line point relative to enemy light cones.

**Example:**
- Player at `(5, 5, 10)`, enemy at `(5, 5, 12)`
- Without rift: Player at `(5, 5, 11)` — inside enemy's light cone (distance 0, time delta 1, c=3 → 0 ≤ 3 → **Detected**)
- With rift to `(5, 5, 3)`: Player at `(5, 5, 3)` — outside enemy's backward light cone from `t=12` if player moves away spatially

---

## 12. The Pure Geometric Model

With the two-times clarification, detection becomes a **pure geometry problem**:

### 12.1 Static Cube View

The space-time cube is a static 3D sculpture containing:

1. **Entity world lines:** Vertical lines or kinked lines for walls, boxes, enemies
2. **Player world line:** A path through the cube (potentially non-monotonic in `t`)
3. **Enemy light cones:** Backward-pointing cones from each enemy position

### 12.2 Detection as Intersection

```
Detection = WorldLine ∩ (⋃ LightCones) ≠ ∅
```

In words: Detection occurs if the player's world line intersects the union of all enemy light cones.

### 12.3 Light Cone Geometry

For enemy at `(ex, ey, te)` with vision speed `c`:

```
LightCone(ex, ey, te) = { (x, y, t) |
    t < te                              // Backward in cube-time
    ∧ distance(x, y, ex, ey) ≤ c × (te - t)   // Within expanding radius
    ∧ ¬blocked(x, y, t, ex, ey, te)     // Line of sight clear
}
```

**Visual:** The light cone is a **downward-pointing cone** (in our convention where `t` increases upward):

```
t ↑
  │     Enemy at te ──→  ●
  │                     /|\
  │                    / | \
  │    Cone radius   /  |  \   = c × Δt
  │    grows        /   |   \
  │    backward    ─────┴─────
  │                at t = te - Δt
  │
  └────────────────────────→ space (x, y)
```

### 12.4 Patrol Enemies Create Cone Trails

A patrolling enemy traces a path through the cube:
```
Enemy path: [(ex₀, ey₀, 0), (ex₁, ey₁, 1), ..., (exₜ, eyₜ, T)]
```

Each point on this path generates its own backward light cone. The union of these cones forms a complex 3D volume — a "cone trail."

---

## 13. Simplified Model Decision

Given the complexity of full light cones, we propose **starting simple**:

### Phase 5 Implementation: Discrete Delay Model

```
Detected if: player_at(te - k) is visible from enemy_at(te)
```

Where `k` is a fixed delay (e.g., 2 turns).

**Rationale:**
- Establishes the core concept: enemies see the past
- Computationally cheap: O(E) per check
- Easy for players to understand
- Can upgrade to full light cone later

### Future Enhancement: Full Light Cone

If the discrete model proves too simple, enable per-level:
```toml
[detection]
model = "light_cone"  # or "discrete_delay"
delay_turns = 2       # for discrete_delay
speed_of_light = 3    # for light_cone
max_radius = 12       # for light_cone
```

---

## 14. Summary

| Aspect | Discrete Delay | Full Light Cone |
|--------|---------------|-----------------|
| **Concept** | Enemy sees `k` turns ago | Enemy sees at speed `c` |
| **Complexity** | O(E) | O(E × k_max × ray_cast) |
| **Player Intuition** | "Stay 2 turns ahead" | "Distance buys time" |
| **Implementation** | Phase 5 | Future phase |

**Key Insight:** The cube is static. Detection is geometry. "Before" and "after" refer to cube-time coordinates, not turn sequence.

---

## Appendix A: Notation Reference

| Symbol | Meaning |
|--------|---------|
| `W` | World (the space-time cube) |
| `(x, y, t)` | A point in space-time (cube coordinates) |
| `P` | Player's world line |
| `E` | Set of enemies |
| `c` | Speed of light (tiles per cube-time unit) |
| `k` | Fixed delay for discrete model (cube-time units) |
| `T` | Maximum time depth (cube extent in `t`) |
| `T_max` | Player's explored frontier (max `t` in world line) |
| `n` | Turn number (player's real-world progression) |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Cube Time (`t`)** | The third spatial dimension of the space-time cube. Static coordinate. |
| **Turn Time (`n`)** | The player's real-world progression through moves. External to cube. |
| **World Line** | A path through the cube representing an entity's existence. |
| **Light Cone** | The geometric volume of points visible from a given position. |
| **Backward Cone** | Light cone pointing toward lower `t` values (into the "past"). |
| **Detection** | Intersection of player's world line with any enemy light cone. |
| **Explored Boundary** | The range of `t` values the player has visited (0 to T_max). |
| **Current-Turn Self** | The player position at turn `n` (current). Controllable. |
| **Past-Turn Self** | Player positions from turns `n' < n`. Fixed, uncontrollable echoes. |
| **Same Time Slice** | Multiple world line points sharing cube-time `t` but differing in `(x, y)`. |
