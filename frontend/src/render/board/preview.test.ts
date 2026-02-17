import { describe, expect, it } from 'vitest'

import { createObjectRegistry, resolveObjectInstance, type ObjectInstance } from '../../core/objects'
import { createTimeCube, placeObjects } from '../../core/timeCube'
import { createWorldLine, extendViaRift } from '../../core/worldLine'
import { buildActionPreview } from './preview'

const registry = createObjectRegistry({
  wall: {
    kind: 'wall',
    components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
    render: {},
  },
  box: {
    kind: 'box',
    components: [
      { kind: 'BlocksMovement' },
      { kind: 'Pushable' },
      { kind: 'Pullable' },
      { kind: 'TimePersistent' },
    ],
    render: {},
  },
})

function resolve(instance: ObjectInstance) {
  const resolved = resolveObjectInstance(registry, instance)
  expect(resolved.ok).toBe(true)
  if (!resolved.ok) {
    throw new Error('resolution failed in test fixture')
  }

  return resolved.value
}

describe('buildActionPreview', () => {
  it('returns blocked move preview when target has blocker', () => {
    const cube = createTimeCube(8, 8, 6)
    const placed = placeObjects(cube, [resolve({ id: 'wall.1', archetype: 'wall', position: { x: 3, y: 2, t: 0 } })])
    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    const preview = buildActionPreview({
      cube: placed.value,
      worldLine: createWorldLine({ x: 2, y: 2, t: 0 }),
      boardWidth: 8,
      boardHeight: 8,
      timeDepth: 6,
      intent: { mode: 'Move', direction: 'east' },
      maxPushChain: 4,
      allowPull: true,
    })

    expect(preview).not.toBeNull()
    expect(preview?.blocked).toBe(true)
    expect(preview?.reason).toBe('Blocked by object')
  })

  it('returns non-blocked push preview when one pushable object can shift', () => {
    const cube = createTimeCube(8, 8, 6)
    const placed = placeObjects(cube, [resolve({ id: 'box.1', archetype: 'box', position: { x: 3, y: 2, t: 0 } })])
    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    const preview = buildActionPreview({
      cube: placed.value,
      worldLine: createWorldLine({ x: 2, y: 2, t: 0 }),
      boardWidth: 8,
      boardHeight: 8,
      timeDepth: 6,
      intent: { mode: 'Push', direction: 'east' },
      maxPushChain: 4,
      allowPull: true,
    })

    expect(preview).not.toBeNull()
    expect(preview?.blocked).toBe(false)
  })

  it('returns blocked pull preview when nothing pullable is behind', () => {
    const cube = createTimeCube(8, 8, 6)

    const preview = buildActionPreview({
      cube,
      worldLine: createWorldLine({ x: 2, y: 2, t: 0 }),
      boardWidth: 8,
      boardHeight: 8,
      timeDepth: 6,
      intent: { mode: 'Pull', direction: 'east' },
      maxPushChain: 4,
      allowPull: true,
    })

    expect(preview).not.toBeNull()
    expect(preview?.blocked).toBe(true)
    expect(preview?.reason).toBe('Nothing to pull')
  })

  it('returns blocked preview when next (x,y,t) self-intersects world line', () => {
    const start = createWorldLine({ x: 2, y: 2, t: 0 })
    const r1 = extendViaRift(start, { x: 3, y: 2, t: 3 })
    expect(r1.ok).toBe(true)
    if (!r1.ok) {
      return
    }

    const r2 = extendViaRift(r1.value, { x: 2, y: 2, t: 2 })
    expect(r2.ok).toBe(true)
    if (!r2.ok) {
      return
    }

    const preview = buildActionPreview({
      cube: createTimeCube(8, 8, 6),
      worldLine: r2.value,
      boardWidth: 8,
      boardHeight: 8,
      timeDepth: 6,
      intent: { mode: 'Move', direction: 'east' },
      maxPushChain: 4,
      allowPull: true,
    })

    expect(preview?.blocked).toBe(true)
    expect(preview?.reason).toBe('Blocked by self-intersection')
  })

  it('returns blocked pull preview when pull is disabled', () => {
    const preview = buildActionPreview({
      cube: createTimeCube(8, 8, 6),
      worldLine: createWorldLine({ x: 2, y: 2, t: 0 }),
      boardWidth: 8,
      boardHeight: 8,
      timeDepth: 6,
      intent: { mode: 'Pull', direction: 'east' },
      maxPushChain: 4,
      allowPull: false,
    })

    expect(preview?.blocked).toBe(true)
    expect(preview?.reason).toBe('Pull is disabled')
  })
})
