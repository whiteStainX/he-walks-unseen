import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { type ContentLoadError } from '../src/data/contracts'
import {
  parsePublicContentPackManifest,
  type PublicContentPackManifestEntry,
} from '../src/data/loader'
import {
  validateContentPack,
  validateIconPackConfig,
  validateLevelSymbolSlots,
} from '../src/data/validate'
import { evaluatePackClassPolicy } from '../src/data/packPolicy'

interface CliArgs {
  all: boolean
  packId?: string
  manifestPath: string
  publicDataDir: string
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

  return {
    all: args.get('all') === 'true',
    packId: args.get('pack-id'),
    manifestPath,
    publicDataDir,
  }
}

function formatContentLoadError(error: ContentLoadError): string {
  switch (error.kind) {
    case 'InvalidShape':
      return `${error.kind} (${error.file}): ${error.message}`
    case 'InvalidSchemaVersion':
      return `${error.kind} (${error.file}): expected ${error.expected}, got ${String(error.actual)}`
    case 'MissingIconPackId':
      return `${error.kind}: theme=${error.themeId}`
    case 'UnknownArchetypeReference':
      return `${error.kind}: instance=${error.instanceId}, archetype=${error.archetype}`
    case 'InvalidRiftTarget':
      return `${error.kind}: archetype=${error.archetype}`
    case 'ConflictingRiftSource':
      return `${error.kind}: archetype=${error.archetype}`
    case 'InvalidBehaviorPathPoint':
      return `${error.kind}: key=${error.key}`
    case 'UnknownBehaviorReference':
      return `${error.kind}: instance=${error.instanceId}, behavior=${error.behavior}`
    case 'UnknownBehaviorAssignmentInstance':
      return `${error.kind}: instance=${error.instanceId}`
    case 'UnknownDetectionProfileReference':
      return `${error.kind}: instance=${error.instanceId}, profile=${error.profile}`
    case 'InvalidDetectionProfile':
      return `${error.kind}: key=${error.key}, message=${error.message}`
    case 'InvalidIconSlotReference':
      return `${error.kind}: archetype=${error.archetype}, symbol=${error.symbol}`
    case 'InvalidMapBounds':
      return `${error.kind}: ${error.width}x${error.height}, depth=${error.timeDepth}`
    case 'InvalidStartPosition':
      return `${error.kind}: (${error.start.x},${error.start.y},t=${error.start.t})`
    case 'UnsupportedBehaviorPolicy':
      return `${error.kind}: key=${error.key}, kind=${error.policyKind}`
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

async function validatePackAtPath(
  publicDataDir: string,
  entry: PublicContentPackManifestEntry,
): Promise<{ ok: true } | { ok: false; message: string }> {
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
    return { ok: false, message: `level load failed (${entry.id}): ${level.error}` }
  }

  if (!behavior.ok) {
    return { ok: false, message: `behavior load failed (${entry.id}): ${behavior.error}` }
  }

  if (!rules.ok) {
    return { ok: false, message: `rules load failed (${entry.id}): ${rules.error}` }
  }

  if (!theme.ok) {
    return { ok: false, message: `theme load failed (${entry.id}): ${theme.error}` }
  }

  const content = validateContentPack({
    level: level.value,
    behavior: behavior.value,
    rules: rules.value,
    theme: theme.value,
  })

  if (!content.ok) {
    return {
      ok: false,
      message: `content validation failed (${entry.id}): ${formatContentLoadError(content.error)}`,
    }
  }

  const iconPackPath = path.join(publicDataDir, 'icons', `${content.value.theme.iconPackId}.pack.json`)
  const iconPackRaw = await readJson(iconPackPath)

  if (!iconPackRaw.ok) {
    return { ok: false, message: `icon pack load failed (${entry.id}): ${iconPackRaw.error}` }
  }

  const iconPack = validateIconPackConfig(iconPackRaw.value)

  if (!iconPack.ok) {
    return {
      ok: false,
      message: `icon pack validation failed (${entry.id}): ${formatContentLoadError(iconPack.error)}`,
    }
  }

  const symbolValidation = validateLevelSymbolSlots(content.value.level, iconPack.value)

  if (!symbolValidation.ok) {
    return {
      ok: false,
      message: `symbol validation failed (${entry.id}): ${formatContentLoadError(symbolValidation.error)}`,
    }
  }

  const policy = evaluatePackClassPolicy({
    entry,
    content: content.value,
  })

  for (const warning of policy.warnings) {
    console.warn(`[validate:pack] warn (${entry.id}): ${warning}`)
  }

  if (!policy.ok) {
    return {
      ok: false,
      message: `policy validation failed (${entry.id}): ${policy.failureReason ?? 'unknown policy failure'}`,
    }
  }

  return { ok: true }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2))
  const manifestRaw = await readJson(cli.manifestPath)

  if (!manifestRaw.ok) {
    console.error(`[validate:pack] manifest read failed: ${manifestRaw.error}`)
    process.exitCode = 1
    return
  }

  const manifest = parsePublicContentPackManifest(manifestRaw.value)

  if (!manifest.ok) {
    console.error(`[validate:pack] invalid manifest: ${manifest.error.message}`)
    process.exitCode = 1
    return
  }

  const entries = cli.all
    ? manifest.value.packs
    : cli.packId
      ? manifest.value.packs.filter((entry) => entry.id === cli.packId)
      : []

  if (!cli.all && !cli.packId) {
    console.error('[validate:pack] provide --all or --pack-id <id>')
    process.exitCode = 1
    return
  }

  if (!cli.all && cli.packId && entries.length === 0) {
    console.error(`[validate:pack] pack id not found in manifest: ${cli.packId}`)
    process.exitCode = 1
    return
  }

  let failed = 0

  for (const entry of entries) {
    const validated = await validatePackAtPath(cli.publicDataDir, entry)

    if (validated.ok) {
      console.log(`[validate:pack] ok: ${entry.id}`)
      continue
    }

    failed += 1
    console.error(`[validate:pack] fail: ${validated.message}`)
  }

  if (failed > 0) {
    console.error(`[validate:pack] ${failed}/${entries.length} pack(s) failed`)
    process.exitCode = 1
    return
  }

  console.log(`[validate:pack] ${entries.length} pack(s) validated`)
}

main().catch((error) => {
  console.error('[validate:pack] unexpected error', error)
  process.exitCode = 1
})
