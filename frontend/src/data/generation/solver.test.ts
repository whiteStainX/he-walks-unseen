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

  it('uses tunnel rift transitions during search', () => {
    const pack = basePack()
    pack.level.instances = [
      { id: 'exit.main', archetype: 'exit', position: { x: 4, y: 4, t: 0 } },
      { id: 'wall.0', archetype: 'wall', position: { x: 2, y: 1, t: 0 } },
      { id: 'wall.1', archetype: 'wall', position: { x: 1, y: 2, t: 0 } },
      { id: 'wall.2', archetype: 'wall', position: { x: 0, y: 1, t: 0 } },
      { id: 'wall.3', archetype: 'wall', position: { x: 1, y: 0, t: 0 } },
      { id: 'rift.entry', archetype: 'rift_entry', position: { x: 1, y: 1, t: 0 } },
      { id: 'rift.exit', archetype: 'rift_exit', position: { x: 4, y: 3, t: 0 } },
    ]
    pack.level.archetypes.rift_entry = {
      kind: 'rift',
      components: [
        { kind: 'TimePersistent' },
        { kind: 'Rift', target: { x: 4, y: 3, t: 2 }, bidirectional: true },
      ],
      render: {},
    }
    pack.level.archetypes.rift_exit = {
      kind: 'rift',
      components: [
        { kind: 'TimePersistent' },
        { kind: 'Rift', target: { x: 1, y: 1, t: 0 }, bidirectional: true },
      ],
      render: {},
    }

    const report = evaluateSolvabilityV1(pack, { maxDepth: 10, includeRift: true })

    expect(report.solved).toBe(true)
    expect(report.shortestPathLength).not.toBeNull()
  })

  it('supports push interaction in solvability search', () => {
    const pack = basePack()
    pack.level.instances = [
      { id: 'exit.main', archetype: 'exit', position: { x: 2, y: 1, t: 0 } },
      { id: 'box.0', archetype: 'box', position: { x: 2, y: 1, t: 0 } },
    ]
    pack.level.archetypes.box = {
      kind: 'box',
      components: [
        { kind: 'BlocksMovement' },
        { kind: 'Pushable' },
        { kind: 'Pullable' },
        { kind: 'TimePersistent' },
      ],
      render: {},
    }

    const report = evaluateSolvabilityV1(pack, { maxDepth: 6, includePushPull: true })

    expect(report.solved).toBe(true)
    expect(report.shortestPathLength).toBe(1)
  })
})
