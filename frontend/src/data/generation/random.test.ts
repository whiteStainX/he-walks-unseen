import { describe, expect, it } from 'vitest'

import { createSeededRng, hashSeed } from './random'

describe('generation random', () => {
  it('hashes equal seeds to equal integers', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'))
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'))
  })

  it('produces deterministic sequences for same seed', () => {
    const a = createSeededRng('seed-1')
    const b = createSeededRng('seed-1')

    const valuesA = [
      a.nextFloat(),
      a.nextFloat(),
      a.nextInt(0, 10),
      a.nextInt(0, 10),
      a.pick(['x', 'y', 'z']),
    ]
    const valuesB = [
      b.nextFloat(),
      b.nextFloat(),
      b.nextInt(0, 10),
      b.nextInt(0, 10),
      b.pick(['x', 'y', 'z']),
    ]

    expect(valuesA).toEqual(valuesB)
  })
})
