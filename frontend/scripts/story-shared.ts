import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { Result } from '../src/core/result'
import { exportGeneratedPackToPublicFiles } from '../src/data/generation/export'
import {
  parsePublicContentPackManifest,
  type PublicContentPackManifest,
  type PublicContentPackManifestEntry,
} from '../src/data/loader'
import type { ContentPack } from '../src/data/contracts'

export function parseArgMap(argv: string[]): Map<string, string> {
  const args = new Map<string, string>()

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (!token.startsWith('--')) {
      continue
    }

    const key = token.slice(2)
    const next = argv[index + 1]

    if (!next || next.startsWith('--')) {
      args.set(key, 'true')
      continue
    }

    args.set(key, next)
    index += 1
  }

  return args
}

export async function readJson(filePath: string): Promise<Result<unknown, string>> {
  try {
    const raw = await readFile(filePath, 'utf8')
    return {
      ok: true,
      value: JSON.parse(raw) as unknown,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown read/parse error',
    }
  }
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function writePackFiles(options: {
  publicDataDir: string
  packId: string
  content: ContentPack
}): Promise<string[]> {
  const exported = exportGeneratedPackToPublicFiles(options.packId, options.content)
  const written: string[] = []

  for (const [fileName, payload] of Object.entries(exported.files)) {
    const targetPath = path.join(options.publicDataDir, fileName)
    await mkdir(path.dirname(targetPath), { recursive: true })
    await writeFile(targetPath, payload, 'utf8')
    written.push(targetPath)
  }

  return written.sort((a, b) => a.localeCompare(b))
}

export async function loadManifestOrEmpty(manifestPath: string): Promise<PublicContentPackManifest> {
  const raw = await readJson(manifestPath)

  if (!raw.ok) {
    return {
      schemaVersion: 1,
      packs: [],
    }
  }

  const parsed = parsePublicContentPackManifest(raw.value)

  if (!parsed.ok) {
    return {
      schemaVersion: 1,
      packs: [],
    }
  }

  return parsed.value
}

export function upsertManifestEntry(
  manifest: PublicContentPackManifest,
  entry: PublicContentPackManifestEntry,
): PublicContentPackManifest {
  const withoutCurrent = manifest.packs.filter((pack) => pack.id !== entry.id)

  return {
    schemaVersion: 1,
    packs: [...withoutCurrent, entry],
  }
}
