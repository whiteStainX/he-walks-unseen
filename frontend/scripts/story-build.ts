import path from 'node:path'
import process from 'node:process'
import { readFile } from 'node:fs/promises'

import { evaluatePackClassPolicy } from '../src/data/packPolicy'
import { evaluateDifficultyV1 } from '../src/data/difficulty/evaluator'
import { validateDifficultyModelConfig, validateIconPackConfig, validateLevelSymbolSlots } from '../src/data/validate'
import { compileStorySpecToPack } from '../src/data/story/compile'
import { normalizeStorySpec } from '../src/data/story/normalize'
import { resolveStorySpecProvider } from '../src/data/story/provider'
import { formatStoryProviderError, type StorySpecGenerationConstraints } from '../src/data/story/provider/types'
import { resolveStoryPromotionDecision } from '../src/data/story/promotion'
import { validateStorySpec } from '../src/data/story/validate'
import type { ContentPack, DifficultyTier } from '../src/data/contracts'
import {
  loadManifestOrEmpty,
  parseArgMap,
  readJson,
  upsertManifestEntry,
  writeJson,
  writePackFiles,
} from './story-shared'

interface CliArgs {
  specPath?: string
  prompt?: string
  promptFile?: string
  outDir: string
  manifestPath: string
  packId?: string
  reviewed: boolean
  promoteClass?: 'generated' | 'hybrid' | 'curated'
  modelPath: string
  storySpecOut?: string
  model?: string
  baseUrl?: string
  tier?: DifficultyTier
  width?: number
  height?: number
  timeDepth?: number
  maxEnemies?: number
  maxRifts?: number
  author?: string
}

interface GateSummary {
  passed: boolean
  failures: string[]
  warnings: string[]
  measuredTier?: DifficultyTier
  measuredScore?: number
  measuredVector?: {
    spatialPressure: number
    temporalPressure: number
    detectionPressure: number
    interactionComplexity: number
    paradoxRisk: number
  }
  modelVersion?: string
}

function parseIntegerArg(value: string | undefined): number | undefined {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined
  }

  return parsed
}

function parseArgs(argv: string[]): CliArgs {
  const args = parseArgMap(argv)
  const promoteClassCandidate = args.get('promote-class')
  const tierCandidate = args.get('tier')

  return {
    specPath: args.get('spec'),
    prompt: args.get('prompt'),
    promptFile: args.get('prompt-file'),
    outDir: path.resolve(process.cwd(), args.get('out-dir') ?? 'public/data'),
    manifestPath: path.resolve(
      process.cwd(),
      args.get('manifest') ?? path.join(args.get('out-dir') ?? 'public/data', 'index.json'),
    ),
    packId: args.get('pack-id'),
    reviewed: args.get('reviewed') === 'true',
    promoteClass:
      promoteClassCandidate === 'generated' ||
      promoteClassCandidate === 'hybrid' ||
      promoteClassCandidate === 'curated'
        ? promoteClassCandidate
        : undefined,
    modelPath: path.resolve(
      process.cwd(),
      args.get('difficulty-model') ??
        path.join(args.get('out-dir') ?? 'public/data', 'difficulty.model.v1.json'),
    ),
    storySpecOut: args.get('story-spec-out')
      ? path.resolve(process.cwd(), args.get('story-spec-out')!)
      : undefined,
    model: args.get('model') ?? args.get('ollama-model') ?? args.get('model-name') ?? args.get('llm-model'),
    baseUrl: args.get('base-url'),
    tier:
      tierCandidate === 'easy' ||
      tierCandidate === 'normal' ||
      tierCandidate === 'hard' ||
      tierCandidate === 'expert'
        ? tierCandidate
        : undefined,
    width: parseIntegerArg(args.get('width')),
    height: parseIntegerArg(args.get('height')),
    timeDepth: parseIntegerArg(args.get('time-depth')),
    maxEnemies: parseIntegerArg(args.get('max-enemies')),
    maxRifts: parseIntegerArg(args.get('max-rifts')),
    author: args.get('author'),
  }
}

