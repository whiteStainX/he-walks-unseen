import { describe, expect, it } from 'vitest'

import type { ResolvedObjectInstance } from './objects'
import { createTimeCube, hasExit, isBlocked, objectsAt, objectsAtTime, placeObjects } from './timeCube'

function sampleObjects(): ResolvedObjectInstance[] {
  return [
    {
      id: 'wall.a',
      archetypeKey: 'wall',
      position: { x: 1, y: 1, t: 0 },
      archetype: {
        kind: 'wall',
        components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
        render: {},
      },
    },
    {
      id: 'exit.a',
      archetypeKey: 'exit',
      position: { x: 2, y: 2, t: 0 },
      archetype: {
        kind: 'exit',
        components: [{ kind: 'Exit' }, { kind: 'TimePersistent' }],
        render: {},
      },
    },
  ]
}

describe('timeCube object occupancy', () => {
  it('indexes objects by (x,y,t)', () => {
    const cube = createTimeCube(4, 4, 3)
    const placed = placeObjects(cube, sampleObjects())

    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    expect(objectsAt(placed.value, { x: 1, y: 1, t: 0 })).toHaveLength(1)
    expect(objectsAt(placed.value, { x: 1, y: 1, t: 2 })).toHaveLength(1)
    expect(objectsAt(placed.value, { x: 0, y: 0, t: 0 })).toHaveLength(0)
  })

  it('supports blocking and exit queries', () => {
    const cube = createTimeCube(4, 4, 3)
    const placed = placeObjects(cube, sampleObjects())

    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    expect(isBlocked(placed.value, { x: 1, y: 1, t: 1 })).toBe(true)
    expect(isBlocked(placed.value, { x: 3, y: 3, t: 1 })).toBe(false)

    expect(hasExit(placed.value, { x: 2, y: 2, t: 1 })).toBe(true)
    expect(hasExit(placed.value, { x: 1, y: 1, t: 1 })).toBe(false)
  })

  it('returns objects in a given time slice', () => {
    const cube = createTimeCube(4, 4, 3)
    const placed = placeObjects(cube, sampleObjects())

    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    expect(objectsAtTime(placed.value, 0).map((obj) => obj.id)).toEqual(['wall.a', 'exit.a'])
    expect(objectsAtTime(placed.value, 2).map((obj) => obj.id)).toEqual(['wall.a', 'exit.a'])
  })
})
