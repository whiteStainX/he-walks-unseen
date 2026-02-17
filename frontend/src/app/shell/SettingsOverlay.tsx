import type { Dispatch, RefObject, SetStateAction } from 'react'

import type { UiSettings } from './constants'

interface SettingsOverlayProps {
  isOpen: boolean
  overlayRef: RefObject<HTMLElement | null>
  uiSettings: UiSettings
  setUiSettings: Dispatch<SetStateAction<UiSettings>>
  setShowDangerPreview: Dispatch<SetStateAction<boolean>>
}

export function SettingsOverlay({
  isOpen,
  overlayRef,
  uiSettings,
  setUiSettings,
  setShowDangerPreview,
}: SettingsOverlayProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Settings">
      <section className="overlay-window settings-window" ref={overlayRef} tabIndex={-1}>
        <header className="overlay-header">
          <h2>Settings</h2>
          <p>M / Esc: close</p>
        </header>
        <div className="overlay-body settings-body">
          <label className="settings-row" htmlFor="setting-iso-panel">
            <span>Show isometric panel</span>
            <input
              id="setting-iso-panel"
              type="checkbox"
              checked={uiSettings.showIsoPanel}
              onChange={(event) => {
                setUiSettings((settings) => ({
                  ...settings,
                  showIsoPanel: event.target.checked,
                }))
              }}
            />
          </label>
          <label className="settings-row" htmlFor="setting-compact-hints">
            <span>Compact bottom hints</span>
            <input
              id="setting-compact-hints"
              type="checkbox"
              checked={uiSettings.compactHints}
              onChange={(event) => {
                setUiSettings((settings) => ({
                  ...settings,
                  compactHints: event.target.checked,
                }))
              }}
            />
          </label>
          <label className="settings-row" htmlFor="setting-default-danger">
            <span>Default danger preview</span>
            <input
              id="setting-default-danger"
              type="checkbox"
              checked={uiSettings.defaultDangerPreview}
              onChange={(event) => {
                const nextValue = event.target.checked

                setUiSettings((settings) => ({
                  ...settings,
                  defaultDangerPreview: nextValue,
                }))
                setShowDangerPreview(nextValue)
              }}
            />
          </label>
        </div>
      </section>
    </div>
  )
}
