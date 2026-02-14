import type { Result } from '../core/result'
import type { ContentLoadError } from './contracts'

export function parseJsonFile(file: string, raw: string): Result<unknown, ContentLoadError> {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown }
  } catch (error) {
    return {
      ok: false,
      error: {
        kind: 'InvalidShape',
        file,
        message: error instanceof Error ? error.message : 'Invalid JSON',
      },
    }
  }
}
