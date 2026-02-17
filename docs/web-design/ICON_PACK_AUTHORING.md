# Icon Pack Authoring (Web)

> **Purpose:** Define a contract-safe pipeline for authoring and validating board icon packs.
> **Scope:** `frontend/public/data/icons/`, icon-pack schema, slot naming, fallback behavior.
> **Related:** `docs/web-design/UI_WINDOW_SYSTEM.md`, `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`

---

## 1. Canonical Files

Each icon pack ships as:

1. manifest: `frontend/public/data/icons/<packId>.pack.json`
2. assets: `frontend/public/data/icons/<folder>/*.svg` (optional `*.png`)

Theme binding:
1. set `iconPackId` in `frontend/public/data/<packId>.theme.json`

---

## 2. Schema Contract

Current schema (`schemaVersion: 1`):

```json
{
  "schemaVersion": 1,
  "id": "default-mono",
  "meta": {
    "name": "Default Mono",
    "author": "optional"
  },
  "defaults": {
    "cellPx": 64,
    "stroke": "#111111",
    "fill": "#f5f5f5"
  },
  "slots": {
    "wall": { "svg": "/data/icons/default/wall.svg", "png": "/optional.png" }
  }
}
```

Validation requirements:
1. `id` must be non-empty string.
2. `slots` must be a non-empty object.
3. each slot must provide non-empty `svg`.
4. `png` is optional, but when provided must be non-empty string.

---

## 3. Slot Naming Contract

## 3.1 Board object slots

Level archetypes resolve icon slots from:
1. `archetype.render.symbol` (explicit)
2. fallback by archetype kind (`wall`, `box`, `exit`, `enemy`, `marker`, `patrol`, `rift`)

If `render.symbol` is used, it must exist in icon pack slots (validated at load).

## 3.2 UI/runtime semantic slots

Board renderer also uses these semantic slots:
1. `player`
2. `pastSelf`
3. `danger`

These are recommended for complete visual coverage.  
If missing, runtime falls back to built-in canvas shapes.

---

## 4. Required vs Recommended Slots

Strictly required by validation:
1. any slot referenced by `level.archetypes[*].render.symbol`

Recommended baseline set for playable packs:
1. `player`
2. `pastSelf`
3. `danger`
4. `wall`
5. `box`
6. `exit`
7. `enemy`
8. `rift`

---

## 5. SVG/Asset Authoring Rules

1. Prefer SVG as primary source (crisp scaling).
2. Keep style monochrome-first:
- clean outlines
- flat fills
- no gradients/glows/shadows
3. Use square viewBox and centered silhouettes.
4. Keep detail low; prioritize tactical readability at small cell sizes.
5. Paths should render clearly at ~`cellPx` 64 and downscaled board cells.

---

## 6. Runtime Fallback Behavior

When a slot is missing or image load fails:
1. board renderer does not crash
2. fallback shape icon is drawn for that slot
3. gameplay remains fully playable

Validation still fails for:
1. missing slot referenced by `render.symbol`
2. malformed icon-pack manifest shape

---

## 7. Authoring Workflow

1. Create `frontend/public/data/icons/<packId>.pack.json`.
2. Add SVG assets under `frontend/public/data/icons/<folder>/`.
3. Update target theme `iconPackId`.
4. Run checks:
- `cd frontend`
- `npm run test -- src/data/validate.test.ts src/render/board/iconPack.test.ts --run`
5. Run app and verify:
- icon rendering for player/object/pastSelf/danger
- fallback behavior when intentionally removing one optional slot.

---

## 8. Common Validation Errors

1. `InvalidShape (icon-pack)`: malformed manifest or slot fields.
2. `InvalidSchemaVersion (icon-pack)`: manifest version not `1`.
3. `InvalidIconSlotReference`: level references symbol slot missing in pack.
4. `FetchFailed`: missing pack file or missing asset path at runtime.

Use these to quickly locate failure source:
1. manifest shape issue
2. theme `iconPackId` mismatch
3. missing symbol slot in pack
4. broken asset path.
