import { describe, expect, it } from 'vitest'

import { resolveStorySpecProvider } from './index'

describe('resolveStorySpecProvider', () => {
  it('defaults to ollama provider when no config is supplied', () => {
    const resolved = resolveStorySpecProvider({}, {})

    expect(resolved.ok).toBe(true)
    if (!resolved.ok) {
      return
    }

    expect(resolved.value.kind).toBe('ollama')
  })

  it('rejects unsupported provider values', () => {
    const resolved = resolveStorySpecProvider({}, { HWU_STORY_LLM_PROVIDER: 'openai' })

    expect(resolved.ok).toBe(false)
    if (resolved.ok) {
      return
    }

    expect(resolved.error.kind).toBe('UnsupportedStoryProvider')
    expect(resolved.error.provider).toBe('openai')
  })
})
