import { describe, expect, it } from 'vitest'

import { normalizeStorySpec } from './normalize'
import type { StorySpec } from './contracts'

describe('normalizeStorySpec', () => {
  it('produces byte-stable output for equivalent inputs', () => {
    const source: StorySpec = {
      schemaVersion: 1,
      storyId: '  Echoes In Hall  ',
      title: ' Echoes In Hall ',
      board: { width: 12, height: 12, timeDepth: 12 },
      start: { x: 1, y: 1, t: 0 },
      goal: { type: 'ReachExit', target: { x: 10, y: 10, t: 0 } },
      layout: {
        walls: [
          { position: { x: 5, y: 6, t: 0 } },
          { id: 'wall.top', position: { x: 2, y: 2, t: 0 } },
        ],
      },
      actors: {
        enemies: [
          {
            position: { x: 9, y: 9, t: 0 },
            movement: { kind: 'Static' },
          },
          {
            id: 'enemy.custom',
            position: { x: 4, y: 4, t: 0 },
            movement: {
              kind: 'PatrolLoop',
              path: [
                { x: 5, y: 4 },
                { x: 4, y: 4 },
              ],
            },
          },
        ],
      },
      interactives: {
        boxes: [
          { position: { x: 3, y: 3, t: 0 } },
          { id: 'box.special', position: { x: 1, y: 3, t: 0 } },
        ],
        rifts: [
          {
            source: { x: 8, y: 8, t: 4 },
            target: { x: 1, y: 1, t: 1 },
          },
        ],
      },
    }

    const first = normalizeStorySpec(source)
    const second = normalizeStorySpec(source)

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
    expect(first.storyId).toBe('echoes-in-hall')
    expect(first.layout.walls.map((wall) => wall.id)).toEqual(['wall.2', 'wall.top'])
    expect(first.interactives.boxes.map((box) => box.id)).toEqual(['box.2', 'box.special'])
    expect(first.interactives.rifts[0]?.bidirectional).toBe(true)
  })

  it('fills defaults so normalized output has no implicit values', () => {
    const normalized = normalizeStorySpec({
      schemaVersion: 1,
      storyId: 'defaults',
      title: 'Defaults',
      board: { width: 8, height: 8, timeDepth: 8 },
      start: { x: 0, y: 0, t: 0 },
      goal: { type: 'ReachExit', target: { x: 7, y: 7, t: 0 } },
      layout: {},
      actors: {},
    })

    expect(normalized.rulesIntent.interaction.maxPushChain).toBe(4)
    expect(normalized.rulesIntent.detection.maxDistance).toBe(2)
    expect(normalized.themeIntent.iconPackId).toBe('default-mono')
    expect(normalized.difficultyIntent.tier).toBe('normal')
    expect(normalized.interactives.boxes).toEqual([])
    expect(normalized.interactives.rifts).toEqual([])
    expect(normalized.actors.enemies).toEqual([])
  })
})
