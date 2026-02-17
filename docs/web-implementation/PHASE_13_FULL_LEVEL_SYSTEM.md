# Phase 13: Full Level System

> **Goal:** Evolve from baseline pack loading/generation into a complete level system (curated + generated + hybrid) with stronger metadata, validation, and iteration workflow.
> **Design Detail:** `docs/web-design/LEVEL_SYSTEM_FULL.md`
> **Related:** `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`, `docs/web-design/ICON_PACK_AUTHORING.md`, `docs/web-design/MAP_GENERATION_V1.md`

---

## Status

- `Status`: In Progress

Progress:
1. 13A manifest extension implemented (metadata + backward-compatible parsing).
2. 13B validation CLI implemented (`npm run validate:pack`).
3. Remaining: 13C/13D/13E.

---

## Scope

In scope for Phase 13:
1. Manifest metadata extension for pack classes and difficulty labels.
2. Backward-compatible loader support for extended manifest entries.
3. Validation command for registered packs.
4. Level quality gate policy by pack class.
5. Documented workflow for curated/generated/hybrid pack lifecycle.

Out of scope for Phase 13:
1. In-app level editor UI.
2. Story scripting runtime.
3. Backend service.

---

## Workstreams

## 13A. Manifest Contract Extension

Implement:
1. Extend `PublicContentPackManifest` entry shape with optional metadata:
- `class: 'curated' | 'generated' | 'hybrid' | 'experimental'`
- `difficulty?: 'easy' | 'normal' | 'hard' | string`
- `tags?: string[]`
- `source?: { kind: 'manual' | 'generator'; seed?: string; profileId?: string; author?: string }`
2. Keep legacy manifest entries valid.
3. Add parsing/validation guards for malformed metadata.

File targets:
1. `frontend/src/data/loader.ts`
2. `frontend/src/data/loader.test.ts`
3. `frontend/public/data/index.json` (optional sample metadata entries)

Exit criteria:
1. Existing packs still load unchanged.
2. New metadata is available to UI/runtime without breaking old entries.

## 13B. Pack Validation CLI

Implement:
1. CLI to validate one pack id or all manifest packs.
2. Report failures with file and error-kind details.
3. Non-zero exit code on validation failure.

File targets:
1. `frontend/scripts/validate-pack.ts` (new)
2. `frontend/package.json` script: `validate:pack`

Exit criteria:
1. `npm run validate:pack -- --all` validates all manifest packs.
2. CI-friendly failure mode is deterministic.

## 13C. Pack-Class Quality Policy

Implement:
1. Define class-specific quality policy:
- `curated`: schema/load validation required; solver gate optional flag.
- `generated`: schema + solver + quality required.
- `hybrid`: schema + solver required; quality threshold configurable.
- `experimental`: schema required; optional warning mode.
2. Add utilities that evaluate policy from manifest metadata.

File targets:
1. `frontend/src/data/packPolicy.ts` (new)
2. `frontend/src/data/packPolicy.test.ts` (new)
3. `frontend/scripts/validate-pack.ts`

Exit criteria:
1. Policy behavior is test-covered and deterministic.
2. Generated/hybrid packs cannot silently skip required solver/quality checks.

## 13D. Generation Metadata and Hybrid Flow

Implement:
1. Extend export flow to optionally write source metadata into manifest entry.
2. Add generator CLI flags:
- `--class`
- `--difficulty`
- `--tag` (repeatable or comma list)
- `--author`
3. Keep existing `gen:pack` usage valid.

File targets:
1. `frontend/scripts/export-generated-pack.ts`
2. `frontend/src/data/generation/export.ts`
3. `frontend/src/data/generation/export.test.ts`

Exit criteria:
1. Generated packs register with metadata.
2. Manual edits to generated packs can be reclassified as `hybrid`.

## 13E. UX Surfacing (Minimal)

Implement:
1. Show pack class/difficulty in existing state overlay (minimal text only).
2. Do not add new panel complexity in this phase.

File targets:
1. `frontend/src/app/GameShell.tsx`
2. `frontend/src/app/shell/StateOverlay.tsx`

Exit criteria:
1. Player can confirm current pack class and difficulty at runtime.

---

## Execution Sequence

1. 13A Manifest contract extension.
2. 13B Validation CLI.
3. 13C Pack-class quality policy.
4. 13D Generation metadata + hybrid flow.
5. 13E Minimal UX surfacing.
6. Final lint/test/build + docs update.

---

## Test Plan

1. Loader tests:
- legacy manifest entries parse
- extended entries parse
- malformed metadata fails with structured error
2. Policy tests:
- class-based gate behavior per pack class
3. CLI tests (or script integration tests):
- single pack validation
- `--all` validation
- deterministic non-zero on failure
4. Generation export tests:
- manifest metadata written as expected
- backward compatibility preserved
5. Quality gates:
- `npm run lint`
- `npm run test -- --run`
- `npm run build`
- `npx tsc --noEmit`

---

## Acceptance Criteria

1. Extended manifest metadata is supported without breaking existing packs.
2. Pack validation can run across all registered packs from CLI.
3. Pack-class quality policy is explicit and enforced for generated/hybrid content.
4. Generated and curated flows share one contract-safe runtime loader path.
5. Docs and implementation stay aligned for future level-system iteration.
