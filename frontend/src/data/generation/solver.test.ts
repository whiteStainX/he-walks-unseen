import { describe, expect, it } from 'vitest'

import type { ContentPack } from '../contracts'
import { evaluateSolvabilityV1 } from './solver'

function basePack(): ContentPack {
  return {
    level: {
      schemaVersion: 1,
      meta: { id: 'solver-test', name: 'solver-test' },
      map: { width: 6, height: 6, timeDepth: 8, start: { x: 1, y: 1, t: 0 } },
      archetypes: {
        wall: {
          kind: 'wall',
          components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
          render: {},
        },
        exit: {
          kind: 'exit',
          components: [{ kind: 'Exit' }, { kind: 'TimePersistent' }],
          render: {},
        },
      },
      instances: [{ id: 'exit.main', archetype: 'exit', position: { x: 4, y: 4, t: 0 } }],
    },
    behavior: {
      schemaVersion: 1,
      policies: {},
      assignments: {},
    },
    theme: {
      schemaVersion: 1,
      id: 'mono',
      iconPackId: 'default-mono',
      cssVars: { '--ink': '#111111' },
    },
    rules: {
      schemaVersion: 1,
      rift: { defaultDelta: 3, baseEnergyCost: 0 },
      interaction: { maxPushChain: 4, allowPull: true },
      detection: { enabled: false, delayTurns: 1, maxDistance: 2 },
    },
  }
}

describe('evaluateSolvabilityV1', () => {
  it('accepts reachable exit layouts', () => {
    const report = evaluateSolvabilityV1(basePack())

    expect(report.solved).toBe(true)
    expect(report.shortestPathLength).toBeGreaterThan(0)
  })

  it('rejects unreachable exit layouts', () => {
    const pack = basePack()
    const walls = [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]

    for (let index = 0; index < walls.length; index += 1) {
      const wall = walls[index]
      pack.level.instances.push({
        id: `wall.${index}`,
        archetype: 'wall',
        position: { x: wall.x, y: wall.y, t: 0 },
      })
    }

    const report = evaluateSolvabilityV1(pack)

    expect(report.solved).toBe(false)
    expect(report.shortestPathLength).toBeNull()
  })
})
