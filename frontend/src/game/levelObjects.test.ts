import { describe, expect, it } from 'vitest'

import { objectsAtTime } from '../core/timeCube'
import type { LevelObjectsConfig } from '../core/objects'
import { bootstrapLevelObjects } from './levelObjects'

function enemyPositionByTime(
  config: LevelObjectsConfig,
  enemyId: string,
  t: number,
): { x: number; y: number; t: number } | null {
  const bootstrapped = bootstrapLevelObjects(8, 8, 6, config)

  if (!bootstrapped.ok) {
    return null
  }

  const enemy = objectsAtTime(bootstrapped.value.cube, t).find((entry) => entry.id === enemyId)

  return enemy ? enemy.position : null
}

describe('bootstrapLevelObjects enemy motion projection', () => {
  it('projects Patrol loop paths into slice occupancy', () => {
    const config: LevelObjectsConfig = {
      archetypes: {
        enemyLoop: {
          kind: 'enemy',
          components: [
            { kind: 'BlocksMovement' },
            { kind: 'TimePersistent' },
            { kind: 'Patrol', path: [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }], loops: true },
          ],
          render: {},
        },
      },
      instances: [{ id: 'enemy.loop', archetype: 'enemyLoop', position: { x: 1, y: 1, t: 0 } }],
    }

    expect(enemyPositionByTime(config, 'enemy.loop', 0)).toEqual({ x: 1, y: 1, t: 0 })
    expect(enemyPositionByTime(config, 'enemy.loop', 1)).toEqual({ x: 2, y: 1, t: 1 })
    expect(enemyPositionByTime(config, 'enemy.loop', 2)).toEqual({ x: 2, y: 2, t: 2 })
    expect(enemyPositionByTime(config, 'enemy.loop', 3)).toEqual({ x: 1, y: 1, t: 3 })
  })

  it('projects Patrol ping-pong paths into slice occupancy', () => {
    const config: LevelObjectsConfig = {
      archetypes: {
        enemyPing: {
          kind: 'enemy',
          components: [
            { kind: 'BlocksMovement' },
            { kind: 'TimePersistent' },
            { kind: 'Patrol', path: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }], loops: false },
          ],
          render: {},
        },
      },
      instances: [{ id: 'enemy.ping', archetype: 'enemyPing', position: { x: 4, y: 1, t: 0 } }],
    }

    expect(enemyPositionByTime(config, 'enemy.ping', 0)).toEqual({ x: 4, y: 1, t: 0 })
    expect(enemyPositionByTime(config, 'enemy.ping', 1)).toEqual({ x: 4, y: 2, t: 1 })
    expect(enemyPositionByTime(config, 'enemy.ping', 2)).toEqual({ x: 4, y: 3, t: 2 })
    expect(enemyPositionByTime(config, 'enemy.ping', 3)).toEqual({ x: 4, y: 2, t: 3 })
    expect(enemyPositionByTime(config, 'enemy.ping', 4)).toEqual({ x: 4, y: 1, t: 4 })
  })
})
