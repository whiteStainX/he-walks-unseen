import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import type { ContentPack, DifficultyTier } from '../src/data/contracts'
import { parsePublicContentPackManifest, type PublicContentPackManifestEntry } from '../src/data/loader'
import { validateContentPack } from '../src/data/validate'
import { validateDifficultyModelConfig } from '../src/data/validate'
import { evaluateDifficultyV1 } from '../src/data/difficulty/evaluator'
import { validateDifficultyOverridePolicy } from '../src/data/difficulty/policy'

interface CliArgs {
  all: boolean
  packId?: string
  manifestPath: string
  publicDataDir: string
  modelPath: string
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

  const publicDataDir = path.resolve(process.cwd(), args.get('public-data-dir') ?? 'public/data')
  const manifestPath = path.resolve(
    process.cwd(),
    args.get('manifest') ?? path.join(publicDataDir, 'index.json'),
  )
  const modelPath = path.resolve(
    process.cwd(),
    args.get('model') ?? path.join(publicDataDir, 'difficulty.model.v1.json'),
  )

  return {
    all: args.get('all') === 'true',
    packId: args.get('pack-id'),
    manifestPath,
    publicDataDir,
    modelPath,
  }
}

async function readJson(filePath: string): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    const raw = await readFile(filePath, 'utf8')
    return { ok: true, value: JSON.parse(raw) as unknown }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown read/parse error',
    }
  }
}

function toTier(value: string | undefined): DifficultyTier | undefined {
  if (value === 'easy' || value === 'normal' || value === 'hard' || value === 'expert') {
    return value
  }

  return undefined
}

async function loadPackFromPublicData(
  publicDataDir: string,
  entry: PublicContentPackManifestEntry,
): Promise<
  | { ok: true; value: ContentPack }
  | { ok: false; error: string }
> {
  const levelPath = path.join(publicDataDir, `${entry.id}.level.json`)
  const behaviorPath = path.join(publicDataDir, `${entry.id}.behavior.json`)
  const rulesPath = path.join(publicDataDir, `${entry.id}.rules.json`)
  const themePath = path.join(publicDataDir, `${entry.id}.theme.json`)

  const [level, behavior, rules, theme] = await Promise.all([
    readJson(levelPath),
    readJson(behaviorPath),
    readJson(rulesPath),
    readJson(themePath),
  ])

  if (!level.ok) {
    return { ok: false, error: `level load failed (${entry.id}): ${level.error}` }
  }

  if (!behavior.ok) {
    return { ok: false, error: `behavior load failed (${entry.id}): ${behavior.error}` }
  }

  if (!rules.ok) {
    return { ok: false, error: `rules load failed (${entry.id}): ${rules.error}` }
  }

  if (!theme.ok) {
    return { ok: false, error: `theme load failed (${entry.id}): ${theme.error}` }
  }

  const validated = validateContentPack({
    level: level.value,
    behavior: behavior.value,
    rules: rules.value,
    theme: theme.value,
  })

  if (!validated.ok) {
    return { ok: false, error: `content validation failed (${entry.id}): ${validated.error.kind}` }
  }

  return { ok: true, value: validated.value }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2))
  const manifestRaw = await readJson(cli.manifestPath)

  if (!manifestRaw.ok) {
    console.error(`[eval:difficulty] manifest read failed: ${manifestRaw.error}`)
    process.exitCode = 1
    return
  }

  const manifest = parsePublicContentPackManifest(manifestRaw.value)

  if (!manifest.ok) {
    console.error(`[eval:difficulty] invalid manifest: ${manifest.error.message}`)
    process.exitCode = 1
    return
  }

  const modelRaw = await readJson(cli.modelPath)

  if (!modelRaw.ok) {
    console.error(`[eval:difficulty] model read failed: ${modelRaw.error}`)
    process.exitCode = 1
    return
  }

  const model = validateDifficultyModelConfig(modelRaw.value)

  if (!model.ok) {
    const reason =
      model.error.kind === 'InvalidDifficultyModel'
        ? `${model.error.path}: ${model.error.message}`
        : `expected ${model.error.expected}, got ${String(model.error.actual)}`
    console.error(`[eval:difficulty] invalid model: ${reason}`)
    process.exitCode = 1
    return
  }

  const entries = cli.all
    ? manifest.value.packs
    : cli.packId
      ? manifest.value.packs.filter((entry) => entry.id === cli.packId)
      : []

  if (!cli.all && !cli.packId) {
    console.error('[eval:difficulty] provide --all or --pack-id <id>')
    process.exitCode = 1
    return
  }

  if (!cli.all && cli.packId && entries.length === 0) {
    console.error(`[eval:difficulty] pack id not found in manifest: ${cli.packId}`)
    process.exitCode = 1
    return
  }

  let failed = 0

  for (const entry of entries) {
    const loaded = await loadPackFromPublicData(cli.publicDataDir, entry)

    if (!loaded.ok) {
      failed += 1
      console.error(`[eval:difficulty] fail: ${loaded.error}`)
      continue
    }

    const evaluation = evaluateDifficultyV1(loaded.value, model.value)
    const authoredTier = toTier(entry.difficulty)
    const override = validateDifficultyOverridePolicy({
      model: model.value,
      override: {
        measuredTier: evaluation.tier,
        source: entry.difficultyMeta?.source ?? 'measured',
        authoredTier,
        note: entry.difficultyMeta?.note,
      },
    })

    if (!override.ok) {
      failed += 1
      console.error(
        `[eval:difficulty] fail: override policy validation failed (${entry.id}): ${override.error.kind}`,
      )
      continue
    }

    console.log(
      JSON.stringify({
        packId: entry.id,
        modelVersion: evaluation.modelVersion,
        measured: {
          tier: evaluation.tier,
          score: evaluation.score,
          vector: evaluation.vector,
        },
        manifest: {
          difficulty: entry.difficulty,
          difficultyMeta: entry.difficultyMeta,
        },
        override: override.value,
      }),
    )
  }

  if (failed > 0) {
    console.error(`[eval:difficulty] ${failed}/${entries.length} pack(s) failed`)
    process.exitCode = 1
    return
  }

  console.log(`[eval:difficulty] ${entries.length} pack(s) evaluated`)
}

main().catch((error) => {
  console.error('[eval:difficulty] unexpected error', error)
  process.exitCode = 1
})
