import { describe, expect, it } from 'vitest'

import { validateContentPack, validateIconPackConfig } from './validate'

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
      iconPackId: 'default-mono',
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

  it('rejects out-of-bounds behavior path points', () => {
    const input = minimalValidInputs()
    const behavior = input.behavior as {
      policies: Record<string, unknown>
      assignments: Record<string, string>
    }
    behavior.policies = {
      patrol_bad: { kind: 'PatrolLoop', path: [{ x: 99, y: 0 }] },
    }
    behavior.assignments = { 'wall.1': 'patrol_bad' }

    const result = validateContentPack(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('InvalidBehaviorPathPoint')
    }
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

  it('rejects unknown detection profile assignment references', () => {
    const input = minimalValidInputs()
    const behavior = input.behavior as {
      detectionProfiles?: Record<string, unknown>
      detectionAssignments?: Record<string, string>
    }
    behavior.detectionProfiles = {
      close: { enabled: true, delayTurns: 1, maxDistance: 2 },
    }
    behavior.detectionAssignments = {
      'wall.1': 'missing_profile',
    }

    const result = validateContentPack(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('UnknownDetectionProfileReference')
    }
  })

  it('rejects unknown default detection profile references', () => {
    const input = minimalValidInputs()
    const behavior = input.behavior as {
      detectionProfiles?: Record<string, unknown>
      defaultDetectionProfile?: string
    }
    behavior.detectionProfiles = {
      close: { enabled: true, delayTurns: 1, maxDistance: 2 },
    }
    behavior.defaultDetectionProfile = 'missing_default'

    const result = validateContentPack(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('UnknownDetectionProfileReference')
    }
  })

  it('rejects invalid detection profile shape', () => {
    const input = minimalValidInputs()
    const behavior = input.behavior as { detectionProfiles?: Record<string, unknown> }
    behavior.detectionProfiles = {
      invalid: { enabled: true, delayTurns: 0, maxDistance: -1 },
    }

    const result = validateContentPack(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('InvalidDetectionProfile')
    }
  })

  it('rejects theme without icon pack id', () => {
    const input = minimalValidInputs()
    const theme = input.theme as { iconPackId?: string }
    delete theme.iconPackId

    const result = validateContentPack(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('MissingIconPackId')
    }
  })
})

describe('validateIconPackConfig', () => {
  it('accepts a valid icon pack', () => {
    const validated = validateIconPackConfig({
      schemaVersion: 1,
      id: 'default-mono',
      slots: {
        player: { svg: '/data/icons/default/player.svg' },
      },
    })

    expect(validated.ok).toBe(true)
  })

  it('rejects icon pack without slots', () => {
    const validated = validateIconPackConfig({
      schemaVersion: 1,
      id: 'default-mono',
      slots: {},
    })

    expect(validated.ok).toBe(false)
    if (!validated.ok) {
      expect(validated.error.kind).toBe('InvalidShape')
    }
  })
})
