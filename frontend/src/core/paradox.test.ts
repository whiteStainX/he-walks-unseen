import { describe, expect, it } from 'vitest'

import type { CausalAnchor } from './paradox'
import { evaluateParadoxV1 } from './paradox'
import type { ResolvedObjectInstance } from './objects'
import { createTimeCube, placeObjects } from './timeCube'
import { createWorldLine } from './worldLine'

function crateAt(x: number, y: number, t: number): ResolvedObjectInstance {
  return {
    id: 'crate.main',
    archetypeKey: 'crate',
    position: { x, y, t },
    archetype: {
      kind: 'crate',
      components: [],
      render: {},
    },
  }
}

describe('evaluateParadoxV1', () => {
  it('returns no paradox when all anchors are satisfied', () => {
    const cube = createTimeCube(8, 8, 6)
    const placed = placeObjects(cube, [crateAt(3, 3, 1)])
    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    const worldLine = createWorldLine({ x: 2, y: 2, t: 0 })
    const anchors: CausalAnchor[] = [
      {
        id: 'a.player',
        requirement: {
          kind: 'PlayerAt',
          position: { x: 2, y: 2, t: 0 },
          sourceTurn: 0,
        },
      },
      {
        id: 'a.object',
        requirement: {
          kind: 'ObjectAt',
          objectId: 'crate.main',
          position: { x: 3, y: 3, t: 1 },
          sourceTurn: 1,
        },
      },
    ]

    const report = evaluateParadoxV1({
      cube: placed.value,
      worldLine,
      anchors,
      checkedFromTime: 0,
      config: { enabled: true },
    })

    expect(report.paradox).toBe(false)
    expect(report.violations).toHaveLength(0)
    expect(report.earliestSourceTurn).toBeNull()
  })

  it('detects PlayerMissing when a player anchor cell is not in world-line history', () => {
    const worldLine = createWorldLine({ x: 2, y: 2, t: 0 })
    const report = evaluateParadoxV1({
      cube: createTimeCube(8, 8, 6),
      worldLine,
      anchors: [
        {
          id: 'missing.player',
          requirement: {
            kind: 'PlayerAt',
            position: { x: 3, y: 2, t: 1 },
            sourceTurn: 4,
          },
        },
      ],
      checkedFromTime: 0,
      config: { enabled: true },
    })

    expect(report.paradox).toBe(true)
    expect(report.violations).toEqual([
      {
        anchorId: 'missing.player',
        requirement: {
          kind: 'PlayerAt',
          position: { x: 3, y: 2, t: 1 },
          sourceTurn: 4,
        },
        reason: 'PlayerMissing',
      },
    ])
    expect(report.earliestSourceTurn).toBe(4)
  })

  it('detects ObjectMissing when anchor object id does not exist', () => {
    const report = evaluateParadoxV1({
      cube: createTimeCube(8, 8, 6),
      worldLine: createWorldLine({ x: 2, y: 2, t: 0 }),
      anchors: [
        {
          id: 'missing.object',
          requirement: {
            kind: 'ObjectAt',
            objectId: 'ghost.object',
            position: { x: 4, y: 4, t: 2 },
            sourceTurn: 2,
          },
        },
      ],
      checkedFromTime: 0,
      config: { enabled: true },
    })

    expect(report.paradox).toBe(true)
    expect(report.violations[0]?.reason).toBe('ObjectMissing')
  })

  it('detects ObjectMismatch when object exists but is not at required position', () => {
    const cube = createTimeCube(8, 8, 6)
    const placed = placeObjects(cube, [crateAt(1, 1, 2)])
    expect(placed.ok).toBe(true)
    if (!placed.ok) {
      return
    }

    const report = evaluateParadoxV1({
      cube: placed.value,
      worldLine: createWorldLine({ x: 2, y: 2, t: 0 }),
      anchors: [
        {
          id: 'mismatch.object',
          requirement: {
            kind: 'ObjectAt',
            objectId: 'crate.main',
            position: { x: 2, y: 1, t: 2 },
            sourceTurn: 5,
          },
        },
      ],
      checkedFromTime: 0,
      config: { enabled: true },
    })

    expect(report.paradox).toBe(true)
    expect(report.violations[0]?.reason).toBe('ObjectMismatch')
    expect(report.earliestSourceTurn).toBe(5)
  })

  it('respects checkedFromTime and only evaluates anchors in the affected window', () => {
    const report = evaluateParadoxV1({
      cube: createTimeCube(8, 8, 6),
      worldLine: createWorldLine({ x: 2, y: 2, t: 0 }),
      anchors: [
        {
          id: 'old.anchor',
          requirement: {
            kind: 'PlayerAt',
            position: { x: 4, y: 4, t: 1 },
            sourceTurn: 1,
          },
        },
        {
          id: 'new.anchor',
          requirement: {
            kind: 'PlayerAt',
            position: { x: 5, y: 5, t: 4 },
            sourceTurn: 4,
          },
        },
      ],
      checkedFromTime: 3,
      config: { enabled: true },
    })

    expect(report.paradox).toBe(true)
    expect(report.violations).toHaveLength(1)
    expect(report.violations[0]?.anchorId).toBe('new.anchor')
    expect(report.earliestSourceTurn).toBe(4)
  })

  it('returns no violations when disabled', () => {
    const report = evaluateParadoxV1({
      cube: createTimeCube(8, 8, 6),
      worldLine: createWorldLine({ x: 2, y: 2, t: 0 }),
      anchors: [
        {
          id: 'disabled.anchor',
          requirement: {
            kind: 'PlayerAt',
            position: { x: 99, y: 99, t: 99 },
            sourceTurn: 99,
          },
        },
      ],
      checkedFromTime: 0,
      config: { enabled: false },
    })

    expect(report.paradox).toBe(false)
    expect(report.violations).toHaveLength(0)
    expect(report.earliestSourceTurn).toBeNull()
  })
})