async function resolvePrompt(args: CliArgs): Promise<string | null> {
  if (args.prompt && args.prompt.trim().length > 0) {
    return args.prompt.trim()
  }

  if (!args.promptFile) {
    return null
  }

  const raw = await readFile(path.resolve(process.cwd(), args.promptFile), 'utf8')
  const prompt = raw.trim()

  return prompt.length > 0 ? prompt : null
}

function toConstraints(args: CliArgs): StorySpecGenerationConstraints | undefined {
  const board = {
    width: args.width,
    height: args.height,
    timeDepth: args.timeDepth,
  }
  const hasBoard = board.width !== undefined || board.height !== undefined || board.timeDepth !== undefined

  if (!args.tier && !hasBoard && args.maxEnemies === undefined && args.maxRifts === undefined) {
    return undefined
  }

  return {
    tier: args.tier,
    board: hasBoard ? board : undefined,
    maxEnemies: args.maxEnemies,
    maxRifts: args.maxRifts,
  }
}

function resolveStorySpecOutputPath(
  storyId: string,
  explicitPath: string | undefined,
  outDir: string,
): string {
  if (explicitPath && explicitPath.length > 0) {
    return explicitPath
  }

  return path.resolve(outDir, `story-spec/${storyId}.generated.json`)
}

async function runValidationGates(input: {
  outDir: string
  packId: string
  content: ContentPack
  difficultyModelPath: string
  gateClass: 'generated' | 'hybrid' | 'curated'
  authoredDifficulty: DifficultyTier
}): Promise<GateSummary> {
  const failures: string[] = []
  const warnings: string[] = []

  const iconPackRaw = await readJson(path.join(input.outDir, 'icons', `${input.content.theme.iconPackId}.pack.json`))

  if (!iconPackRaw.ok) {
    failures.push(`icon pack read failed: ${iconPackRaw.error}`)
  } else {
    const iconPack = validateIconPackConfig(iconPackRaw.value)

    if (!iconPack.ok) {
      failures.push(`icon pack invalid: ${iconPack.error.kind}`)
    } else {
      const symbolValidation = validateLevelSymbolSlots(input.content.level, iconPack.value)

      if (!symbolValidation.ok) {
        failures.push(`symbol validation failed: ${symbolValidation.error.kind}`)
      }
    }
  }

  const policy = evaluatePackClassPolicy({
    entry: {
      id: input.packId,
      class: input.gateClass,
      difficulty: input.authoredDifficulty,
    },
    content: input.content,
  })

  warnings.push(...policy.warnings)

  if (!policy.ok) {
    failures.push(`pack policy failed: ${policy.failureReason ?? 'unknown policy failure'}`)
  }

  const modelRaw = await readJson(input.difficultyModelPath)

  if (!modelRaw.ok) {
    failures.push(`difficulty model read failed: ${modelRaw.error}`)
    return {
      passed: failures.length === 0,
      failures,
      warnings,
    }
  }

  const model = validateDifficultyModelConfig(modelRaw.value)

  if (!model.ok) {
    if (model.error.kind === 'InvalidDifficultyModel') {
      failures.push(`difficulty model invalid: ${model.error.path} ${model.error.message}`)
    } else {
      failures.push(`difficulty model invalid schemaVersion: expected ${model.error.expected}`)
    }

    return {
      passed: failures.length === 0,
      failures,
      warnings,
    }
  }

  const evaluation = evaluateDifficultyV1(input.content, model.value)

  return {
    passed: failures.length === 0,
    failures,
    warnings,
    measuredTier: evaluation.tier,
    measuredScore: evaluation.score,
    measuredVector: evaluation.vector,
    modelVersion: evaluation.modelVersion,
  }
}

async function resolveStorySpec(cli: CliArgs): Promise<
  | { ok: true; value: ReturnType<typeof normalizeStorySpec>; source: 'file' | 'llm'; raw: unknown }
  | { ok: false; error: string }
