import { describe, expect, it } from 'vitest'

import type { Position3D } from './position'
import {
  createWorldLine,
  extendNormal,
  extendViaRift,
  positionsAtTime,
  wouldIntersect,
} from './worldLine'

describe('worldLine', () => {
  it('extends with a valid normal step', () => {
    const start: Position3D = { x: 1, y: 1, t: 0 }
    const worldLine = createWorldLine(start)

    const result = extendNormal(worldLine, { x: 2, y: 1, t: 1 })

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(result.value.path).toHaveLength(2)
      expect(result.value.path[1]).toEqual({ x: 2, y: 1, t: 1 })
    }
  })

  it('rejects self-intersection for normal moves', () => {
    const start: Position3D = { x: 1, y: 1, t: 0 }
    const worldLine = createWorldLine(start)
    const extended = extendNormal(worldLine, { x: 2, y: 1, t: 1 })

    expect(extended.ok).toBe(true)

    if (!extended.ok) {
      return
    }

    const collision = extendNormal(extended.value, { x: 1, y: 1, t: 0 })

    expect(collision.ok).toBe(false)
    if (!collision.ok) {
      expect(collision.error.kind).toBe('SelfIntersection')
    }
  })

  it('allows rift extension with non-monotonic time', () => {
    const start: Position3D = { x: 1, y: 1, t: 0 }
    const first = extendNormal(createWorldLine(start), { x: 2, y: 1, t: 1 })

    expect(first.ok).toBe(true)

    if (!first.ok) {
      return
    }

    const rift = extendViaRift(first.value, { x: 2, y: 1, t: 0 })

    expect(rift.ok).toBe(true)
    if (rift.ok) {
      expect(rift.value.path[2]).toEqual({ x: 2, y: 1, t: 0 })
    }
  })

  it('returns turn-indexed positions at the same time', () => {
    const start: Position3D = { x: 1, y: 1, t: 0 }
    const first = extendNormal(createWorldLine(start), { x: 2, y: 1, t: 1 })

    expect(first.ok).toBe(true)
    if (!first.ok) {
      return
    }

    const second = extendNormal(first.value, { x: 3, y: 1, t: 2 })

    expect(second.ok).toBe(true)
    if (!second.ok) {
      return
    }

    const rift = extendViaRift(second.value, { x: 4, y: 1, t: 1 })

    expect(rift.ok).toBe(true)
    if (!rift.ok) {
      return
    }

    const atT1 = positionsAtTime(rift.value, 1)

    expect(atT1).toHaveLength(2)
    expect(atT1[0].turn).toBe(1)
    expect(atT1[1].turn).toBe(3)
    expect(wouldIntersect(rift.value, { x: 4, y: 1, t: 1 })).toBe(true)
  })
})
