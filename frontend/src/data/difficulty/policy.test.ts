import { describe, expect, it } from 'vitest'

import type { DifficultyModelConfig } from '../contracts'
import { validateDifficultyOverridePolicy } from './policy'

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

describe('validateDifficultyOverridePolicy', () => {
  it('uses measured tier when source is measured', () => {
    const result = validateDifficultyOverridePolicy({
      model: modelConfig(),
      override: {
        source: 'measured',
        measuredTier: 'normal',
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.effectiveTier).toBe('normal')
    expect(result.value.source).toBe('measured')
    expect(result.value.tierDelta).toBe(0)
  })

  it('requires note when tier delta is within note-required band', () => {
    const result = validateDifficultyOverridePolicy({
      model: modelConfig(),
      override: {
        source: 'authored-override',
        measuredTier: 'normal',
        authoredTier: 'hard',
      },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.kind).toBe('OverrideNoteRequired')
    }
  })

  it('accepts one-tier override with note', () => {
    const result = validateDifficultyOverridePolicy({
      model: modelConfig(),
      override: {
        source: 'authored-override',
        measuredTier: 'normal',
        authoredTier: 'hard',
        note: 'playtest shows this is harder because the critical branch is deceptive',
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.effectiveTier).toBe('hard')
    expect(result.value.tierDelta).toBe(1)
  })

  it('requires review flag and evidence for large override delta', () => {
    const missingReview = validateDifficultyOverridePolicy({
      model: modelConfig(),
      override: {
        source: 'authored-override',
        measuredTier: 'easy',
        authoredTier: 'expert',
        note: 'manual escalation',
      },
    })

    expect(missingReview.ok).toBe(false)
    if (!missingReview.ok) {
      expect(missingReview.error.kind).toBe('OverrideReviewFlagRequired')
    }

    const missingEvidence = validateDifficultyOverridePolicy({
      model: modelConfig(),
      override: {
        source: 'authored-override',
        measuredTier: 'easy',
        authoredTier: 'expert',
        note: 'manual escalation',
        reviewFlag: true,
      },
    })

    expect(missingEvidence.ok).toBe(false)
    if (!missingEvidence.ok) {
      expect(missingEvidence.error.kind).toBe('OverrideEvidenceNoteRequired')
    }
  })

  it('accepts reviewed large override with evidence note', () => {
    const result = validateDifficultyOverridePolicy({
      model: modelConfig(),
      override: {
        source: 'authored-override',
        measuredTier: 'easy',
        authoredTier: 'expert',
        note: 'manual escalation',
        reviewFlag: true,
        evidenceNote: 'solver trace #A12 and playtest batch 2026-02-19',
      },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.effectiveTier).toBe('expert')
    expect(result.value.tierDelta).toBe(3)
  })
})
