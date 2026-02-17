import type { DirectionalActionMode } from '../inputStateMachine'

export interface DirectionalOption {
  mode: DirectionalActionMode
  keyLabel: '1' | '2' | '3'
  description: string
}

export interface UiSettings {
  showIsoPanel: boolean
  compactHints: boolean
  defaultDangerPreview: boolean
}

export const DEFAULT_PACK_SEQUENCE = ['default', 'variant']
export const UI_SETTINGS_STORAGE_KEY = 'he-walks-unseen.ui-settings.v1'

export const defaultUiSettings: UiSettings = {
  showIsoPanel: true,
  compactHints: false,
  defaultDangerPreview: false,
}

export const directionalOptions: DirectionalOption[] = [
  { mode: 'Move', keyLabel: '1', description: 'Normal movement' },
  { mode: 'Push', keyLabel: '2', description: 'Push chain forward' },
  { mode: 'Pull', keyLabel: '3', description: 'Pull from behind' },
]
