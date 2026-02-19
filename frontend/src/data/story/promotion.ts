import type { Result } from '../../core/result'
import type { PublicContentPackClass } from '../loader'

export interface StoryPromotionRequest {
  gatesPassed: boolean
  reviewed: boolean
  requestedClass?: Exclude<PublicContentPackClass, 'experimental'>
}

export interface StoryPromotionDecision {
  packClass: PublicContentPackClass
  promoted: boolean
  reason: string
}

export type StoryPromotionError = {
  kind: 'InvalidPromotionRequest'
  message: string
}

/**
 * Promotion policy hook: stage as experimental by default, promote only after gates + review.
 */
export function resolveStoryPromotionDecision(
  request: StoryPromotionRequest,
): Result<StoryPromotionDecision, StoryPromotionError> {
  if (!request.gatesPassed) {
    return {
      ok: true,
      value: {
        packClass: 'experimental',
        promoted: false,
        reason: 'validation gates failed; staged as experimental',
      },
    }
  }

  if (!request.reviewed) {
    return {
      ok: true,
      value: {
        packClass: 'experimental',
        promoted: false,
        reason: 'awaiting author review; staged as experimental',
      },
    }
  }

  return {
    ok: true,
    value: {
      packClass: request.requestedClass ?? 'generated',
      promoted: true,
      reason: 'reviewed and gate-compliant',
    },
  }
}
