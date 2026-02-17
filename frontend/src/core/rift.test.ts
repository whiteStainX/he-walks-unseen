import { describe, expect, it } from 'vitest'

import { resolveRift, type ResolveRiftInput } from './rift'

function baseInput(): ResolveRiftInput {
  return {
    current: { x: 5, y: 5, t: 6 },
    instruction: undefined,
    settings: { defaultDelta: 3, baseEnergyCost: 0 },
    resources: { energy: null },
    boardWidth: 12,
    boardHeight: 12,
    timeDepth: 24,
  }
}

describe('resolveRift', () => {
  it('uses default delta when instruction is undefined', () => {
    const result = resolveRift(baseInput())

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.target).toEqual({ x: 5, y: 5, t: 3 })
      expect(result.value.mode).toBe('default')
    }
  })

  it('supports tunnel target with space and time change', () => {
    const result = resolveRift({
      ...baseInput(),
      instruction: {
        kind: 'tunnel',
        target: { x: 2, y: 9, t: 1 },
      },
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.target).toEqual({ x: 2, y: 9, t: 1 })
      expect(result.value.mode).toBe('tunnel')
    }
  })

  it('rejects out-of-bounds tunnel targets', () => {
    const result = resolveRift({
      ...baseInput(),
      instruction: {
        kind: 'tunnel',
        target: { x: 99, y: 9, t: 1 },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('InvalidTargetSpace')
    }
  })
})
