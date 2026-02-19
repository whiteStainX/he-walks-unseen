import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { validateStorySpec } from './validate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.resolve(__dirname, '../../../public/data/story-spec/examples')

async function readFixture(name: string): Promise<unknown> {
  const raw = await readFile(path.join(fixturesDir, name), 'utf8')
  return JSON.parse(raw) as unknown
}

describe('validateStorySpec', () => {
  it('accepts valid StorySpec fixture', async () => {
    const fixture = await readFixture('minimal.valid.json')
    const validated = validateStorySpec(fixture)

    expect(validated.ok).toBe(true)
    if (!validated.ok) {
      throw new Error(validated.error.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
    }

    expect(validated.value.storyId).toBe('Echoes In Hall')
    expect(validated.value.actors.enemies?.length).toBe(1)
  })

  it('rejects unknown fields in strict mode with stable issue ordering', async () => {
    const fixture = await readFixture('invalid.unknown-field.json')
    const validated = validateStorySpec(fixture)

    expect(validated.ok).toBe(false)
    if (validated.ok) {
      return
    }

    expect(validated.error.issues.map((issue) => issue.path)).toEqual([
      'storySpec.board.depthAlias',
      'storySpec.unexpected',
    ])
  })

  it('allows unknown fields when strict mode is disabled', async () => {
    const fixture = await readFixture('invalid.unknown-field.json')
    const validated = validateStorySpec(fixture, { strict: false })

    expect(validated.ok).toBe(true)
  })

  it('reports out-of-bounds positions', () => {
    const validated = validateStorySpec({
      schemaVersion: 1,
      storyId: 'oob',
      title: 'oob',
      board: { width: 4, height: 4, timeDepth: 2 },
      start: { x: 0, y: 0, t: 0 },
      goal: { type: 'ReachExit', target: { x: 8, y: 8, t: 0 } },
      layout: { walls: [] },
      actors: { enemies: [] },
    })

    expect(validated.ok).toBe(false)
    if (validated.ok) {
      return
    }

    expect(validated.error.issues.some((issue) => issue.path === 'storySpec.goal.target')).toBe(true)
  })
})
