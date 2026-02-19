import type { Result } from '../../../core/result'
import { validateStorySpec } from '../validate'
import type { StorySpec } from '../contracts'
import type {
  StorySpecGenerationConstraints,
  StorySpecGenerationRequest,
  StorySpecProvider,
  StorySpecProviderError,
} from './types'

export const DEFAULT_OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
export const DEFAULT_OLLAMA_MODEL = 'llama3.1:8b'

export interface OllamaStoryProviderConfig {
  baseUrl?: string
  model?: string
  temperature?: number
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function formatConstraints(constraints: StorySpecGenerationConstraints | undefined): string {
  if (!constraints) {
    return 'No extra constraints.'
  }

  const lines: string[] = []

  if (constraints.storyIdHint) {
    lines.push(`- storyIdHint: ${constraints.storyIdHint}`)
  }

  if (constraints.tier) {
    lines.push(`- targetTier: ${constraints.tier}`)
  }

  if (constraints.board) {
    if (constraints.board.width !== undefined) {
      lines.push(`- board.width: ${constraints.board.width}`)
    }

    if (constraints.board.height !== undefined) {
      lines.push(`- board.height: ${constraints.board.height}`)
    }

    if (constraints.board.timeDepth !== undefined) {
      lines.push(`- board.timeDepth: ${constraints.board.timeDepth}`)
    }
  }

  if (constraints.maxEnemies !== undefined) {
    lines.push(`- maxEnemies: ${constraints.maxEnemies}`)
  }

  if (constraints.maxRifts !== undefined) {
    lines.push(`- maxRifts: ${constraints.maxRifts}`)
  }

  return lines.length > 0 ? lines.join('\n') : 'No extra constraints.'
}

function buildPrompt(request: StorySpecGenerationRequest): string {
  return [
    'You are producing StorySpec JSON only.',
    'Return one JSON object with no markdown, no prose, no code fences.',
    'Required top-level keys:',
    'schemaVersion, storyId, title, board, start, goal, layout, actors.',
    'Optional keys:',
    'interactives, rulesIntent, difficultyIntent, themeIntent.',
    'Schema constraints:',
    '- schemaVersion must be 1',
    '- goal.type must be ReachExit',
    '- positions are integers >= 0',
    '- enemy movement kinds: Static, PatrolLoop, PatrolPingPong',
    '- unknown fields are not allowed',
    '',
    'Author constraints:',
    formatConstraints(request.constraints),
    '',
    'Story prompt:',
    request.prompt,
  ].join('\n')
}

function toProviderError(error: unknown): StorySpecProviderError {
  if (error instanceof Error) {
    return {
      kind: 'ProviderRequestFailed',
      message: error.message,
    }
  }

  return {
    kind: 'ProviderRequestFailed',
    message: 'unknown provider failure',
  }
}

function parseOllamaJsonResponse(payload: unknown): Result<unknown, StorySpecProviderError> {
  if (!isRecord(payload)) {
    return {
      ok: false,
      error: {
        kind: 'ProviderInvalidResponse',
        message: 'expected object response from Ollama',
      },
    }
  }

  if (typeof payload.response !== 'string' || payload.response.trim().length === 0) {
    return {
      ok: false,
      error: {
        kind: 'ProviderInvalidResponse',
        message: 'missing string response field from Ollama',
      },
    }
  }

  try {
    return {
      ok: true,
      value: JSON.parse(payload.response) as unknown,
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: 'ProviderInvalidResponse',
        message: error instanceof Error ? `invalid JSON response: ${error.message}` : 'invalid JSON response',
      },
    }
  }
}

export function createOllamaStoryProvider(
  config: OllamaStoryProviderConfig = {},
): StorySpecProvider {
  const baseUrl = config.baseUrl ?? DEFAULT_OLLAMA_BASE_URL
  const model = config.model ?? DEFAULT_OLLAMA_MODEL
  const timeoutMs = config.timeoutMs ?? 30_000
  const temperature = config.temperature ?? 0.2
  const fetchImpl = config.fetchImpl ?? fetch

  return {
    kind: 'ollama',
    async generateStorySpec(
      request: StorySpecGenerationRequest,
    ): Promise<Result<StorySpec, StorySpecProviderError>> {
      const prompt = request.prompt.trim()

      if (prompt.length === 0) {
        return {
          ok: false,
          error: {
            kind: 'ProviderMisconfigured',
            message: 'prompt must be non-empty',
          },
        }
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => {
        controller.abort()
      }, timeoutMs)

      try {
        const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt: buildPrompt(request),
            stream: false,
            format: 'json',
            options: {
              temperature,
            },
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          return {
            ok: false,
            error: {
              kind: 'ProviderRequestFailed',
              status: response.status,
              message: `Ollama HTTP ${response.status}`,
            },
          }
        }

        const raw = (await response.json()) as unknown
        const parsed = parseOllamaJsonResponse(raw)

        if (!parsed.ok) {
          return parsed
        }

        const validated = validateStorySpec(parsed.value)

        if (!validated.ok) {
          return {
            ok: false,
            error: {
              kind: 'ProviderInvalidStorySpec',
              issues: validated.error.issues,
            },
          }
        }

        return {
          ok: true,
          value: validated.value,
        }
      } catch (error) {
        return {
          ok: false,
          error: toProviderError(error),
        }
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}
