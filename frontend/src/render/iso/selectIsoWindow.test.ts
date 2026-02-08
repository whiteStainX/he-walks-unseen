import { describe, expect, it } from 'vitest'

import { selectIsoWindow } from './selectIsoWindow'

describe('selectIsoWindow', () => {
  it('shows last 10 slices when at latest time', () => {
    const window = selectIsoWindow(23, 24, 10)

    expect(window).toEqual({ startT: 14, endT: 23, focusT: 23 })
  })

  it('uses all available future then fills with present/past', () => {
    const window = selectIsoWindow(7, 12, 10)

    expect(window).toEqual({ startT: 2, endT: 11, focusT: 7 })
  })

  it('keeps focus near center when future is abundant', () => {
    const window = selectIsoWindow(10, 30, 10)

    expect(window).toEqual({ startT: 6, endT: 15, focusT: 10 })
  })

  it('clamps to valid bounds near start', () => {
    const window = selectIsoWindow(1, 24, 10)

    expect(window).toEqual({ startT: 0, endT: 9, focusT: 1 })
  })

  it('uses full depth when timeDepth is smaller than window', () => {
    const window = selectIsoWindow(2, 6, 10)

    expect(window).toEqual({ startT: 0, endT: 5, focusT: 2 })
  })
})