> {
  if (cli.specPath) {
    const specRaw = await readJson(path.resolve(process.cwd(), cli.specPath))

    if (!specRaw.ok) {
      return {
        ok: false,
        error: `failed to read spec: ${specRaw.error}`,
      }
    }

    const validated = validateStorySpec(specRaw.value)

    if (!validated.ok) {
      return {
        ok: false,
        error: validated.error.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; '),
      }
    }

    return {
      ok: true,
      value: normalizeStorySpec(validated.value),
      source: 'file',
      raw: validated.value,
    }
  }

  const prompt = await resolvePrompt(cli)

  if (!prompt) {
    return {
      ok: false,
      error: 'provide --spec <file> or --prompt/--prompt-file',
    }
  }

  const provider = resolveStorySpecProvider({
    ollama: {
      baseUrl: cli.baseUrl,
      model: cli.model,
    },
  })

  if (!provider.ok) {
    return {
      ok: false,
      error: `provider selection failed: ${provider.error.provider}`,
    }
  }

  const generated = await provider.value.generateStorySpec({
    prompt,
    constraints: toConstraints(cli),
  })

  if (!generated.ok) {
    return {
      ok: false,
      error: formatStoryProviderError(generated.error),
    }
  }

  return {
    ok: true,
    value: normalizeStorySpec(generated.value),
    source: 'llm',
    raw: generated.value,
  }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2))
  const storySpec = await resolveStorySpec(cli)

  if (!storySpec.ok) {
    console.error(`[story:build] ${storySpec.error}`)
    process.exitCode = 1
    return
  }

  const specOutputPath = resolveStorySpecOutputPath(storySpec.value.storyId, cli.storySpecOut, cli.outDir)
  await writeJson(specOutputPath, storySpec.raw)

  const compiled = compileStorySpecToPack(storySpec.value, {
    packId: cli.packId,
    packClass: 'experimental',
    author: cli.author,
  })

  if (!compiled.ok) {
    if (compiled.error.kind === 'CompileValidationFailed') {
      console.error(`[story:build] compile validation failed: ${compiled.error.error.kind}`)
    } else {
      console.error(`[story:build] compile failed: ${compiled.error.message}`)
    }

    process.exitCode = 1
    return
  }

  await writePackFiles({
    publicDataDir: cli.outDir,
    packId: compiled.value.packId,
    content: compiled.value.content,
  })

  const gateClass = cli.promoteClass === 'curated' ? 'generated' : cli.promoteClass ?? 'generated'
  const gates = await runValidationGates({
    outDir: cli.outDir,
    packId: compiled.value.packId,
    content: compiled.value.content,
    difficultyModelPath: cli.modelPath,
    gateClass,
    authoredDifficulty: compiled.value.manifestEntry.difficulty ?? 'normal',
  })

  const promotion = resolveStoryPromotionDecision({
    gatesPassed: gates.passed,
    reviewed: cli.reviewed,
    requestedClass: cli.promoteClass,
  })

  if (!promotion.ok) {
    console.error(`[story:build] promotion policy error: ${promotion.error.message}`)
    process.exitCode = 1
    return
  }

  const manifestEntry = {
    ...compiled.value.manifestEntry,
    class: promotion.value.packClass,
    difficulty: gates.measuredTier ?? compiled.value.manifestEntry.difficulty,
    difficultyMeta:
      gates.measuredTier &&
      gates.measuredScore !== undefined &&
      gates.measuredVector &&
      gates.modelVersion
        ? {
            score: gates.measuredScore,
            vector: gates.measuredVector,
            source: 'measured' as const,
            modelVersion: gates.modelVersion,
          }
        : undefined,
  }

  const manifest = await loadManifestOrEmpty(cli.manifestPath)
  const nextManifest = upsertManifestEntry(manifest, manifestEntry)
  await writeJson(cli.manifestPath, nextManifest)

  console.log(`[story:build] pack=${compiled.value.packId}`)
  console.log(`[story:build] spec=${specOutputPath} (${storySpec.source})`)
  console.log(`[story:build] class=${promotion.value.packClass} promoted=${promotion.value.promoted}`)

  for (const warning of gates.warnings) {
    console.warn(`[story:build] warning: ${warning}`)
  }

  if (gates.failures.length > 0) {
    console.error(`[story:build] gate failures (${gates.failures.length}):`)

    for (const failure of gates.failures) {
      console.error(`- ${failure}`)
    }

    process.exitCode = 1
    return
  }

  if (!promotion.value.promoted) {
    console.log(`[story:build] staged only: ${promotion.value.reason}`)
    return
  }

  console.log('[story:build] gates passed and manifest promoted')
}

main().catch((error) => {
  console.error('[story:build] unexpected error', error)
  process.exitCode = 1
})
