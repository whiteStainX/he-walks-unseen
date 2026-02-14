import { describe, expect, it } from 'vitest'

import { validateContentPack } from './validate'

function minimalValidInputs() {
  return {
    level: {
      schemaVersion: 1,
      meta: { id: 'test', name: 'test' },
      map: { width: 4, height: 4, timeDepth: 4, start: { x: 0, y: 0, t: 0 } },
      archetypes: {
        wall: {
          kind: 'wall',
          components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
          render: {},
        },
      },
      instances: [{ id: 'wall.1', archetype: 'wall', position: { x: 1, y: 1, t: 0 } }],
    },
    behavior: {
      schemaVersion: 1,
      policies: {
        static_default: { kind: 'Static' },
      },
      assignments: {
        'wall.1': 'static_default',
      },
    },
    theme: {
      schemaVersion: 1,
      id: 'mono',
      cssVars: { '--ink': '#111111' },
    },
    rules: {
      schemaVersion: 1,
      rift: { defaultDelta: 3, baseEnergyCost: 0 },
      interaction: { maxPushChain: 4, allowPull: true },
      detection: { enabled: true, delayTurns: 1, maxDistance: 2 },
    },
  } as {
    level: unknown
    behavior: unknown
    theme: unknown
    rules: unknown
  }
}

describe('validateContentPack', () => {
  it('validates a minimal valid pack', () => {
    const result = validateContentPack(minimalValidInputs())

    expect(result.ok).toBe(true)
  })

  it('rejects unknown archetype references', () => {
    const input = minimalValidInputs()
    const level = input.level as {
      instances: Array<{ archetype: string }>
    }
    level.instances[0].archetype = 'missing'

    const result = validateContentPack(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('UnknownArchetypeReference')
    }
  })

  it('rejects unknown behavior assignment instances', () => {
    const input = minimalValidInputs()
    const behavior = input.behavior as { assignments: Record<string, string> }
    behavior.assignments = { ghost: 'static_default' }

    const result = validateContentPack(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('UnknownBehaviorAssignmentInstance')
    }
  })

  it('rejects unsupported scripted timeline policy', () => {
    const input = minimalValidInputs()
    const behavior = input.behavior as {
      policies: Record<string, unknown>
      assignments: Record<string, string>
    }
    behavior.policies = {
      scripted: { kind: 'ScriptedTimeline', points: [{ x: 0, y: 0, t: 0 }] },
    }
    behavior.assignments = { 'wall.1': 'scripted' }

    const result = validateContentPack(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('UnsupportedBehaviorPolicy')
    }
  })
})
