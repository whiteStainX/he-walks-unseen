import { describe, expect, it } from 'vitest'

import { behaviorToPatrolComponent, resolveBehaviorPosition } from './behaviorResolver'

describe('behaviorResolver', () => {
  it('resolves static policy to origin', () => {
    const position = resolveBehaviorPosition({
      policy: { kind: 'Static' },
      origin: { x: 2, y: 2 },
      time: 8,
    })

    expect(position).toEqual({ x: 2, y: 2 })
  })

  it('resolves patrol loop by modulo index', () => {
    const position = resolveBehaviorPosition({
      policy: {
        kind: 'PatrolLoop',
        path: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 2, y: 2 },
        ],
      },
      origin: { x: 0, y: 0 },
      time: 4,
    })

    expect(position).toEqual({ x: 2, y: 1 })
  })

  it('resolves ping-pong path correctly', () => {
    const positions = [0, 1, 2, 3, 4, 5, 6].map((time) =>
      resolveBehaviorPosition({
        policy: {
          kind: 'PatrolPingPong',
          path: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 2, y: 0 },
          ],
        },
        origin: { x: 9, y: 9 },
        time,
      }),
    )

    expect(positions).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ])
  })

  it('maps patrol policies to patrol components', () => {
    expect(behaviorToPatrolComponent({ kind: 'Static' })).toBeNull()
    expect(
      behaviorToPatrolComponent({ kind: 'PatrolLoop', path: [{ x: 1, y: 1 }] }),
    ).toEqual({ kind: 'Patrol', path: [{ x: 1, y: 1 }], loops: true })
    expect(
      behaviorToPatrolComponent({ kind: 'PatrolPingPong', path: [{ x: 1, y: 1 }] }),
    ).toEqual({ kind: 'Patrol', path: [{ x: 1, y: 1 }], loops: false })
  })
})
