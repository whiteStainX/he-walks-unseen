import type { Result } from '../../core/result'
import type { DifficultyModelConfig, DifficultyTier } from '../contracts'

export interface DifficultyOverridePolicyInput {
  measuredTier: DifficultyTier
  source: 'measured' | 'authored-override'
  authoredTier?: DifficultyTier
  note?: string
  reviewFlag?: boolean
  evidenceNote?: string
}

export interface DifficultyOverridePolicyResult {
  effectiveTier: DifficultyTier
  source: 'measured' | 'authored-override'
  tierDelta: number
}

export type DifficultyOverridePolicyError =
  | { kind: 'AuthoredTierRequired' }
  | { kind: 'OverrideNoteRequired'; tierDelta: number }
  | { kind: 'OverrideReviewFlagRequired'; tierDelta: number }
  | { kind: 'OverrideEvidenceNoteRequired'; tierDelta: number }

const TIER_ORDER: DifficultyTier[] = ['easy', 'normal', 'hard', 'expert']

function tierIndex(tier: DifficultyTier): number {
  return TIER_ORDER.indexOf(tier)
}

function isNonEmptyString(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function resolveTierDelta(measuredTier: DifficultyTier, authoredTier: DifficultyTier): number {
  return Math.abs(tierIndex(authoredTier) - tierIndex(measuredTier))
}

export function validateDifficultyOverridePolicy(input: {
  model: DifficultyModelConfig
  override: DifficultyOverridePolicyInput
}): Result<DifficultyOverridePolicyResult, DifficultyOverridePolicyError> {
  const { model, override } = input

  if (override.source !== 'authored-override') {
    return {
      ok: true,
      value: {
        effectiveTier: override.measuredTier,
        source: 'measured',
        tierDelta: 0,
      },
    }
  }

  if (!override.authoredTier) {
    return { ok: false, error: { kind: 'AuthoredTierRequired' } }
  }

  const tierDelta = resolveTierDelta(override.measuredTier, override.authoredTier)
  const noteRequired = tierDelta > 0 && tierDelta <= model.overridePolicy.noteRequiredMaxDelta
  const reviewRequired = tierDelta > model.overridePolicy.reviewRequiredAboveDelta

  if (noteRequired && !isNonEmptyString(override.note)) {
    return {
      ok: false,
      error: {
        kind: 'OverrideNoteRequired',
        tierDelta,
      },
    }
  }

  if (reviewRequired && override.reviewFlag !== true) {
    return {
      ok: false,
      error: {
        kind: 'OverrideReviewFlagRequired',
        tierDelta,
      },
    }
  }

  if (
    reviewRequired &&
    model.overridePolicy.requireEvidenceForReview &&
    !isNonEmptyString(override.evidenceNote)
  ) {
    return {
      ok: false,
      error: {
        kind: 'OverrideEvidenceNoteRequired',
        tierDelta,
      },
    }
  }

  return {
    ok: true,
    value: {
      effectiveTier: override.authoredTier,
      source: 'authored-override',
      tierDelta,
    },
  }
}
