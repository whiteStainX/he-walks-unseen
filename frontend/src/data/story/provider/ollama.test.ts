import { describe, expect, it } from 'vitest'

import { createOllamaStoryProvider } from './ollama'

const validStorySpec = {
  schemaVersion: 1,
  storyId: 'story-a',
  title: 'Story A',
  board: { width: 8, height: 8, timeDepth: 8 },
  start: { x: 0, y: 0, t: 0 },
  goal: { type: 'ReachExit', target: { x: 7, y: 7, t: 0 } },
  layout: { walls: [] },
  actors: { enemies: [] },
}

describe('createOllamaStoryProvider', () => {
  it('returns parsed StorySpec when Ollama response is valid', async () => {
    const provider = createOllamaStoryProvider({
      fetchImpl: async () =>
        new Response(JSON.stringify({ response: JSON.stringify(validStorySpec) }), { status: 200 }),
    })

    const generated = await provider.generateStorySpec({ prompt: 'quiet room puzzle' })

    expect(generated.ok).toBe(true)
    if (!generated.ok) {
      return
    }

    expect(generated.value.storyId).toBe('story-a')
  })

  it('returns ProviderRequestFailed on non-ok HTTP response', async () => {
    const provider = createOllamaStoryProvider({
      fetchImpl: async () => new Response('boom', { status: 503 }),
    })

    const generated = await provider.generateStorySpec({ prompt: 'blocked request' })

    expect(generated.ok).toBe(false)
    if (generated.ok) {
      return
    }

    expect(generated.error.kind).toBe('ProviderRequestFailed')
  })

  it('returns ProviderInvalidResponse on malformed JSON payload', async () => {
    const provider = createOllamaStoryProvider({
      fetchImpl: async () =>
        new Response(JSON.stringify({ response: '{not-json' }), { status: 200 }),
    })

    const generated = await provider.generateStorySpec({ prompt: 'malformed' })

    expect(generated.ok).toBe(false)
    if (generated.ok) {
      return
    }

    expect(generated.error.kind).toBe('ProviderInvalidResponse')
  })

  it('returns ProviderInvalidStorySpec when LLM output violates schema', async () => {
    const provider = createOllamaStoryProvider({
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ response: JSON.stringify({ ...validStorySpec, unknownField: true }) }),
          { status: 200 },
        ),
    })

    const generated = await provider.generateStorySpec({ prompt: 'invalid schema' })

    expect(generated.ok).toBe(false)
    if (generated.ok) {
      return
    }

    expect(generated.error.kind).toBe('ProviderInvalidStorySpec')
  })
})
