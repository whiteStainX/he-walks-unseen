import { afterEach, describe, expect, it, vi } from 'vitest'

import { loadBootContentFromPublic, loadDefaultBootContent } from './loader'

describe('loadDefaultBootContent', () => {
  it('loads default content and maps baseline runtime settings', () => {
    const result = loadDefaultBootContent()

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    expect(result.value.boardSize).toBe(12)
    expect(result.value.timeDepth).toBe(24)
    expect(result.value.startPosition).toEqual({ x: 5, y: 5, t: 0 })
    expect(result.value.detectionConfig.enabled).toBe(true)
    expect(result.value.interactionConfig.maxPushChain).toBe(4)
    expect(result.value.levelObjectsConfig.instances.length).toBeGreaterThan(0)
  })

  it('applies behavior assignment as instance component override', () => {
    const result = loadDefaultBootContent()

    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }

    const enemy = result.value.levelObjectsConfig.instances.find((entry) => entry.id === 'enemy.alpha')

    expect(enemy).toBeDefined()
    expect(enemy?.overrides?.components?.some((component) => component.kind === 'Patrol')).toBe(true)
  })
})

describe('loadBootContentFromPublic', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('loads selected public pack id without rebuild-time imports', async () => {
    const payloadByPath: Record<string, unknown> = {
      '/data/variant.level.json': {
        schemaVersion: 1,
        meta: { id: 'v', name: 'v' },
        map: { width: 6, height: 6, timeDepth: 8, start: { x: 1, y: 1, t: 0 } },
        archetypes: {
          enemy: {
            kind: 'enemy',
            components: [{ kind: 'BlocksMovement' }, { kind: 'TimePersistent' }],
            render: {},
          },
        },
        instances: [{ id: 'enemy.v', archetype: 'enemy', position: { x: 2, y: 2, t: 0 } }],
      },
      '/data/variant.behavior.json': {
        schemaVersion: 1,
        policies: { p: { kind: 'Static' } },
        assignments: { 'enemy.v': 'p' },
      },
      '/data/variant.theme.json': {
        schemaVersion: 1,
        id: 't',
        cssVars: { '--ink': '#111111' },
      },
      '/data/variant.rules.json': {
        schemaVersion: 1,
        rift: { defaultDelta: 2, baseEnergyCost: 0 },
        interaction: { maxPushChain: 3, allowPull: true },
        detection: { enabled: true, delayTurns: 1, maxDistance: 3 },
      },
    }

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input)
      const payload = payloadByPath[path]

      if (!payload) {
        return new Response(null, { status: 404 })
      }

      return new Response(JSON.stringify(payload), { status: 200 })
    }) as typeof fetch

    const loaded = await loadBootContentFromPublic({ packId: 'variant' })

    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }

    expect(loaded.value.boardSize).toBe(6)
    expect(loaded.value.timeDepth).toBe(8)
    expect(loaded.value.startPosition).toEqual({ x: 1, y: 1, t: 0 })
  })
})
