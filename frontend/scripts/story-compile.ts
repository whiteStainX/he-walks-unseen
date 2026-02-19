import path from 'node:path'
import process from 'node:process'

import { compileStorySpecToPack } from '../src/data/story/compile'
import { normalizeStorySpec } from '../src/data/story/normalize'
import { validateStorySpec } from '../src/data/story/validate'
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
  packId?: string
  outDir: string
  manifestPath?: string
  packClass?: 'experimental' | 'generated' | 'hybrid' | 'curated'
  tags: string[]
  author?: string
  sourceSeed?: string
  sourceProfileId?: string
  progressionSuggestionPath?: string
}

function parseArgs(argv: string[]): CliArgs {
  const args = parseArgMap(argv)
  const classCandidate = args.get('class')
  const tagsRaw = args.get('tags')

  return {
    specPath: args.get('spec'),
    packId: args.get('pack-id'),
    outDir: path.resolve(process.cwd(), args.get('out-dir') ?? 'public/data'),
    manifestPath: args.get('manifest')
      ? path.resolve(process.cwd(), args.get('manifest')!)
      : undefined,
    packClass:
      classCandidate === 'experimental' ||
      classCandidate === 'generated' ||
      classCandidate === 'hybrid' ||
      classCandidate === 'curated'
        ? classCandidate
        : undefined,
    tags: tagsRaw ? tagsRaw.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0) : [],
    author: args.get('author'),
    sourceSeed: args.get('source-seed'),
    sourceProfileId: args.get('source-profile-id'),
    progressionSuggestionPath: args.get('progression-suggestion')
      ? path.resolve(process.cwd(), args.get('progression-suggestion')!)
      : undefined,
  }
}

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2))

  if (!cli.specPath) {
    console.error('[story:compile] provide --spec <path-to-story-spec.json>')
    process.exitCode = 1
    return
  }

  const specRaw = await readJson(path.resolve(process.cwd(), cli.specPath))

  if (!specRaw.ok) {
    console.error(`[story:compile] failed to load spec: ${specRaw.error}`)
    process.exitCode = 1
    return
  }

  const validated = validateStorySpec(specRaw.value)

  if (!validated.ok) {
    console.error(
      `[story:compile] invalid StorySpec: ${validated.error.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; ')}`,
    )
    process.exitCode = 1
    return
  }

  const normalized = normalizeStorySpec(validated.value)
  const compiled = compileStorySpecToPack(normalized, {
    packId: cli.packId,
    packClass: cli.packClass,
    tags: cli.tags,
    author: cli.author,
    sourceSeed: cli.sourceSeed,
    sourceProfileId: cli.sourceProfileId,
  })

  if (!compiled.ok) {
    if (compiled.error.kind === 'CompileValidationFailed') {
      console.error(`[story:compile] compile validation failed: ${compiled.error.error.kind}`)
    } else {
      console.error(`[story:compile] ${compiled.error.message}`)
    }

    process.exitCode = 1
    return
  }

  const writtenFiles = await writePackFiles({
    publicDataDir: cli.outDir,
    packId: compiled.value.packId,
    content: compiled.value.content,
  })

  if (cli.manifestPath) {
    const manifest = await loadManifestOrEmpty(cli.manifestPath)
    const nextManifest = upsertManifestEntry(manifest, compiled.value.manifestEntry)
    await writeJson(cli.manifestPath, nextManifest)
    console.log(`[story:compile] manifest updated: ${cli.manifestPath}`)
  }

  if (cli.progressionSuggestionPath) {
    await writeJson(cli.progressionSuggestionPath, compiled.value.progressionSuggestion)
    console.log(`[story:compile] progression suggestion: ${cli.progressionSuggestionPath}`)
  }

  console.log(`[story:compile] pack=${compiled.value.packId}`)
  console.log(`[story:compile] files=${writtenFiles.length}`)
}

main().catch((error) => {
  console.error('[story:compile] unexpected error', error)
  process.exitCode = 1
})
