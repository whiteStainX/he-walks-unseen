import type { PublicContentPackManifest } from '../loader'
import type { ContentPack } from '../contracts'

export interface GeneratedPackExport {
  packId: string
  files: Record<string, string>
}

function withTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`
}

function stableJson(value: unknown): string {
  return withTrailingNewline(JSON.stringify(value, null, 2))
}

/**
 * Serialize a generated content pack into public-data-compatible file payloads.
 */
export function exportGeneratedPackToPublicFiles(
  packId: string,
  content: ContentPack,
): GeneratedPackExport {
  return {
    packId,
    files: {
      [`${packId}.level.json`]: stableJson(content.level),
      [`${packId}.behavior.json`]: stableJson(content.behavior),
      [`${packId}.theme.json`]: stableJson(content.theme),
      [`${packId}.rules.json`]: stableJson(content.rules),
    },
  }
}

/**
 * Return a manifest copy that includes the generated pack entry exactly once.
 */
export function appendGeneratedPackToManifest(
  manifest: PublicContentPackManifest,
  entry: { id: string; name?: string },
): PublicContentPackManifest {
  const withoutDup = manifest.packs.filter((pack) => pack.id !== entry.id)

  return {
    schemaVersion: 1,
    packs: [
      ...withoutDup,
      {
        id: entry.id,
        name: entry.name,
      },
    ],
  }
}
