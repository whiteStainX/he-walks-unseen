import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { resolveStorySpecProvider } from '../src/data/story/provider'
import { formatStoryProviderError } from '../src/data/story/provider/types'
import { normalizeStorySpec } from '../src/data/story/normalize'
import type { StorySpecGenerationConstraints } from '../src/data/story/provider/types'
import { parseArgMap } from './story-shared'

interface CliArgs {
  prompt?: string
  promptFile?: string
  out?: string
  model?: string
  baseUrl?: string
  storyIdHint?: string
  tier?: 'easy' | 'normal' | 'hard' | 'expert'
  width?: number
  height?: number
  timeDepth?: number
  maxEnemies?: number
  maxRifts?: number
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
  const tierCandidate = args.get('tier')

  return {
    prompt: args.get('prompt'),
    promptFile: args.get('prompt-file'),
    out: args.get('out'),
    model: args.get('model'),
    baseUrl: args.get('base-url'),
    storyIdHint: args.get('story-id-hint'),
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
  }
}

function resolveOutputPath(out: string | undefined, storyId: string): string {
  if (out && out.length > 0) {
    return path.resolve(process.cwd(), out)
  }

  return path.resolve(process.cwd(), `public/data/story-spec/${storyId}.json`)
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

  if (
    !args.storyIdHint &&
    !args.tier &&
    !hasBoard &&
    args.maxEnemies === undefined &&
    args.maxRifts === undefined
  ) {
    return undefined
  }

  return {
    storyIdHint: args.storyIdHint,
    tier: args.tier,
    board: hasBoard ? board : undefined,
    maxEnemies: args.maxEnemies,
    maxRifts: args.maxRifts,
  }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2))
  const prompt = await resolvePrompt(cli)

  if (!prompt) {
    console.error('[story:spec] provide --prompt <text> or --prompt-file <path>')
    process.exitCode = 1
    return
  }

  const provider = resolveStorySpecProvider({
    ollama: {
      baseUrl: cli.baseUrl,
      model: cli.model,
    },
  })

  if (!provider.ok) {
    console.error(`[story:spec] provider error: ${provider.error.provider}`)
    process.exitCode = 1
    return
  }

  const generated = await provider.value.generateStorySpec({
    prompt,
    constraints: toConstraints(cli),
  })

  if (!generated.ok) {
    console.error(`[story:spec] generation failed: ${formatStoryProviderError(generated.error)}`)
    process.exitCode = 1
    return
  }

  const normalized = normalizeStorySpec(generated.value)
  const outputPath = resolveOutputPath(cli.out, normalized.storyId)

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(generated.value, null, 2)}\n`, 'utf8')

  console.log(`[story:spec] wrote ${outputPath}`)
  console.log(`[story:spec] storyId=${normalized.storyId} title="${normalized.title}"`)
}

main().catch((error) => {
  console.error('[story:spec] unexpected error', error)
  process.exitCode = 1
})
