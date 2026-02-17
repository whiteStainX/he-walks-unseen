import { describe, expect, it } from 'vitest'

import { loadDefaultGenerationProfile, validateGenerationProfile } from './profile'

describe('generation profile', () => {
  it('loads default generation profile', () => {
    const loaded = loadDefaultGenerationProfile()

    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }

    expect(loaded.value.id).toBe('default-v1')
    expect(loaded.value.defaultDifficulty).toBe('normal')
    expect(loaded.value.difficultyProfiles.normal.budgets.maxEnemies).toBeGreaterThan(0)
    expect(loaded.value.solverGate.maxNodes).toBeGreaterThan(0)
    expect(loaded.value.qualityWeights.baseScore).toBeGreaterThanOrEqual(0)
    expect(loaded.value.strategies.patrolBehavior).toBe('mixed')
  })

  it('rejects invalid profile shape', () => {
    const loaded = validateGenerationProfile({
      schemaVersion: 1,
      id: 'bad',
    })

    expect(loaded.ok).toBe(false)
    if (!loaded.ok) {
      expect(loaded.error.kind).toBe('InvalidGenerationProfile')
    }
  })

  it('rejects invalid strategy values', () => {
    const loaded = validateGenerationProfile({
      schemaVersion: 1,
      id: 'bad-strategy',
      boardMin: { width: 6, height: 6, timeDepth: 4 },
      maxAttempts: 2,
      defaultDifficulty: 'normal',
      startInset: 1,
      exitInset: 1,
      defaultFeatureFlags: { allowPull: true, allowPushChains: true, allowFutureRifts: false },
      interaction: { maxPushChainWhenEnabled: 4, maxPushChainWhenDisabled: 1 },
      rift: { defaultDelta: 3, baseEnergyCost: 0 },
      detection: { enabled: false, delayTurns: 1 },
      solverGate: { maxDepthCap: 16, maxNodes: 1500, includePushPull: false, includeRift: false },
      qualityWeights: {
        baseScore: 20,
        pathCap: 30,
        enemyWeight: 8,
        enemyCap: 24,
        wallDivisor: 3,
        wallCap: 20,
        boxWeight: 6,
        boxCap: 18,
      },
      strategies: {
        wallTarget: 'bad',
        patrolPathOrder: 'clockwise',
        patrolBehavior: 'mixed',
      },
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
    })

    expect(loaded.ok).toBe(false)
    if (!loaded.ok) {
      expect(loaded.error.kind).toBe('InvalidGenerationProfile')
    }
  })
})
