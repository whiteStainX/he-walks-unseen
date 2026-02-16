import { describe, expect, it } from 'vitest'

import { loadDefaultGenerationProfile, validateGenerationProfile } from './profile'

describe('generation profile', () => {
  it('loads default generation profile', () => {
    const loaded = loadDefaultGenerationProfile()

    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }

    expect(loaded.value.id).toBe('default-v1')
    expect(loaded.value.defaultDifficulty).toBe('normal')
    expect(loaded.value.difficultyProfiles.normal.budgets.maxEnemies).toBeGreaterThan(0)
  })

  it('rejects invalid profile shape', () => {
    const loaded = validateGenerationProfile({
      schemaVersion: 1,
      id: 'bad',
    })

    expect(loaded.ok).toBe(false)
    if (!loaded.ok) {
      expect(loaded.error.kind).toBe('InvalidGenerationProfile')
    }
  })
})
