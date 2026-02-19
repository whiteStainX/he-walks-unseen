# Phase 17: LLM Story-to-Level Pipeline

> **Design Detail:** `docs/web-design/LLM_STORY_TO_LEVEL_PIPELINE.md`
> **Related:** `docs/web-design/LEVEL_MANUAL_AUTHORING_GUIDE.md`, `docs/web-design/LEVEL_AUTHORING_WORKFLOW.md`, `docs/web-design/LEVEL_SYSTEM_FULL.md`, `docs/web-design/LEVEL_DIFFICULTY_MODEL.md`

---

## Goal

Implement a deterministic authoring pipeline:
1. story text -> `StorySpec` (LLM-assisted),
2. `StorySpec` -> canonical content pack files (compiler),
3. validation gates -> promotable pack metadata.

---

## Status

- `Status`: Planned

---

## Locked Decisions

1. Runtime simulation stays data-driven and LLM-free.
2. LLM output is intermediate `StorySpec` only; never directly loaded as gameplay content.
3. **Ollama is the default provider** for story-to-level generation.
4. Future provider integrations remain pluggable but must preserve Ollama default unless explicitly changed by design decision.
5. Existing validators/solver/policy gates remain authoritative.

---

## Scope

In scope:
1. `StorySpec` contract + validator.
2. Ollama-backed spec generation adapter (default provider).
3. Deterministic normalization and compiler (`StorySpec -> level/behavior/rules/theme`).
4. CLI workflow for generate/compile/validate.
5. Manifest metadata integration for generated/hybrid lifecycle.
6. Regression tests for deterministic output and failure handling.

Out of scope:
1. Runtime narrative engine.
2. Non-Ollama provider feature work beyond abstraction baseline.
3. Autonomous progression insertion without author review.

---

## Workstreams

## 17A. StorySpec Contract

Implement:
1. Define `StorySpec` v1 types (schemaVersion, board, start, goal, layout, actors, interactives, rulesIntent, difficultyIntent).
2. Define strict validation errors with field-path reporting.
3. Add fixtures (valid + invalid).

File targets:
1. `frontend/src/data/story/contracts.ts` (new)
2. `frontend/src/data/story/validate.ts` (new)
3. `frontend/src/data/story/validate.test.ts` (new)
4. `frontend/public/data/story-spec/examples/*.json` (new)

Exit criteria:
1. Strict schema validation with deterministic error ordering.
2. Unknown fields rejected in strict mode.

## 17B. Ollama Provider Adapter (Default)

Implement:
1. Provider abstraction interface (`generateStorySpec(prompt, constraints)`).
2. Ollama adapter implementation as default.
3. Provider config resolution with explicit default to Ollama.

File targets:
1. `frontend/src/data/story/provider/types.ts` (new)
2. `frontend/src/data/story/provider/ollama.ts` (new)
3. `frontend/src/data/story/provider/index.ts` (new)
4. `frontend/src/data/story/provider/*.test.ts` (new)

Exit criteria:
1. Provider selection defaults to Ollama with no flag required.
2. Provider failure returns typed errors; no file writes on failure.

## 17C. StorySpec Normalization

Implement:
1. Deterministic defaulting and id canonicalization.
2. Stable ordering for archetypes/instances/policies.
3. Seed handling policy for any heuristic placement.

File targets:
1. `frontend/src/data/story/normalize.ts` (new)
2. `frontend/src/data/story/normalize.test.ts` (new)

Exit criteria:
1. Same input `StorySpec` yields byte-stable normalized output.
2. Normalized output contains no implicit defaults.

## 17D. Compiler: StorySpec -> Pack Files

Implement:
1. Deterministic compiler mapping to `level/behavior/rules/theme`.
2. Compiler output compatible with existing `validateContentPack` and loader.
3. Manifest metadata emission (`class`, `source`, `difficulty`, optional `difficultyFlavor` in progression suggestion).

File targets:
1. `frontend/src/data/story/compile.ts` (new)
2. `frontend/src/data/story/compile.test.ts` (new)
3. `frontend/src/data/story/fixtures/*.json` (new)

Exit criteria:
1. Compiled packs pass content validation.
2. Compiler output is deterministic under same spec/seed.

## 17E. CLI Pipeline

Implement:
1. `story:spec` command: prompt -> `StorySpec` file.
2. `story:compile` command: `StorySpec` -> pack files.
3. `story:build` command: generate + compile + validate end-to-end.

File targets:
1. `frontend/scripts/story-spec.ts` (new)
2. `frontend/scripts/story-compile.ts` (new)
3. `frontend/scripts/story-build.ts` (new)
4. `frontend/package.json` (scripts)

Exit criteria:
1. One-command local flow produces validated pack output.
2. Failures are typed and actionable.

## 17F. Gate Integration

Implement:
1. Integrate `validate:pack` and `eval:difficulty` as post-compile gates.
2. Add promotion policy hook:
3. `experimental` default for first compile,
4. author-reviewed promotion to `generated`/`hybrid`/`curated`.

File targets:
1. `frontend/scripts/story-build.ts` (gate orchestration)
2. `frontend/src/data/story/promotion.ts` (new)
3. `frontend/src/data/story/promotion.test.ts` (new)

Exit criteria:
1. Non-compliant outputs are staged but not promoted.
2. Promotion path is explicit and auditable.

## 17G. Docs + Operational Guidance

Implement:
1. Add quickstart commands for story pipeline.
2. Add troubleshooting for common spec/compile failures.
3. Document Ollama default policy and provider override mechanics.

File targets:
1. `frontend/README.md`
2. `README.md`
3. `docs/web-design/LEVEL_MANUAL_AUTHORING_GUIDE.md` (cross-link)

Exit criteria:
1. New contributor can run story pipeline from docs only.

---

## Execution Sequence

1. 17A StorySpec contract.
2. 17B Ollama provider adapter.
3. 17C normalization.
4. 17D compiler.
5. 17E CLI pipeline.
6. 17F gate integration.
7. 17G docs hardening.

---

## Test Plan

1. StorySpec strict validator tests (shape, bounds, unknown fields).
2. Normalization determinism tests (snapshot-stable output).
3. Compiler determinism tests (same spec/seed -> same files).
4. End-to-end CLI tests for success/failure paths.
5. Gate integration tests (`validate:pack`, `eval:difficulty`) in pipeline mode.
6. Provider error handling tests (Ollama unavailable, malformed response).

Quality gates:
1. `npm run lint`
2. `npm run test -- --run`
3. `npm run build`
4. `npx tsc --noEmit`
5. `npm run validate:pack -- --all`

---

## Acceptance Criteria

1. Story prompt can be transformed into validated pack files through deterministic tooling.
2. Ollama is default provider and is explicitly documented in code/docs.
3. Pipeline failures are actionable and never silently mutate runtime content.
4. Generated outputs are compatible with existing pack/progression/difficulty infrastructure.
