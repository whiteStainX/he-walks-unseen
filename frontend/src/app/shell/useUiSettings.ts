import { useEffect, useState } from 'react'

import { defaultUiSettings, UI_SETTINGS_STORAGE_KEY, type UiSettings } from './constants'

function loadUiSettings(): UiSettings {
  if (typeof window === 'undefined') {
    return defaultUiSettings
  }

  const raw = window.localStorage.getItem(UI_SETTINGS_STORAGE_KEY)

  if (!raw) {
    return defaultUiSettings
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UiSettings>

    return {
      showIsoPanel: parsed.showIsoPanel ?? defaultUiSettings.showIsoPanel,
      compactHints: parsed.compactHints ?? defaultUiSettings.compactHints,
      defaultDangerPreview: parsed.defaultDangerPreview ?? defaultUiSettings.defaultDangerPreview,
    }
  } catch {
    return defaultUiSettings
  }
}

export function useUiSettings() {
  const [uiSettings, setUiSettings] = useState(loadUiSettings)
  const [showDangerPreview, setShowDangerPreview] = useState(
    () => loadUiSettings().defaultDangerPreview,
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(uiSettings))
  }, [uiSettings])

  return {
    uiSettings,
    setUiSettings,
    showDangerPreview,
    setShowDangerPreview,
  }
}
