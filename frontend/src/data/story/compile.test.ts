import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { compileStorySpecToPack } from './compile'
import { normalizeStorySpec } from './normalize'
import { validateStorySpec } from './validate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixturesDir = path.resolve(__dirname, './fixtures')

async function loadFixture(name: string): Promise<unknown> {
  const raw = await readFile(path.join(fixturesDir, name), 'utf8')
  return JSON.parse(raw) as unknown
}

describe('compileStorySpecToPack', () => {
  it('compiles normalized StorySpec into a valid deterministic content pack', async () => {
    const fixture = await loadFixture('basic-story-spec.json')
    const validated = validateStorySpec(fixture)

    expect(validated.ok).toBe(true)
    if (!validated.ok) {
      throw new Error(validated.error.issues.map((issue) => issue.path).join(', '))
    }

    const normalized = normalizeStorySpec(validated.value)
    const first = compileStorySpecToPack(normalized)
    const second = compileStorySpecToPack(normalized)

    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    if (!first.ok || !second.ok) {
      return
    }

    expect(JSON.stringify(first.value.content)).toBe(JSON.stringify(second.value.content))
    expect(first.value.manifestEntry.class).toBe('experimental')
    expect(first.value.manifestEntry.difficulty).toBe('hard')
    expect(first.value.progressionSuggestion.difficultyFlavor).toBe(
      'Compression under temporal pressure.',
    )
  })

  it('rejects invalid pack ids', async () => {
    const fixture = await loadFixture('basic-story-spec.json')
    const validated = validateStorySpec(fixture)

    expect(validated.ok).toBe(true)
    if (!validated.ok) {
      return
    }

    const normalized = normalizeStorySpec(validated.value)
    const compiled = compileStorySpecToPack(normalized, { packId: 'bad pack id' })

    expect(compiled.ok).toBe(false)
    if (compiled.ok) {
      return
    }

    expect(compiled.error.kind).toBe('InvalidPackId')
  })
})
