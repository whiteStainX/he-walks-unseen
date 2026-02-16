import { describe, expect, it } from 'vitest'

import { loadDefaultBootContent } from '../data/loader'
import { objectsAt } from '../core/timeCube'
import {
  applyLoadedContent,
  applyRift,
  configureDetectionConfig,
  configureParadoxConfig,
  configureRiftSettings,
  gameReducer,
  movePlayer2D,
  pullPlayer2D,
  pushPlayer2D,
  restart,
  setContentPackId,
  setInteractionConfig,
  waitTurn,
} from './gameSlice'

describe('gameSlice', () => {
  it('increments turn and time on normal movement', () => {
    const initial = gameReducer(undefined, { type: 'init' })

    const next = gameReducer(initial, movePlayer2D('east'))

    expect(next.turn).toBe(1)
    expect(next.currentTime).toBe(1)
    expect(next.worldLine.path.at(-1)).toEqual({ x: 6, y: 5, t: 1 })
  })

  it('blocks movement on occupied wall tiles', () => {
    const initial = gameReducer(undefined, { type: 'init' })

    const blocked = gameReducer(initial, movePlayer2D('north'))

    expect(blocked.turn).toBe(0)
    expect(blocked.currentTime).toBe(0)
    expect(blocked.status).toBe('Blocked by object')
  })

  it('allows movement on empty tiles', () => {
    const initial = gameReducer(undefined, { type: 'init' })

    const next = gameReducer(initial, movePlayer2D('west'))

    expect(next.turn).toBe(1)
    expect(next.currentTime).toBe(1)
    expect(next.worldLine.path.at(-1)).toEqual({ x: 4, y: 5, t: 1 })
  })

  it('advances enemy occupancy by patrol policy as time advances', () => {
    const initial = gameReducer(undefined, { type: 'init' })

    expect(objectsAt(initial.cube, { x: 2, y: 8, t: 0 }).map((obj) => obj.id)).toContain('enemy.alpha')

    const waited = gameReducer(initial, waitTurn())

    expect(waited.phase).toBe('Playing')
    expect(objectsAt(waited.cube, { x: 3, y: 8, t: 1 }).map((obj) => obj.id)).toContain('enemy.alpha')
    expect(objectsAt(waited.cube, { x: 2, y: 8, t: 1 }).map((obj) => obj.id)).not.toContain(
      'enemy.alpha',
    )
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

  it('sets phase to Won when entering exit tile', () => {
    const initial = gameReducer(undefined, { type: 'init' })

    const won = gameReducer(initial, applyRift({ kind: 'tunnel', target: { x: 10, y: 10, t: 1 } }))

    expect(won.phase).toBe('Won')
    expect(won.turn).toBe(1)
    expect(won.status).toContain('reached exit')
  })

  it('stops movement after win until restart', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const won = gameReducer(initial, applyRift({ kind: 'tunnel', target: { x: 10, y: 10, t: 1 } }))

    const blocked = gameReducer(won, movePlayer2D('east'))
    expect(blocked.turn).toBe(1)
    expect(blocked.status).toBe('Game already ended. Press R to restart.')

    const reset = gameReducer(blocked, restart())
    const moved = gameReducer(reset, waitTurn())

    expect(moved.turn).toBe(1)
    expect(moved.phase).toBe('Playing')
  })

  it('pushes a pullable box and propagates occupancy to future slices', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const s1 = gameReducer(initial, movePlayer2D('east'))
    const s2 = gameReducer(s1, movePlayer2D('east'))
    const s3 = gameReducer(s2, movePlayer2D('south'))
    const pushed = gameReducer(s3, pushPlayer2D('east'))

    expect(pushed.turn).toBe(4)
    expect(pushed.currentTime).toBe(4)
    expect(pushed.worldLine.path.at(-1)).toEqual({ x: 8, y: 6, t: 4 })
    expect(objectsAt(pushed.cube, { x: 9, y: 6, t: 4 }).map((obj) => obj.id)).toContain('box.main')
    expect(objectsAt(pushed.cube, { x: 9, y: 6, t: 8 }).map((obj) => obj.id)).toContain('box.main')
  })

  it('pulls a box from behind into previous player cell', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const s1 = gameReducer(initial, movePlayer2D('east'))
    const s2 = gameReducer(s1, movePlayer2D('east'))
    const s3 = gameReducer(s2, movePlayer2D('south'))
    const pushed = gameReducer(s3, pushPlayer2D('east'))
    const pulled = gameReducer(pushed, pullPlayer2D('west'))

    expect(pulled.turn).toBe(5)
    expect(pulled.currentTime).toBe(5)
    expect(pulled.worldLine.path.at(-1)).toEqual({ x: 7, y: 6, t: 5 })
    expect(objectsAt(pulled.cube, { x: 8, y: 6, t: 5 }).map((obj) => obj.id)).toContain('box.main')
  })

  it('rejects push when chain exceeds configured max length', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const configured = gameReducer(initial, setInteractionConfig({ maxPushChain: 0 }))
    const s1 = gameReducer(configured, movePlayer2D('east'))
    const s2 = gameReducer(s1, movePlayer2D('east'))
    const s3 = gameReducer(s2, movePlayer2D('south'))
    const blocked = gameReducer(s3, pushPlayer2D('east'))

    expect(blocked.turn).toBe(3)
    expect(blocked.currentTime).toBe(3)
    expect(blocked.status).toBe('Push chain too long')
    expect(blocked.worldLine.path.at(-1)).toEqual({ x: 7, y: 6, t: 3 })
    expect(objectsAt(blocked.cube, { x: 8, y: 6, t: 4 }).map((obj) => obj.id)).toContain('box.main')
  })

  it('records successful interactions in history', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const moved = gameReducer(initial, movePlayer2D('east'))
    const blocked = gameReducer(
      moved,
      applyRift({ kind: 'tunnel', target: { x: 6, y: 5, t: 1 } }),
    )
    const waited = gameReducer(blocked, waitTurn())

    expect(waited.turn).toBe(2)
    expect(waited.history).toHaveLength(2)
    expect(waited.history[0].action).toEqual({ kind: 'Move', direction: 'east' })
    expect(waited.history[1].action).toEqual({ kind: 'Wait' })
    expect(waited.history[0].outcome.kind).toBe('Moved')
    expect(waited.history[1].outcome.kind).toBe('Moved')
  })

  it('resets moved object occupancy on restart', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const s1 = gameReducer(initial, movePlayer2D('east'))
    const s2 = gameReducer(s1, movePlayer2D('east'))
    const s3 = gameReducer(s2, movePlayer2D('south'))
    const pushed = gameReducer(s3, pushPlayer2D('east'))

    expect(objectsAt(pushed.cube, { x: 9, y: 6, t: 4 }).map((obj) => obj.id)).toContain('box.main')

    const reset = gameReducer(pushed, restart())

    expect(reset.turn).toBe(0)
    expect(reset.history).toHaveLength(0)
    expect(objectsAt(reset.cube, { x: 8, y: 6, t: 4 }).map((obj) => obj.id)).toContain('box.main')
    expect(objectsAt(reset.cube, { x: 9, y: 6, t: 4 }).map((obj) => obj.id)).not.toContain('box.main')
  })

  it('transitions to Detected when discrete-delay rule matches', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const configured = gameReducer(
      initial,
      configureDetectionConfig({ enabled: true, delayTurns: 1, maxDistance: 8 }),
    )

    const detected = gameReducer(configured, waitTurn())

    expect(detected.turn).toBe(1)
    expect(detected.phase).toBe('Detected')
    expect(detected.lastDetection?.detected).toBe(true)
    expect(detected.lastDetection?.events[0]?.enemyId).toBe('enemy.alpha')
    expect(detected.status).toContain('detected by enemy.alpha')
  })

  it('uses per-enemy detection overrides when provided by content', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const seeded = {
      ...initial,
      detectionConfig: { enabled: false, delayTurns: 1, maxDistance: 0 },
      enemyDetectionConfigById: {
        'enemy.alpha': { enabled: true, delayTurns: 1, maxDistance: 8 },
      },
    }

    const detected = gameReducer(seeded, waitTurn())

    expect(detected.turn).toBe(1)
    expect(detected.phase).toBe('Detected')
    expect(detected.lastDetection?.detected).toBe(true)
    expect(detected.lastDetection?.events[0]?.enemyId).toBe('enemy.alpha')
  })

  it('blocks gameplay actions after detection until restart', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const configured = gameReducer(
      initial,
      configureDetectionConfig({ enabled: true, delayTurns: 1, maxDistance: 8 }),
    )
    const detected = gameReducer(configured, waitTurn())

    const blocked = gameReducer(detected, movePlayer2D('east'))

    expect(blocked.turn).toBe(1)
    expect(blocked.currentTime).toBe(1)
    expect(blocked.phase).toBe('Detected')
    expect(blocked.status).toBe('Game already ended. Press R to restart.')
  })

  it('restart clears detection phase and report', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const configured = gameReducer(
      initial,
      configureDetectionConfig({ enabled: true, delayTurns: 1, maxDistance: 8 }),
    )
    const detected = gameReducer(configured, waitTurn())
    const reset = gameReducer(detected, restart())

    expect(reset.phase).toBe('Playing')
    expect(reset.turn).toBe(0)
    expect(reset.lastDetection).toBeNull()
  })

  it('keeps win priority over detection on the same action', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const configured = gameReducer(
      initial,
      configureDetectionConfig({ enabled: true, delayTurns: 1, maxDistance: 50 }),
    )

    const won = gameReducer(configured, applyRift({ kind: 'tunnel', target: { x: 10, y: 10, t: 1 } }))

    expect(won.phase).toBe('Won')
    expect(won.status).toContain('reached exit')
    expect(won.lastDetection).toBeNull()
  })

  it('transitions to Paradox when a committed object anchor becomes inconsistent', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const seeded = {
      ...initial,
      causalAnchors: [
        {
          id: 'seed-object-anchor',
          requirement: {
            kind: 'ObjectAt' as const,
            objectId: 'box.main',
            position: { x: 8, y: 6, t: 1 },
            sourceTurn: 0,
          },
        },
      ],
    }
    const staged = gameReducer(
      seeded,
      applyRift({ kind: 'tunnel', target: { x: 8, y: 5, t: 0 } }),
    )
    const paradox = gameReducer(staged, pullPlayer2D('north'))

    expect(paradox.phase).toBe('Paradox')
    expect(paradox.lastParadox?.paradox).toBe(true)
    expect(paradox.lastParadox?.violations.some((entry) => entry.reason === 'ObjectMismatch')).toBe(
      true,
    )
    expect(paradox.status).toContain('paradox')
  })

  it('blocks gameplay actions after paradox until restart', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const seeded = {
      ...initial,
      causalAnchors: [
        {
          id: 'seed-broken-anchor',
          requirement: {
            kind: 'PlayerAt' as const,
            position: { x: 999, y: 999, t: 1 },
            sourceTurn: 0,
          },
        },
      ],
    }
    const paradox = gameReducer(
      seeded,
      applyRift({ kind: 'tunnel', target: { x: 6, y: 5, t: 1 } }),
    )

    expect(paradox.phase).toBe('Paradox')

    const blocked = gameReducer(paradox, movePlayer2D('east'))

    expect(blocked.turn).toBe(paradox.turn)
    expect(blocked.phase).toBe('Paradox')
    expect(blocked.status).toBe('Game already ended. Press R to restart.')

    const reset = gameReducer(blocked, restart())
    expect(reset.phase).toBe('Playing')
    expect(reset.lastParadox).toBeNull()
    expect(reset.causalAnchors).toHaveLength(0)
  })

  it('keeps paradox priority over win and detection on the same action', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const configured = gameReducer(
      initial,
      configureDetectionConfig({ enabled: true, delayTurns: 1, maxDistance: 50 }),
    )
    const paradoxEnabled = gameReducer(configured, configureParadoxConfig({ enabled: true }))
    const seeded = {
      ...paradoxEnabled,
      causalAnchors: [
        {
          id: 'seed-broken-anchor-priority',
          requirement: {
            kind: 'PlayerAt' as const,
            position: { x: 1000, y: 1000, t: 1 },
            sourceTurn: 0,
          },
        },
      ],
    }

    const outcome = gameReducer(
      seeded,
      applyRift({ kind: 'tunnel', target: { x: 10, y: 10, t: 1 } }),
    )

    expect(outcome.phase).toBe('Paradox')
    expect(outcome.lastParadox?.paradox).toBe(true)
    expect(outcome.lastDetection).toBeNull()
    expect(outcome.status).toContain('paradox')
  })

  it('updates content pack id selection before loading', () => {
    const initial = gameReducer(undefined, { type: 'init' })
    const next = gameReducer(initial, setContentPackId('variant'))

    expect(next.contentPackId).toBe('variant')
    expect(next.status).toBe('Loading content pack: variant')
  })

  it('applies loaded content payload and resets run state', () => {
    const loaded = loadDefaultBootContent()
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) {
      return
    }

    const initial = gameReducer(undefined, { type: 'init' })
    const moved = gameReducer(initial, movePlayer2D('east'))
    const applied = gameReducer(
      moved,
      applyLoadedContent({ packId: 'default', content: loaded.value }),
    )

    expect(applied.turn).toBe(0)
    expect(applied.currentTime).toBe(loaded.value.startPosition.t)
    expect(applied.worldLine.path.at(-1)).toEqual(loaded.value.startPosition)
    expect(applied.phase).toBe('Playing')
    expect(applied.contentPackId).toBe('default')
    expect(applied.enemyDetectionConfigById).toEqual({})
    expect(applied.status).toBe('Loaded content pack: default')
  })
})
