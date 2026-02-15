# UI Window System Spec (Web)

> **Purpose:** Define the HUD/overlay model for a map-first, low-cognitive-load experience.
> **Scope:** `frontend/src/app/`, `frontend/src/render/`, input layers, overlays.
> **References:** `docs/web-design/OVERALL.md`, `docs/web-design/MODULAR_INTERACTION_ARCHITECTURE.md`, `docs/web-design/RENDERING.md`, `docs/web-design/PHASE_03_5_ISOMETRIC_TIMECUBE.md`

---

## 1. UX Direction

Primary goal:
- keep moment-to-moment play readable at a glance
- keep the map + 3D helper as the visual focus
- expose deeper info only when the player requests it

This follows progressive disclosure:
- **always-on minimum** for immediate decisions
- **on-demand detail** for planning and troubleshooting

---

## 2. Visual Priority

Priority order on screen:
1. Main map (`GameBoardCanvas`)
2. 3D helper (`IsoTimeCubePanel`)
3. Compact HUD windows (`COMMAND`, `STATE`, `LOG`)
4. Temporary overlays (log/history, settings, future state details)

Style constraints:
- no drop shadows
- white background, black lines, grayscale fills
- no visual effects that compete with the board

3D helper visual contract:
- follow `docs/web-design/PHASE_03_5_ISOMETRIC_TIMECUBE.md` for contour-first linework
- use slice slabs (thin opaque planes), not dense wireframe outlines
- keep occlusion/blocking cues explicit and readable

---

## 3. Information Levels

## 3.1 Level 0 (Always Visible)

Purpose:
- fast, low-noise decision support during active play

### COMMAND (compact)
Show only:
- active mode (`Move` / `Push` / `Pull`)
- `F` menu
- `Space` rift
- `Enter` wait
- `R` restart

### STATE (compact)
Show only:
- `Turn`
- `Time`
- `Phase`
- `Rift Δ`
- `Danger` (`on/off`)

### LOG (compact)
Show only:
- latest status line

## 3.2 Level 1 (On Demand)

Purpose:
- planning context when player chooses to open details

### COMMAND Menu (existing)
Triggered by `F`:
- mode list (`1/2/3`)
- directional reminder
- interaction key summary

### STATE Details (proposed)
Triggered by dedicated key (candidate: `Tab`):
- depth, pack, board size
- object count on current slice
- player coordinate
- selected advanced diagnostics (if enabled)

## 3.3 Level 2 (Deep/Utility)

- `LogOverlay` full action history (`L`)
- `SettingsOverlay` runtime display toggles (`M`)
- future: story/dialog overlays

---

## 4. Input Layer Contract

Current layers:
1. `Gameplay`
2. `ActionMenu`
3. `LogOverlay`
4. `SystemMenu` (settings)

Planned extension:
5. `StateOverlay` (detailed state)

Ownership rule:
- only active layer consumes its inputs
- gameplay actions dispatch only in `Gameplay`
- no cross-layer auto-dispatch queue

Transition baseline:
- `F`: `Gameplay <-> ActionMenu`
- `L`: `Gameplay <-> LogOverlay`
- `M`: `Gameplay <-> SystemMenu`
- `Esc`: close active non-gameplay layer

Proposed transition:
- `Tab`: `Gameplay <-> StateOverlay`

---

## 5. Layout Contract

Desktop:
- gameplay column remains dominant
- board and iso should visually outweigh HUD windows
- compact HUD should not require scrolling

Responsive:
- reduce HUD density on smaller widths
- preserve board readability first
- keep overlay interactions keyboard-first

---

## 6. Diagnostics Policy

Default player HUD should avoid internal debugging metrics.

Hidden by default:
- detection internals (`delay`, `range`, event count)
- paradox internals (`anchor count`, violation count)

Rule:
- diagnostics are allowed in on-demand detail views or debug mode, not in default glance HUD

---

## 7. Open Decisions For Next Iteration

1. Confirm key for state detail overlay (`Tab` vs another key).
2. Decide whether compact `STATE` includes `Depth` or keeps it detail-only.
3. Decide whether `Danger` toggle remains always visible or moves to detail/settings.
4. Define exact content of `StateOverlay` (player-focused only vs optional diagnostics section).

---

## 8. Implementation Anchors

Use this mapping when planning implementation tasks from this spec:

1. HUD composition and overlays
- `frontend/src/app/GameShell.tsx`

2. Layout and responsive behavior
- `frontend/src/App.css`

3. Board rendering and preview readability
- `frontend/src/render/board/GameBoardCanvas.tsx`
- `frontend/src/render/board/preview.ts`

4. Isometric helper visual style and depth readability
- `frontend/src/render/iso/IsoTimeCubePanel.tsx`
- `docs/web-design/PHASE_03_5_ISOMETRIC_TIMECUBE.md`

5. Input layers and transitions
- `frontend/src/app/inputStateMachine.ts`

---

## 9. Acceptance Criteria

1. At-a-glance HUD can be read in 2–3 seconds.
2. Player can access deeper command/state info without crowding main screen.
3. Map + 3D helper remain the primary visual focus throughout play.
4. Input layer transitions remain deterministic and conflict-free.
