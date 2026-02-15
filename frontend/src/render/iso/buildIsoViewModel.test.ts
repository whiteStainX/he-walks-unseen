import { describe, expect, it } from 'vitest'

import { createWorldLine, extendNormal } from '../../core/worldLine'
import { createTimeCube, placeObjects } from '../../core/timeCube'
import type { ResolvedObjectInstance } from '../../core/objects'
import { buildIsoViewModel } from './buildIsoViewModel'

function makeWorldLine() {
  const start = createWorldLine({ x: 1, y: 1, t: 0 })
  const step1 = extendNormal(start, { x: 2, y: 1, t: 1 })

  if (!step1.ok) {
    throw new Error('failed to build world line step1')
  }

  const step2 = extendNormal(step1.value, { x: 3, y: 1, t: 2 })

  if (!step2.ok) {
    throw new Error('failed to build world line step2')
  }

  return step2.value
}

function makeCube() {
  const cube = createTimeCube(6, 6, 8)
  const objects: ResolvedObjectInstance[] = [
    {
      id: 'wall.1',
      archetypeKey: 'wall',
      position: { x: 4, y: 4, t: 0 },
      archetype: {
        kind: 'wall',
        components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
        render: { fill: '#eeeeee', stroke: '#111111' },
      },
    },
    {
      id: 'enemy.1',
      archetypeKey: 'enemy',
      position: { x: 1, y: 4, t: 2 },
      archetype: {
        kind: 'enemy',
        components: [{ kind: 'BlocksMovement' }],
        render: { fill: '#cccccc', stroke: '#111111', symbol: 'enemy' },
      },
    },
  ]

  const placed = placeObjects(cube, objects)
  if (!placed.ok) {
    throw new Error('failed to place objects')
  }

  return placed.value
}

describe('buildIsoViewModel', () => {
  it('builds a bounded window with focus', () => {
    const model = buildIsoViewModel({
      currentT: 2,
      timeDepth: 8,
      worldLine: makeWorldLine(),
      cube: makeCube(),
      maxWindow: 6,
    })

    expect(model.startT).toBe(0)
    expect(model.endT).toBe(5)
    expect(model.focusT).toBe(2)
    expect(model.slices).toHaveLength(6)
    expect(model.slices[2].isFocus).toBe(true)
  })

  it('maps player selves and objects onto each time slice', () => {
    const model = buildIsoViewModel({
      currentT: 2,
      timeDepth: 8,
      worldLine: makeWorldLine(),
      cube: makeCube(),
      maxWindow: 6,
    })

    const sliceAt2 = model.slices.find((slice) => slice.t === 2)
    expect(sliceAt2).toBeDefined()

    if (!sliceAt2) {
      return
    }

    expect(sliceAt2.playerSelves).toEqual([{ x: 3, y: 1, turn: 2 }])
    expect(sliceAt2.objects.map((object) => object.id)).toEqual(['wall.1', 'enemy.1'])
  })
})
