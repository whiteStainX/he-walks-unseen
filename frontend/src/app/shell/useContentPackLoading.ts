import { useEffect } from 'react'

import {
  loadBootContentFromPublic,
  loadContentPackManifestFromPublic,
  type PublicContentPackClass,
} from '../../data/loader'
import type { AppDispatch } from '../../game/store'
import { applyLoadedContent, setContentPackId, setStatus } from '../../game/gameSlice'

export interface PackDisplayMeta {
  class?: PublicContentPackClass
  difficulty?: string
}

export function useContentPackManifest(
  setAvailablePackIds: (ids: string[]) => void,
  setPackMetaById: (meta: Record<string, PackDisplayMeta>) => void,
) {
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const manifest = await loadContentPackManifestFromPublic('/data')

      if (cancelled || !manifest.ok) {
        return
      }

      const packIds = manifest.value.packs.map((pack) => pack.id)
      const packMetaById: Record<string, PackDisplayMeta> = {}

      for (const pack of manifest.value.packs) {
        packMetaById[pack.id] = {
          class: pack.class,
          difficulty: pack.difficulty,
        }
      }

      if (packIds.length > 0) {
        setAvailablePackIds(packIds)
      }

      setPackMetaById(packMetaById)
    })()

    return () => {
      cancelled = true
    }
  }, [setAvailablePackIds, setPackMetaById])
}

export function useEnsureSelectedContentPack(
  dispatch: AppDispatch,
  availablePackIds: string[],
  contentPackId: string,
) {
  useEffect(() => {
    if (availablePackIds.length === 0) {
      return
    }

    if (!availablePackIds.includes(contentPackId)) {
      dispatch(setContentPackId(availablePackIds[0]))
    }
  }, [availablePackIds, contentPackId, dispatch])
}

export function useLoadSelectedContentPack(dispatch: AppDispatch, contentPackId: string) {
  useEffect(() => {
    let cancelled = false

    void (async () => {
      const loaded = await loadBootContentFromPublic({ packId: contentPackId })

      if (cancelled) {
        return
      }

      if (!loaded.ok) {
        dispatch(setStatus(`Content load failed (${contentPackId}): ${loaded.error.kind}`))
        return
      }

      dispatch(applyLoadedContent({ packId: contentPackId, content: loaded.value }))
    })()

    return () => {
      cancelled = true
    }
  }, [contentPackId, dispatch])
}
