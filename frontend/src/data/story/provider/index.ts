import { createOllamaStoryProvider, DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL, type OllamaStoryProviderConfig } from './ollama'
import type { StoryProviderKind, StorySpecProviderSelectionResult } from './types'

export interface StoryProviderEnv {
  HWU_STORY_LLM_PROVIDER?: string
  OLLAMA_BASE_URL?: string
  OLLAMA_MODEL?: string
}

export interface StoryProviderRuntimeConfig {
  provider?: StoryProviderKind
  ollama?: OllamaStoryProviderConfig
}

/**
 * Resolve story provider with Ollama as the enforced default.
 */
export function resolveStorySpecProvider(
  config: StoryProviderRuntimeConfig = {},
  env: StoryProviderEnv | NodeJS.ProcessEnv = process.env,
): StorySpecProviderSelectionResult {
  const providerCandidate = config.provider ?? env.HWU_STORY_LLM_PROVIDER ?? 'ollama'

  if (providerCandidate !== 'ollama') {
    return {
      ok: false,
      error: {
        kind: 'UnsupportedStoryProvider',
        provider: providerCandidate,
      },
    }
  }

  return {
    ok: true,
    value: createOllamaStoryProvider({
      baseUrl: config.ollama?.baseUrl ?? env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
      model: config.ollama?.model ?? env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
      temperature: config.ollama?.temperature,
      timeoutMs: config.ollama?.timeoutMs,
      fetchImpl: config.ollama?.fetchImpl,
    }),
  }
}

export { createOllamaStoryProvider, DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL }
export type { StorySpecProvider, StorySpecProviderError, StoryProviderSelectionError } from './types'
