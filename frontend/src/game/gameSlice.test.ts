import { describe, expect, it } from 'vitest'

import { applyRift, configureRiftSettings, gameReducer, movePlayer2D } from './gameSlice'

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

    const rifted = gameReducer(
      movedAgain,
      applyRift({ kind: 'tunnel', target: { x: 7, y: 5, t: 0 } }),
    )

    expect(rifted.turn).toBe(3)
    expect(rifted.currentTime).toBe(0)
    expect(rifted.worldLine.path.at(-1)).toEqual({ x: 7, y: 5, t: 0 })
  })

  it('blocks self-intersection when rifting to an occupied (x,y,t)', () => {
    const initial = gameReducer(undefined, { type: 'init' })

    const blocked = gameReducer(
      initial,
      applyRift({ kind: 'tunnel', target: { x: 5, y: 5, t: 0 } }),
    )

    expect(blocked.turn).toBe(0)
    expect(blocked.currentTime).toBe(0)
    expect(blocked.status).toBe('Blocked by self-intersection')
  })

  it('uses configurable default delta for the default rift instruction', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const configured = gameReducer(initial, configureRiftSettings({ defaultDelta: 2 }))
    const m1 = gameReducer(configured, movePlayer2D('east'))
    const m2 = gameReducer(m1, movePlayer2D('east'))
    const m3 = gameReducer(m2, movePlayer2D('east'))

    expect(m3.currentTime).toBe(3)

    const defaultRift = gameReducer(m3, applyRift(undefined))

    expect(defaultRift.currentTime).toBe(1)
    expect(defaultRift.worldLine.path.at(-1)).toEqual({ x: 8, y: 5, t: 1 })
  })
})
