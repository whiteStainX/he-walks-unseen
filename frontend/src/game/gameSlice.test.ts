import { describe, expect, it } from 'vitest'

import { gameReducer, movePlayer2D, riftToTime } from './gameSlice'

describe('gameSlice', () => {
  it('increments turn and time on normal movement', () => {
    const initial = gameReducer(undefined, { type: 'init' })

    const next = gameReducer(initial, movePlayer2D('east'))

    expect(next.turn).toBe(1)
    expect(next.currentTime).toBe(1)
    expect(next.worldLine.path.at(-1)).toEqual({ x: 6, y: 5, t: 1 })
  })

  it('rifts to past time and increments turn', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const moved = gameReducer(initial, movePlayer2D('east'))
    const movedAgain = gameReducer(moved, movePlayer2D('east'))

    expect(movedAgain.currentTime).toBe(2)

    const rifted = gameReducer(movedAgain, riftToTime({ targetTime: 0 }))

    expect(rifted.turn).toBe(3)
    expect(rifted.currentTime).toBe(0)
    expect(rifted.worldLine.path.at(-1)).toEqual({ x: 7, y: 5, t: 0 })
  })

  it('blocks self-intersection when rifting to an occupied (x,y,t)', () => {
    const initial = gameReducer(undefined, { type: 'init' })

    const blocked = gameReducer(initial, riftToTime({ targetTime: 0 }))

    expect(blocked.turn).toBe(0)
    expect(blocked.currentTime).toBe(0)
    expect(blocked.status).toBe('Blocked by self-intersection')
  })
})
