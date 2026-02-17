import { describe, expect, it } from 'vitest'

import { validateContentPack } from './validate'
import { evaluatePackClassPolicy } from './packPolicy'
import { generateMapPack } from './generation/index'

import defaultLevel from './content/default.level.json'
import defaultBehavior from './content/default.behavior.json'
import defaultTheme from './content/default.theme.json'
import defaultRules from './content/default.rules.json'

function loadDefaultPack() {
  const validated = validateContentPack({
    level: defaultLevel,
    behavior: defaultBehavior,
    theme: defaultTheme,
    rules: defaultRules,
  })

  expect(validated.ok).toBe(true)
  if (!validated.ok) {
    throw new Error(validated.error.kind)
  }

  return validated.value
}

describe('pack policy', () => {
  it('keeps curated packs passable and warns when solver cannot confirm', () => {
    const pack = loadDefaultPack()
    const withoutExit = {
      ...pack,
      level: {
        ...pack.level,
        instances: pack.level.instances.filter((instance) => !instance.id.startsWith('exit.')),
      },
    }

    const evaluated = evaluatePackClassPolicy({
      entry: { id: 'curated-no-exit', class: 'curated' },
      content: withoutExit,
    })

    expect(evaluated.ok).toBe(true)
    expect(evaluated.packClass).toBe('curated')
    expect(evaluated.warnings.length).toBeGreaterThan(0)
  })

  it('rejects generated packs when solver gate fails', () => {
    const pack = loadDefaultPack()
    const withoutExit = {
      ...pack,
      level: {
        ...pack.level,
        instances: pack.level.instances.filter((instance) => !instance.id.startsWith('exit.')),
      },
    }

    const evaluated = evaluatePackClassPolicy({
      entry: { id: 'generated-no-exit', class: 'generated', difficulty: 'easy' },
      content: withoutExit,
    })

    expect(evaluated.ok).toBe(false)
    expect(evaluated.failureReason).toContain('solver gate failed')
  })

  it('accepts generated packs that satisfy solver and quality gates', () => {
    const generated = generateMapPack({
      seed: 'policy-generated-pass',
      board: { width: 12, height: 12, timeDepth: 16 },
      difficulty: 'easy',
      maxAttempts: 6,
    })

    expect(generated.ok).toBe(true)
    if (!generated.ok) {
      return
    }

    const evaluated = evaluatePackClassPolicy({
      entry: { id: 'generated/pass', class: 'generated', difficulty: 'easy' },
      content: generated.value.content,
    })

    expect(evaluated.ok).toBe(true)
    expect(evaluated.metrics?.qualityScore).toBeGreaterThanOrEqual(
      evaluated.metrics?.qualityThreshold ?? 0,
    )
  })
})
