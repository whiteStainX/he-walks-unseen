# LLM Story-to-Level Pipeline (Design)

> **Purpose:** Define a deterministic pipeline that converts story text into valid game content packs.
> **Scope:** LLM-assisted authoring only. Runtime remains fully data-driven from validated JSON.
> **Related:** `docs/web-design/LEVEL_MANUAL_AUTHORING_GUIDE.md`, `docs/web-design/PHASE_06_CONTENT_SYSTEM.md`, `docs/web-design/LEVEL_SYSTEM_FULL.md`, `docs/web-design/LEVEL_DIFFICULTY_MODEL.md`

---

## 1. Goals

1. Convert plain-language story ideas into playable packs with low manual friction.
2. Keep simulation determinism and current truth model unchanged.
3. Make LLM output auditable and compilable, not directly executable.
4. Support iterative author workflow: generate -> validate -> edit -> replay.

---

## 2. Non-Goals

1. No free-form LLM logic in runtime gameplay loop.
2. No online dependency at play time.
3. No direct generation of arbitrary reducer behavior.
4. No bypass of existing validators/solver/pack policy gates.

---

## 3. Core Principle

The LLM is a **spec generator**, not a **content authority**.

1. LLM outputs an intermediate `StorySpec` JSON.
2. Deterministic compiler converts `StorySpec` into pack files:
3. `level.json`
4. `behavior.json`
5. `rules.json`
6. `theme.json`
7. Existing validators and solver gates decide acceptance.

---

## 4. Pipeline Architecture

1. Input:
`story text + author constraints + target difficulty`
2. LLM Draft Stage:
`story text -> StorySpec (strict JSON schema)`
3. Normalization Stage:
`StorySpec -> canonical StorySpec (defaults + stable ordering)`
4. Compile Stage:
`StorySpec -> pack files + manifest metadata`
5. Validation Stage:
`validateContentPack + validate:pack + progression ramp + eval:difficulty`
6. Review Stage:
human review and optional manual edits
7. Publish Stage:
register in `frontend/public/data/index.json` and optionally progression

---

## 5. Intermediate Contract: StorySpec v1

`StorySpec` is the only LLM output accepted by tooling.

Required top-level fields:
1. `schemaVersion: 1`
2. `storyId: string`
3. `title: string`
4. `board: { width, height, timeDepth }`
5. `start: { x, y, t }`
6. `goal: { type: "ReachExit", target: { x, y, t } }`
7. `layout`: static geometry and placements
8. `actors`: enemy intents and patrol intents
9. `interactives`: box/rift/other interactive intents
10. `rulesIntent`: preferred gameplay knobs
11. `difficultyIntent`: desired tier + flavor text

Strict constraints:
1. Every referenced id must be explicit in-spec.
2. No natural-language fields are used by compiler decision logic unless parsed into enums/values.
3. Unknown fields are rejected in strict mode.

---

## 6. Deterministic Compiler Rules

Compiler behavior must be stable with same input.

1. Stable ordering:
sort ids lexicographically before emission.
2. Stable id generation:
`enemy.a`, `enemy.b`, `wall.1`, `rift.1`, etc.
3. No stochastic placement without seed:
if heuristic placement is needed, require explicit `seed`.
4. Bounded mapping:
only map to existing supported components/policies.
5. No hidden defaults:
all inferred defaults are written back into normalized `StorySpec`.

Compiler outputs:
1. content pack files under `frontend/public/data/`
2. manifest entry with class/source/difficulty metadata
3. optional progression suggestion block (not auto-applied by default)

---

## 7. Ambiguity and Failure Policy

When the story is ambiguous:

1. If ambiguity can be resolved by declared defaults:
compiler resolves deterministically and records a warning.
2. If ambiguity changes gameplay semantics:
compiler fails with structured error and actionable fix hints.
3. If impossible constraints exist:
compiler fails before writing files.

No silent guessing for high-impact gameplay decisions.

---

## 8. Validation Gates (Must Pass)

Generated content from `StorySpec` must pass:

1. `validateContentPack` contract checks.
2. `npm run validate:pack -- --pack-id <id>`.
3. `npm run eval:difficulty -- --pack-id <id>`.
4. For progression insertion:
main-track ramp validation and expert gate.

If any gate fails, pack is staged but not promoted.

---

## 9. Author Workflow

1. Author writes story prompt.
2. Tool produces `StorySpec` draft.
3. Author edits `StorySpec` (optional).
4. Compile to pack files.
5. Run validation + local playtest.
6. Promote as:
`experimental -> generated/hybrid -> curated` by review policy.

---

## 10. Difficulty and Progression Integration

1. Compiler writes baseline `difficulty` and optional `difficultyFlavor`.
2. Evaluator computes measured score/vector/tier.
3. Override policy is enforced if authored tier differs from measured tier.
4. Progression updates remain explicit author action, not automatic default.

---

## 11. LLM Interface Contract

Prompt output requirements:

1. JSON only, no prose wrapper.
2. Must match `StorySpec` schema exactly.
3. Must include required ids and bounded enums.
4. Must not emit unsupported behavior kinds.

Provider abstraction requirements:

1. LLM provider is pluggable.
2. **Default provider is Ollama** for story-to-level generation.
3. Future LLM integrations must keep Ollama as the default unless explicitly changed by design decision.
4. Same `StorySpec` schema regardless of provider.
5. Provider failure never mutates content files.

---

## 12. Security and Operational Guardrails

1. Never execute code from model output.
2. Treat model output as untrusted input.
3. Validate before file write.
4. Keep write scope restricted to content directories.

---

## 13. Next Design Step

Create implementation plan for a new phase:

1. `StorySpec` contract + validator module.
2. Compiler module (`StorySpec -> pack files`).
3. CLI workflow:
`story -> spec -> compile -> validate`.
4. Fixture prompts/specs and regression tests.
