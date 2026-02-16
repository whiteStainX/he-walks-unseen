import { describe, expect, it } from 'vitest'

import { createWorldLine, extendNormal } from './worldLine'
import { createTimeCube, placeObjects } from './timeCube'
import { evaluateDetectionV1 } from './detection'
import type { ResolvedObjectInstance } from './objects'

function enemyObject(id: string, x: number, y: number): ResolvedObjectInstance {
  return {
    id,
    archetypeKey: 'enemy',
    position: { x, y, t: 0 },
    archetype: {
      kind: 'enemy',
      components: [
        { kind: 'BlocksMovement' },
        { kind: 'TimePersistent' },
        { kind: 'Patrol', path: [{ x, y }], loops: true },
      ],
      render: {},
    },
  }
}

describe('evaluateDetectionV1', () => {
  it('returns no detection when disabled', () => {
    const cube = createTimeCube(8, 8, 6)
    const placed = placeObjects(cube, [enemyObject('enemy.alpha', 2, 2)])

    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    const worldLine = createWorldLine({ x: 2, y: 3, t: 0 })

    const report = evaluateDetectionV1({
      cube: placed.value,
      worldLine,
      currentTime: 1,
      config: { enabled: false, delayTurns: 1, maxDistance: 3 },
    })

    expect(report.detected).toBe(false)
    expect(report.events).toHaveLength(0)
  })

  it('detects when delay and range conditions match', () => {
    const cube = createTimeCube(8, 8, 6)
    const placed = placeObjects(cube, [enemyObject('enemy.alpha', 2, 2)])

    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    const worldLine = createWorldLine({ x: 2, y: 3, t: 0 })

    const report = evaluateDetectionV1({
      cube: placed.value,
      worldLine,
      currentTime: 1,
      config: { enabled: true, delayTurns: 1, maxDistance: 2 },
    })

    expect(report.detected).toBe(true)
    expect(report.events).toHaveLength(1)
    expect(report.events[0]).toEqual({
      enemyId: 'enemy.alpha',
      enemyPosition: { x: 2, y: 2, t: 1 },
      observedPlayer: { x: 2, y: 3, t: 0 },
      observedTurn: 0,
    })
  })

  it('does not detect when observed player is out of range', () => {
    const cube = createTimeCube(8, 8, 6)
    const placed = placeObjects(cube, [enemyObject('enemy.alpha', 0, 0)])

    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    const worldLine = createWorldLine({ x: 5, y: 5, t: 0 })

    const report = evaluateDetectionV1({
      cube: placed.value,
      worldLine,
      currentTime: 1,
      config: { enabled: true, delayTurns: 1, maxDistance: 2 },
    })

    expect(report.detected).toBe(false)
    expect(report.events).toHaveLength(0)
  })

  it('does not detect when delay targets a time slice not visited by player', () => {
    const cube = createTimeCube(8, 8, 6)
    const placed = placeObjects(cube, [enemyObject('enemy.alpha', 2, 2)])

    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    const worldLineStart = createWorldLine({ x: 2, y: 3, t: 0 })
    const worldLineNext = extendNormal(worldLineStart, { x: 3, y: 3, t: 1 })

    expect(worldLineNext.ok).toBe(true)
    if (!worldLineNext.ok) {
      return
    }

    const report = evaluateDetectionV1({
      cube: placed.value,
      worldLine: worldLineNext.value,
      currentTime: 4,
      config: { enabled: true, delayTurns: 2, maxDistance: 2 },
    })

    expect(report.detected).toBe(false)
    expect(report.events).toHaveLength(0)
  })

  it('supports per-enemy detection overrides with global fallback', () => {
    const cube = createTimeCube(8, 8, 6)
    const placed = placeObjects(cube, [
      enemyObject('enemy.alpha', 0, 0),
      enemyObject('enemy.beta', 2, 4),
    ])

    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    const worldLine = createWorldLine({ x: 2, y: 2, t: 0 })

    const report = evaluateDetectionV1({
      cube: placed.value,
      worldLine,
      currentTime: 1,
      config: { enabled: false, delayTurns: 1, maxDistance: 0 },
      configByEnemyId: {
        'enemy.alpha': { enabled: true, delayTurns: 1, maxDistance: 1 },
        'enemy.beta': { enabled: true, delayTurns: 1, maxDistance: 3 },
      },
    })

    expect(report.detected).toBe(true)
    expect(report.events).toHaveLength(1)
    expect(report.events[0]?.enemyId).toBe('enemy.beta')
  })
})
