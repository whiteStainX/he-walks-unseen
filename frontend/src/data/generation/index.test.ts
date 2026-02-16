import { describe, expect, it } from 'vitest'

import { generateMapPack } from './index'

describe('generateMapPack', () => {
  it('generates deterministic content for same seed and request', () => {
    const request = {
      seed: 'alpha',
      board: { width: 12, height: 12, timeDepth: 16 },
      difficulty: 'normal' as const,
      maxAttempts: 4,
    }
    const first = generateMapPack(request)
    const second = generateMapPack(request)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    if (!first.ok || !second.ok) {
      return
    }

    expect(first.value.content).toEqual(second.value.content)
    expect(first.value.metadata).toEqual(second.value.metadata)
  })

  it('returns validated, solvable content', () => {
    const result = generateMapPack({
      seed: 'solvable-1',
      board: { width: 12, height: 12, timeDepth: 16 },
      difficulty: 'easy',
      maxAttempts: 5,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.metadata.solver.solved).toBe(true)
    expect(result.value.metadata.solver.shortestPathLength).not.toBeNull()
    expect(result.value.metadata.qualityScore).toBeGreaterThanOrEqual(35)
    expect(result.value.content.level.instances.some((entry) => entry.archetype === 'exit')).toBe(true)
  })

  it('fails when quality threshold is impossible', () => {
    const result = generateMapPack({
      seed: 'reject',
      board: { width: 10, height: 10, timeDepth: 12 },
      maxAttempts: 2,
      qualityThreshold: 999,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('GenerationFailed')
    }
  })
})
