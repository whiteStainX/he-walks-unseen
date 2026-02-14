import { describe, expect, it } from 'vitest'

import { loadDefaultBootContent } from './loader'

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
