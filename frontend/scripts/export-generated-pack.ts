import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { generateMapPack } from '../src/data/generation/index'
import {
  appendGeneratedPackToManifest,
  exportGeneratedPackToPublicFiles,
} from '../src/data/generation/export'
import type { PublicContentPackManifest } from '../src/data/loader'

interface CliArgs {
  seed: string
  packId: string
  difficulty: 'easy' | 'normal' | 'hard'
  width: number
  height: number
  timeDepth: number
  maxAttempts?: number
  outSubdir: string
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback
  }

  const parsed = Number(value)

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return fallback
  }

  return parsed
}

function parseArgs(argv: string[]): CliArgs {
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

  const seed = args.get('seed') ?? `seed-${Date.now()}`
  const packId = args.get('pack-id') ?? seed.replace(/[^a-zA-Z0-9_-]/g, '-')
  const difficultyRaw = args.get('difficulty')
  const difficulty =
    difficultyRaw === 'easy' || difficultyRaw === 'hard' ? difficultyRaw : 'normal'

  return {
    seed,
    packId,
    difficulty,
    width: parseNumber(args.get('width'), 12),
    height: parseNumber(args.get('height'), 12),
    timeDepth: parseNumber(args.get('time-depth'), 16),
    maxAttempts: args.has('max-attempts')
      ? parseNumber(args.get('max-attempts'), 20)
      : undefined,
    outSubdir: args.get('out-subdir') ?? 'generated',
  }
}

function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function loadManifest(manifestPath: string): Promise<PublicContentPackManifest> {
  try {
    const raw = await readFile(manifestPath, 'utf8')
    const parsed = JSON.parse(raw) as PublicContentPackManifest

    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.packs)) {
      return { schemaVersion: 1, packs: [] }
    }

    return parsed
  } catch {
    return { schemaVersion: 1, packs: [] }
  }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2))
  const generated = generateMapPack({
    seed: cli.seed,
    board: {
      width: cli.width,
      height: cli.height,
      timeDepth: cli.timeDepth,
    },
    difficulty: cli.difficulty,
    maxAttempts: cli.maxAttempts,
  })

  if (!generated.ok) {
    console.error(
      `[gen:pack] generation failed: ${generated.error.kind}${
        'message' in generated.error ? ` (${generated.error.message})` : ''
      }`,
    )
    process.exitCode = 1
    return
  }

  const publicDataDir = path.resolve(process.cwd(), 'public/data')
  const manifestPath = path.join(publicDataDir, 'index.json')
  const outputPackId = cli.outSubdir.length > 0 ? `${cli.outSubdir}/${cli.packId}` : cli.packId
  const exported = exportGeneratedPackToPublicFiles(outputPackId, generated.value.content)

  for (const [fileName, content] of Object.entries(exported.files)) {
    const targetPath = path.join(publicDataDir, fileName)
    await mkdir(path.dirname(targetPath), { recursive: true })
    await writeFile(targetPath, content, 'utf8')
  }

  const manifest = await loadManifest(manifestPath)
  const nextManifest = appendGeneratedPackToManifest(manifest, {
    id: outputPackId,
    name: `Generated ${cli.seed}`,
  })
  await writeFile(manifestPath, prettyJson(nextManifest), 'utf8')

  console.log(`[gen:pack] wrote pack "${outputPackId}"`)
  console.log(
    `[gen:pack] board=${generated.value.content.level.map.width}x${generated.value.content.level.map.height}, timeDepth=${generated.value.content.level.map.timeDepth}, quality=${generated.value.metadata.qualityScore}, attempt=${generated.value.metadata.attempt}`,
  )
}

main().catch((error) => {
  console.error('[gen:pack] unexpected error', error)
  process.exitCode = 1
})
