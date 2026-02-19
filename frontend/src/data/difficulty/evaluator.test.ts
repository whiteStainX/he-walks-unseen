import { describe, expect, it } from 'vitest'

import type { ContentPack, DifficultyModelConfig } from '../contracts'
import { evaluateDifficultyV1, suggestDifficultyTier } from './evaluator'

function modelConfig(): DifficultyModelConfig {
  return {
    schemaVersion: 1,
    modelVersion: 'v1',
    normalization: {
      shortestSolutionLength: { min: 4, max: 60 },
      visitedNodes: { min: 16, max: 1200 },
      deadEndRatio: { min: 0.05, max: 0.75 },
      requiredRiftCount: { min: 0, max: 12 },
      requiredPushPullCount: { min: 0, max: 24 },
      enemyExposureEvents: { min: 0, max: 30 },
      paradoxFragilityCount: { min: 0, max: 10 },
      timeDepth: { min: 8, max: 64 },
    },
    scoreWeights: {
      path: 0.2,
      branch: 0.2,
      temporal: 0.15,
      detection: 0.2,
      interaction: 0.15,
      paradox: 0.1,
    },
    dimensionWeights: {
      branchVisitedNodes: 0.7,
      branchDeadEndRatio: 0.3,
      temporalRiftCount: 0.6,
      temporalTimeDepth: 0.4,
    },
    tierBounds: {
      easy: { min: 0, max: 24 },
      normal: { min: 25, max: 49 },
      hard: { min: 50, max: 74 },
      expert: { min: 75, max: 100 },
    },
    rampPolicy: {
      allowCooldownInMain: true,
      cooldownMaxTierDrop: 1,
      allowConsecutiveCooldown: false,
      requireHardBeforeExpert: true,
    },
    overridePolicy: {
      noteRequiredMaxDelta: 1,
      reviewRequiredAboveDelta: 1,
      requireEvidenceForReview: true,
    },
  }
}

function simplePack(): ContentPack {
  return {
    level: {
      schemaVersion: 1,
      meta: { id: 'simple', name: 'Simple' },
      map: { width: 6, height: 6, timeDepth: 8, start: { x: 1, y: 1, t: 0 } },
      archetypes: {
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
      detection: { enabled: true, delayTurns: 1, maxDistance: 2 },
    },
  }
}

function complexPack(): ContentPack {
  return {
    level: {
      schemaVersion: 1,
      meta: { id: 'complex', name: 'Complex' },
      map: { width: 8, height: 8, timeDepth: 16, start: { x: 1, y: 1, t: 0 } },
      archetypes: {
        exit: {
          kind: 'exit',
          components: [{ kind: 'Exit' }, { kind: 'TimePersistent' }],
          render: {},
        },
        wall: {
          kind: 'wall',
          components: [{ kind: 'BlocksMovement' }, { kind: 'BlocksVision' }, { kind: 'TimePersistent' }],
          render: {},
        },
        enemy: {
          kind: 'enemy',
          components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
          render: {},
        },
        box: {
          kind: 'box',
          components: [
            { kind: 'BlocksMovement' },
            { kind: 'Pushable' },
            { kind: 'Pullable' },
            { kind: 'TimePersistent' },
          ],
          render: {},
        },
        rift: {
          kind: 'rift',
          components: [
            { kind: 'TimePersistent' },
            { kind: 'Rift', target: { x: 5, y: 5, t: 10 }, bidirectional: true },
          ],
          render: {},
        },
        back_rift: {
          kind: 'back_rift',
          components: [
            { kind: 'TimePersistent' },
            { kind: 'Rift', target: { x: 2, y: 2, t: 1 }, bidirectional: true },
          ],
          render: {},
        },
      },
      instances: [
        { id: 'exit.main', archetype: 'exit', position: { x: 6, y: 6, t: 0 } },
        { id: 'enemy.a', archetype: 'enemy', position: { x: 2, y: 1, t: 0 } },
        { id: 'box.a', archetype: 'box', position: { x: 3, y: 2, t: 0 } },
        { id: 'rift.a', archetype: 'rift', position: { x: 2, y: 2, t: 3 } },
        { id: 'rift.b', archetype: 'back_rift', position: { x: 5, y: 5, t: 10 } },
        { id: 'wall.a', archetype: 'wall', position: { x: 4, y: 4, t: 0 } },
      ],
    },
    behavior: {
      schemaVersion: 1,
      policies: {
        patrol_close: {
          kind: 'PatrolLoop',
          path: [
            { x: 2, y: 1 },
            { x: 3, y: 1 },
            { x: 3, y: 2 },
          ],
        },
      },
      assignments: {
        'enemy.a': 'patrol_close',
      },
      detectionProfiles: {
        close: { enabled: true, delayTurns: 1, maxDistance: 3 },
      },
      detectionAssignments: {
        'enemy.a': 'close',
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
  }
}

describe('evaluateDifficultyV1', () => {
  it('is deterministic for same pack and model config', () => {
    const pack = simplePack()
    const model = modelConfig()

    const first = evaluateDifficultyV1(pack, model)
    const second = evaluateDifficultyV1(pack, model)

    expect(first).toEqual(second)
  })

  it('maps score boundaries to configured tiers', () => {
    const bounds = modelConfig().tierBounds

    expect(suggestDifficultyTier(0, bounds)).toBe('easy')
    expect(suggestDifficultyTier(24, bounds)).toBe('easy')
    expect(suggestDifficultyTier(25, bounds)).toBe('normal')
    expect(suggestDifficultyTier(49, bounds)).toBe('normal')
    expect(suggestDifficultyTier(50, bounds)).toBe('hard')
    expect(suggestDifficultyTier(74, bounds)).toBe('hard')
    expect(suggestDifficultyTier(75, bounds)).toBe('expert')
    expect(suggestDifficultyTier(100, bounds)).toBe('expert')
  })

  it('assigns higher pressure to more complex packs', () => {
    const model = modelConfig()
    const baseline = evaluateDifficultyV1(simplePack(), model)
    const complex = evaluateDifficultyV1(complexPack(), model)

    expect(complex.score).toBeGreaterThan(baseline.score)
    expect(complex.vector.detectionPressure).toBeGreaterThanOrEqual(baseline.vector.detectionPressure)
    expect(complex.vector.temporalPressure).toBeGreaterThanOrEqual(baseline.vector.temporalPressure)
    expect(complex.vector.interactionComplexity).toBeGreaterThanOrEqual(
      baseline.vector.interactionComplexity,
    )
  })
})
