# Mathematical Model (Web): Space-Time Cube and Detection

> **Purpose:** Provide a web-friendly, implementation-ready formulation of the Space-Time Cube, world lines, and detection. This document is the authoritative source for gameplay math in the web app.

---

## 1. The Space-Time Cube

### 1.1 Coordinate System

Discrete 3D lattice:

```
W = { (x, y, t) ∈ ℤ³ | 0 ≤ x < W, 0 ≤ y < H, 0 ≤ t < T }
```

- `(x, y)` = spatial position
- `t` = cube-time (spatial axis of time)

### 1.2 Entities as World Lines

```
Entity E = { (x_t, y_t, t) | t ∈ [t_start, t_end] }
```

- **Walls:** vertical lines
- **Time-persistent entities:** vertical unless moved
- **Moved entities:** kinked lines

### 1.3 Player World Line

```
P = [(x₀,y₀,t₀), (x₁,y₁,t₁), ..., (xₙ,yₙ,tₙ)]
```

- Normal moves: `t_{i+1} = t_i + 1`
- Rift moves: `t` can jump
- Self-intersection forbidden:
```
∀i ≠ j: (xᵢ, yᵢ, tᵢ) ≠ (xⱼ, yⱼ, tⱼ)
```

### 1.4 Explored Boundary

Only `[T_min, T_max]` from player world line is considered “real”:

```
T_min = min(tᵢ),  T_max = max(tᵢ)
```

Future slices beyond `T_max` are projections, not committed history.

---

## 2. Movement Validity

### 2.1 Basic Move
Valid if:
1. Target in bounds
2. Target not blocked
3. No self-intersection
4. `t' = t + 1` and Manhattan adjacency ≤ 1

### 2.2 Rift Move
Valid if:
1. Rift exists at `(x, y, t)`
2. Target in bounds
3. No self-intersection
4. No grandfather paradox (later phase)

### 2.3 Push/Pull
- Push shifts entity world line for all `t' > t`
- Must not collide with blocking entities or player world line

---

## 3. Detection (Light Cones)

Enemy at `(ex, ey, te)` sees player at `(px, py, tp)` if:

```
te > tp
AND distance(ex, ey, px, py) ≤ c × (te - tp)
AND line_of_sight_clear
```

**Detection = geometric intersection** between the player world line and the union of enemy light cones.

---

## 4. Two Time Concepts (Critical)

| Concept | Symbol | Meaning |
|---------|--------|---------|
| Cube Time | `t` | Spatial axis (static geometry) |
| Turn Time | `n` | Player action sequence |

**Key rule:** Detection is cube-time geometry, not turn-time ordering.

---

## 5. Past-Turn Selves (Same Time Slice)

Multiple player positions may share the same cube-time `t` if rifting occurs:
- **Current-turn self:** most recent turn index
- **Past-turn selves:** earlier turn indices
- Self-intersection rule only forbids identical `(x, y, t)`

---

## 6. Recommended Detection Model (Web MVP)

Start with **Discrete Delay**:
```
Enemy at time te sees player at time tp = te - k
```

Then upgrade to **Causal Horizon** (optional) with:
- `R0` instant zone
- `R1` max range
- `c` speed of light

---

## 7. Web Implementation Notes

- Use **integers** for coordinates and time.
- Avoid floating point for distance where possible:
  - Compare squared distances to avoid `sqrt`.
- Pre-index player positions by time for O(1) lookup.
- Restrict detection checks to `[T_min, T_max]`.
- For line-of-sight, use integer grid ray-cast (Bresenham).

---

## 8. Summary

The Space-Time Cube is a static 3D geometry. The player's world line is a path through this geometry. Detection is a **pure intersection test** between world lines and enemy backward cones. The web app should treat these as deterministic, testable math rules.
