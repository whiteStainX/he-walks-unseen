import { describe, expect, it } from 'vitest'

import { generateMapPack } from './index'

describe('generateMapPack', () => {
  it('generates deterministic content for same seed and request', () => {
    const request = {
      seed: 'alpha',
      board: { width: 12, height: 12, timeDepth: 16 },
      difficulty: 'normal' as const,
      maxAttempts: 4,
    }
    const first = generateMapPack(request)
    const second = generateMapPack(request)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)

    if (!first.ok || !second.ok) {
      return
    }

    expect(first.value.content).toEqual(second.value.content)
    expect(first.value.metadata).toEqual(second.value.metadata)
  })

  it('returns validated, solvable content', () => {
    const result = generateMapPack({
      seed: 'solvable-1',
      board: { width: 12, height: 12, timeDepth: 16 },
      difficulty: 'easy',
      maxAttempts: 5,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.metadata.solver.solved).toBe(true)
    expect(result.value.metadata.solver.shortestPathLength).not.toBeNull()
    expect(result.value.metadata.qualityScore).toBeGreaterThanOrEqual(35)
    expect(result.value.content.level.instances.some((entry) => entry.archetype === 'exit')).toBe(true)
  })

  it('fails when quality threshold is impossible', () => {
    const result = generateMapPack({
      seed: 'reject',
      board: { width: 10, height: 10, timeDepth: 12 },
      maxAttempts: 2,
      qualityThreshold: 999,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('GenerationFailed')
    }
  })

  it('generates rift anchors when profile allows rifts', () => {
    const result = generateMapPack({
      seed: 'with-rifts',
      board: { width: 12, height: 12, timeDepth: 16 },
      profile: {
        schemaVersion: 1,
        id: 'rift-profile',
        boardMin: { width: 6, height: 6, timeDepth: 4 },
        maxAttempts: 4,
        defaultDifficulty: 'normal',
        startInset: 1,
        exitInset: 1,
        defaultFeatureFlags: { allowPull: true, allowPushChains: true, allowFutureRifts: false },
        interaction: { maxPushChainWhenEnabled: 4, maxPushChainWhenDisabled: 1 },
        rift: { defaultDelta: 3, baseEnergyCost: 0 },
        detection: { enabled: false, delayTurns: 1 },
        difficultyProfiles: {
          easy: {
            budgets: { maxWalls: 6, maxDynamicObjects: 1, maxEnemies: 1, maxRifts: 0 },
            minWallRatio: 0.5,
            detectionRange: 1,
            qualityThreshold: 20,
          },
          normal: {
            budgets: { maxWalls: 10, maxDynamicObjects: 2, maxEnemies: 2, maxRifts: 2 },
            minWallRatio: 0.5,
            detectionRange: 2,
            qualityThreshold: 30,
          },
          hard: {
            budgets: { maxWalls: 12, maxDynamicObjects: 3, maxEnemies: 3, maxRifts: 4 },
            minWallRatio: 0.5,
            detectionRange: 3,
            qualityThreshold: 40,
          },
        },
        theme: {
          id: 'generated-mono',
          iconPackId: 'default-mono',
          cssVars: {
            '--ink': '#111111',
            '--paper': '#ffffff',
            '--panel': '#ffffff',
            '--accent': '#111111',
            '--grid': '#111111',
            '--border': '#111111',
            '--muted': '#666666',
          },
        },
      },
      difficulty: 'normal',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const riftArchetypeKeys = Object.entries(result.value.content.level.archetypes)
      .filter(([, archetype]) => archetype.components.some((component) => component.kind === 'Rift'))
      .map(([key]) => key)
    const riftInstances = result.value.content.level.instances.filter((instance) =>
      riftArchetypeKeys.includes(instance.archetype),
    )

    expect(riftInstances.length).toBeGreaterThanOrEqual(2)
  })

  it('uses profile board minima when validating requests', () => {
    const result = generateMapPack({
      seed: 'profile-min',
      board: { width: 8, height: 8, timeDepth: 8 },
      profile: {
        schemaVersion: 1,
        id: 'strict-profile',
        boardMin: { width: 10, height: 10, timeDepth: 6 },
        maxAttempts: 2,
        defaultDifficulty: 'normal',
        startInset: 1,
        exitInset: 1,
        defaultFeatureFlags: { allowPull: true, allowPushChains: true, allowFutureRifts: false },
        interaction: { maxPushChainWhenEnabled: 4, maxPushChainWhenDisabled: 1 },
        rift: { defaultDelta: 3, baseEnergyCost: 0 },
        detection: { enabled: false, delayTurns: 1 },
        difficultyProfiles: {
          easy: {
            budgets: { maxWalls: 6, maxDynamicObjects: 1, maxEnemies: 1, maxRifts: 0 },
            minWallRatio: 0.5,
            detectionRange: 1,
            qualityThreshold: 20,
          },
          normal: {
            budgets: { maxWalls: 10, maxDynamicObjects: 2, maxEnemies: 2, maxRifts: 0 },
            minWallRatio: 0.5,
            detectionRange: 2,
            qualityThreshold: 30,
          },
          hard: {
            budgets: { maxWalls: 12, maxDynamicObjects: 3, maxEnemies: 3, maxRifts: 0 },
            minWallRatio: 0.5,
            detectionRange: 3,
            qualityThreshold: 40,
          },
        },
        theme: {
          id: 'generated-mono',
          iconPackId: 'default-mono',
          cssVars: {
            '--ink': '#111111',
            '--paper': '#ffffff',
            '--panel': '#ffffff',
            '--accent': '#111111',
            '--grid': '#111111',
            '--border': '#111111',
            '--muted': '#666666',
          },
        },
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('InvalidGenerationRequest')
    }
  })
})
