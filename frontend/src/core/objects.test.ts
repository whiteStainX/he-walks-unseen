import { describe, expect, it } from 'vitest'

import { createObjectRegistry, resolveArchetype, resolveObjectInstance } from './objects'

describe('object registry', () => {
  it('resolves known archetypes', () => {
    const registry = createObjectRegistry({
      wall: {
        kind: 'wall',
        components: [{ kind: 'BlocksMovement' }],
        render: { fill: '#fff', stroke: '#000' },
      },
    })

    const resolved = resolveArchetype(registry, 'wall')

    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(resolved.value.kind).toBe('wall')
    }
  })

  it('fails for unknown archetypes', () => {
    const registry = createObjectRegistry({})
    const resolved = resolveArchetype(registry, 'missing')

    expect(resolved.ok).toBe(false)
    if (!resolved.ok) {
      expect(resolved.error.kind).toBe('UnknownArchetype')
      expect(resolved.error.archetype).toBe('missing')
    }
  })

  it('applies instance render overrides on top of archetype defaults', () => {
    const registry = createObjectRegistry({
      box: {
        kind: 'box',
        components: [{ kind: 'BlocksMovement' }],
        render: { fill: '#ddd', stroke: '#111' },
      },
    })

    const resolved = resolveObjectInstance(registry, {
      id: 'box.1',
      archetype: 'box',
      position: { x: 2, y: 3, t: 0 },
      overrides: {
        render: {
          glyph: 'B',
        },
      },
    })

    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(resolved.value.archetype.render.fill).toBe('#ddd')
      expect(resolved.value.archetype.render.glyph).toBe('B')
    }
  })
})
