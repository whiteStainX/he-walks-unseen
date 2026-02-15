# Phase 9 UI Upgrade 01 Review

## Purpose

Review HUD progressive disclosure, Moebius isometric readability, and icon-pack loading integration.

---

## Reference Map

### HUD + input layers
- `frontend/src/app/GameShell.tsx`
- `frontend/src/app/inputStateMachine.ts`
- `frontend/src/App.css`

### Isometric rendering
- `frontend/src/render/iso/IsoTimeCubePanel.tsx`
- `frontend/src/render/iso/buildIsoViewModel.ts`
- `frontend/src/render/theme.ts`

### Icon contracts + loading
- `frontend/src/data/contracts.ts`
- `frontend/src/data/validate.ts`
- `frontend/src/data/loader.ts`
- `frontend/src/render/board/iconPack.ts`
- `frontend/src/render/board/iconCache.ts`
- `frontend/src/render/board/GameBoardCanvas.tsx`

### Content assets
- `frontend/src/data/content/default.icon-pack.json`
- `frontend/public/data/icons/default-mono.pack.json`
- `frontend/public/data/icons/default/*.svg`
- `frontend/public/data/default.theme.json`
- `frontend/public/data/default.level.json`

---

## Checklist

- [ ] `COMMAND` and `STATE` are minimal in default view.
- [ ] `Tab` state overlay opens/closes deterministically.
- [ ] Isometric panel readability improved (slice slabs + occlusion cues).
- [ ] Board object rendering uses semantic symbols, not glyph text.
- [ ] Missing icon assets degrade gracefully without gameplay failure.
- [ ] Lint/test/build pass.

---

## Validation Notes

- `npm run lint`: pass
- `npm run test`: pass (86 tests)
- `npm run build`: pass

---

## Follow-ups

- Evaluate icon theming controls in settings (future phase).
- Evaluate optional anti-aliasing toggle for pixel-sharp board symbols.
- Consider dedicated `StateOverlay` module extraction if overlay complexity grows.
