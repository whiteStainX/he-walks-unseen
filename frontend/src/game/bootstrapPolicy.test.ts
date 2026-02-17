import { describe, expect, it } from 'vitest'

import { resolveBootstrapPolicy } from './bootstrapPolicy'

describe('resolveBootstrapPolicy', () => {
  it('disables fallback when dev mode is off', () => {
    expect(
      resolveBootstrapPolicy({
        DEV: false,
        VITE_ENABLE_DEV_FALLBACK_LEVEL: 'true',
      }).allowDevFallbackLevel,
    ).toBe(false)
  })

  it('disables fallback when flag is missing', () => {
    expect(
      resolveBootstrapPolicy({
        DEV: true,
      }).allowDevFallbackLevel,
    ).toBe(false)
  })

  it('enables fallback only when explicitly toggled in dev mode', () => {
    expect(
      resolveBootstrapPolicy({
        DEV: true,
        VITE_ENABLE_DEV_FALLBACK_LEVEL: 'true',
      }).allowDevFallbackLevel,
    ).toBe(true)
  })
})

