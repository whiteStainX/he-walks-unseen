import { describe, expect, it } from 'vitest'

import {
  behaviorToPatrolComponent,
  resolveBehaviorPolicy,
  resolveBehaviorPosition,
  resolveEnemyDetectionConfig,
} from './behaviorResolver'

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

  it('resolves behavior policy by assignment', () => {
    const policy = resolveBehaviorPolicy(
      {
        policies: {
          static_default: { kind: 'Static' },
        },
        assignments: {
          'enemy.alpha': 'static_default',
        },
      },
      'enemy.alpha',
    )

    expect(policy).toEqual({ kind: 'Static' })
    expect(resolveBehaviorPolicy({ policies: {}, assignments: {} }, 'enemy.alpha')).toBeNull()
  })

  it('resolves enemy detection config with precedence', () => {
    const rulesDefault = { enabled: true, delayTurns: 1, maxDistance: 2 }
    const behavior = {
      detectionProfiles: {
        short: { enabled: true, delayTurns: 1, maxDistance: 2 },
        long: { enabled: true, delayTurns: 1, maxDistance: 5 },
      },
      defaultDetectionProfile: 'short',
      detectionAssignments: { 'enemy.beta': 'long' },
    }

    expect(
      resolveEnemyDetectionConfig({
        behavior,
        enemyId: 'enemy.beta',
        rulesDefault,
      }),
    ).toEqual({ enabled: true, delayTurns: 1, maxDistance: 5 })

    expect(
      resolveEnemyDetectionConfig({
        behavior,
        enemyId: 'enemy.alpha',
        rulesDefault,
      }),
    ).toEqual({ enabled: true, delayTurns: 1, maxDistance: 2 })

    expect(
      resolveEnemyDetectionConfig({
        behavior: {},
        enemyId: 'enemy.alpha',
        rulesDefault,
      }),
    ).toEqual(rulesDefault)
  })
})
