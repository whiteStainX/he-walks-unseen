import type { Result } from '../../../core/result'
import type { DifficultyTier } from '../../contracts'
import type { StoryBoardSpec, StorySpec, StorySpecValidationIssue } from '../contracts'

export type StoryProviderKind = 'ollama'

export interface StorySpecGenerationConstraints {
  storyIdHint?: string
  board?: Partial<StoryBoardSpec>
  tier?: DifficultyTier
  maxEnemies?: number
  maxRifts?: number
}

export interface StorySpecGenerationRequest {
  prompt: string
  constraints?: StorySpecGenerationConstraints
}

export type StorySpecProviderError =
  | { kind: 'ProviderMisconfigured'; message: string }
  | { kind: 'ProviderRequestFailed'; status?: number; message: string }
  | { kind: 'ProviderInvalidResponse'; message: string }
  | { kind: 'ProviderInvalidStorySpec'; issues: StorySpecValidationIssue[] }

export interface StorySpecProvider {
  kind: StoryProviderKind
  generateStorySpec(
    request: StorySpecGenerationRequest,
  ): Promise<Result<StorySpec, StorySpecProviderError>>
}

export type StoryProviderSelectionError = {
  kind: 'UnsupportedStoryProvider'
  provider: string
}

export type StorySpecProviderSelectionResult = Result<StorySpecProvider, StoryProviderSelectionError>

export function formatStoryProviderError(error: StorySpecProviderError): string {
  switch (error.kind) {
    case 'ProviderMisconfigured':
    case 'ProviderRequestFailed':
    case 'ProviderInvalidResponse':
      return `${error.kind}: ${error.message}`
    case 'ProviderInvalidStorySpec':
      return `${error.kind}: ${error.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`
  }
}
