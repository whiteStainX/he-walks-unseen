import { describe, expect, it } from 'vitest'

import { resolveObjectIconSlot } from './iconPack'

describe('resolveObjectIconSlot', () => {
  it('prefers explicit render.symbol', () => {
    expect(resolveObjectIconSlot('wall', { symbol: 'custom-wall' })).toBe('custom-wall')
  })

  it('falls back to kind mapping', () => {
    expect(resolveObjectIconSlot('enemy', {})).toBe('enemy')
  })

  it('returns null for unknown kind without symbol', () => {
    expect(resolveObjectIconSlot('unknown', {})).toBeNull()
  })
})
