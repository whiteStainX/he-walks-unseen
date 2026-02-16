import type { Result } from '../../core/result'
import type { ContentLoadError } from '../contracts'
import { validateContentPack } from '../validate'
import { generateCandidateContent } from './generator'
import { scoreGeneratedContent } from './quality'
import type { MapGenError, MapGenGenerationResult, MapGenRequest } from './contracts'
import { loadDefaultGenerationProfile, validateGenerationProfile } from './profile'
import { evaluateSolvabilityV1 } from './solver'

function validateRequest(
  request: MapGenRequest,
  boardMin: { width: number; height: number; timeDepth: number },
): Result<null, MapGenError> {
  if (request.board.width < boardMin.width || request.board.height < boardMin.height) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationRequest',
        message: `Board must be at least ${boardMin.width}x${boardMin.height}`,
      },
    }
  }

  if (request.board.timeDepth < boardMin.timeDepth) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationRequest',
        message: `timeDepth must be at least ${boardMin.timeDepth}`,
      },
    }
  }

  return { ok: true, value: null }
}

export function generateMapPack(request: MapGenRequest): MapGenGenerationResult {
  const profile = request.profile
    ? validateGenerationProfile(request.profile)
    : loadDefaultGenerationProfile()

  if (!profile.ok) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationProfile',
        message: profile.error.message,
      },
    }
  }

  const requestValidation = validateRequest(request, profile.value.boardMin)

  if (!requestValidation.ok) {
    return requestValidation
  }

  const difficulty = request.difficulty ?? profile.value.defaultDifficulty
  const difficultyProfile = profile.value.difficultyProfiles[difficulty]
  const maxAttempts = Math.max(1, request.maxAttempts ?? profile.value.maxAttempts)
  const qualityThreshold = request.qualityThreshold ?? difficultyProfile.qualityThreshold
  let lastInvalid: { attempt: number; error: ContentLoadError } | null = null
  let lastReason = 'No attempts executed'

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateCandidateContent({
      request,
      profile: profile.value,
      attempt,
    })
    const validated = validateContentPack(candidate)

    if (!validated.ok) {
      lastInvalid = { attempt, error: validated.error }
      lastReason = `Validation failed on attempt ${attempt}: ${validated.error.kind}`
      continue
    }

    const solver = evaluateSolvabilityV1(validated.value, {
      maxDepth: Math.min(16, validated.value.level.map.timeDepth),
      maxNodes: 1500,
      includePushPull: false,
      includeRift: false,
    })

    if (!solver.solved) {
      lastReason = `Unsolvable candidate on attempt ${attempt}`
      continue
    }

    const qualityScore = scoreGeneratedContent({
      content: validated.value,
      solver,
    })

    if (qualityScore < qualityThreshold) {
      lastReason = `Quality ${qualityScore} below threshold ${qualityThreshold} on attempt ${attempt}`
      continue
    }

    return {
      ok: true,
      value: {
        content: validated.value,
        metadata: {
          seed: String(request.seed),
          attempt,
          qualityScore,
          solver,
        },
      },
    }
  }

  if (lastInvalid) {
    return {
      ok: false,
      error: {
        kind: 'GeneratedContentInvalid',
        attempt: lastInvalid.attempt,
        error: lastInvalid.error,
      },
    }
  }

  return {
    ok: false,
    error: {
      kind: 'GenerationFailed',
      attempts: maxAttempts,
      lastReason,
    },
  }
}
