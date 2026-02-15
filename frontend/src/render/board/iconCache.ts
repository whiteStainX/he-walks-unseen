import type { Result } from '../../core/result'
import type { IconPackConfig } from '../../data/contracts'
import { loadIconPackFromPublic, type PublicContentLoadError } from '../../data/loader'

const iconPackPromiseCache = new Map<string, Promise<Result<IconPackConfig, PublicContentLoadError>>>()
const iconImagePromiseCache = new Map<string, Promise<HTMLImageElement | null>>()

function cacheKey(basePath: string, packId: string): string {
  return `${basePath}::${packId}`
}

function imageCacheKey(packId: string, slot: string): string {
  return `${packId}::${slot}`
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

export function loadIconPackCached(
  packId: string,
  basePath = '/data/icons',
): Promise<Result<IconPackConfig, PublicContentLoadError>> {
  const key = cacheKey(basePath, packId)
  const cached = iconPackPromiseCache.get(key)

  if (cached) {
    return cached
  }

  const request = loadIconPackFromPublic({ basePath, packId })
  iconPackPromiseCache.set(key, request)
  return request
}

export function loadIconSlotImageCached(
  iconPack: IconPackConfig,
  slot: string,
): Promise<HTMLImageElement | null> {
  const key = imageCacheKey(iconPack.id, slot)
  const cached = iconImagePromiseCache.get(key)

  if (cached) {
    return cached
  }

  const slotAsset = iconPack.slots[slot]

  if (!slotAsset) {
    return Promise.resolve(null)
  }

  const request = loadImage(slotAsset.svg)
  iconImagePromiseCache.set(key, request)
  return request
}

export async function warmIconPackSlots(
  iconPack: IconPackConfig,
): Promise<Record<string, HTMLImageElement>> {
  const entries = await Promise.all(
    Object.keys(iconPack.slots).map(async (slot) => {
      const image = await loadIconSlotImageCached(iconPack, slot)
      return [slot, image] as const
    }),
  )

  const loaded: Record<string, HTMLImageElement> = {}

  for (const [slot, image] of entries) {
    if (image) {
      loaded[slot] = image
    }
  }

  return loaded
}
