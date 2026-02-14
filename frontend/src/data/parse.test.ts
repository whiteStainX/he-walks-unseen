import { describe, expect, it } from 'vitest'

import { parseJsonFile } from './parse'

describe('parseJsonFile', () => {
  it('parses valid json strings', () => {
    const parsed = parseJsonFile('level', '{"a":1}')

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) {
      return
    }

    expect(parsed.value).toEqual({ a: 1 })
  })

  it('returns structured parse error on invalid json', () => {
    const parsed = parseJsonFile('level', '{')

    expect(parsed.ok).toBe(false)
    if (!parsed.ok) {
      expect(parsed.error.kind).toBe('InvalidShape')
      if (parsed.error.kind === 'InvalidShape') {
        expect(parsed.error.file).toBe('level')
      }
    }
  })
})
