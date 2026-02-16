import type { Result } from '../../core/result'
import type { ContentLoadError } from '../contracts'
import { validateContentPack } from '../validate'
import { generateCandidateContent } from './generator'
import { scoreGeneratedContent } from './quality'
import type { MapGenError, MapGenGenerationResult, MapGenRequest } from './contracts'
import { evaluateSolvabilityV1 } from './solver'

function validateRequest(request: MapGenRequest): Result<null, MapGenError> {
  if (request.board.width < 6 || request.board.height < 6) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationRequest',
        message: 'Board must be at least 6x6',
      },
    }
  }

  if (request.board.timeDepth < 4) {
    return {
      ok: false,
      error: {
        kind: 'InvalidGenerationRequest',
        message: 'timeDepth must be at least 4',
      },
    }
  }

  return { ok: true, value: null }
}

export function generateMapPack(request: MapGenRequest): MapGenGenerationResult {
  const requestValidation = validateRequest(request)

  if (!requestValidation.ok) {
    return requestValidation
  }

  const maxAttempts = Math.max(1, request.maxAttempts ?? 20)
  const qualityThreshold = request.qualityThreshold ?? 35
  let lastInvalid: { attempt: number; error: ContentLoadError } | null = null
  let lastReason = 'No attempts executed'

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateCandidateContent(request, attempt)
    const validated = validateContentPack(candidate)

    if (!validated.ok) {
      lastInvalid = { attempt, error: validated.error }
      lastReason = `Validation failed on attempt ${attempt}: ${validated.error.kind}`
      continue
    }

    const solver = evaluateSolvabilityV1(validated.value)

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
