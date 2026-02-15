export interface CanvasTheme {
  boardBackground: string
  playerFill: string
  playerStroke: string
  pastSelfFill: string
  pastSelfStroke: string
  objectFill: string
  objectStroke: string
  objectGlyph: string
  dangerMarkerStroke: string
  dangerMarkerFill: string
}

export interface IsoTheme {
  background: string
  layerFill: string
  layerFillFocus: string
  layerLine: string
  layerLineFocus: string
  objectFill: string
  objectStroke: string
  enemyFill: string
  enemyStroke: string
  exitFill: string
  exitStroke: string
  selfFill: string
  selfStroke: string
  pastSelfFill: string
  pastSelfStroke: string
  worldLine: string
}

export interface AppTheme {
  cssVars: Record<string, string>
  canvas: CanvasTheme
  iso: IsoTheme
}

export const minimalMonoTheme: AppTheme = {
  cssVars: {
    '--ink': '#111111',
    '--paper': '#ffffff',
    '--panel': '#ffffff',
    '--accent': '#111111',
    '--grid': '#111111',
    '--border': '#111111',
    '--muted': '#666666',
    '--ui-bg': '#ffffff',
    '--ui-fg': '#111111',
    '--ui-muted': '#6a6a6a',
    '--ui-line': '#111111',
    '--ui-fill-selected': '#111111',
    '--ui-fill-alt': '#efefef',
    '--ui-font-title': "'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif",
    '--ui-font-mono': "'IBM Plex Mono', 'SFMono-Regular', 'Menlo', monospace",
  },
  canvas: {
    boardBackground: '#ffffff',
    playerFill: '#111111',
    playerStroke: '#111111',
    pastSelfFill: '#9a9a9a',
    pastSelfStroke: '#4d4d4d',
    objectFill: '#efefef',
    objectStroke: '#111111',
    objectGlyph: '#111111',
    dangerMarkerStroke: '#111111',
    dangerMarkerFill: '#cfcfcf',
  },
  iso: {
    background: '#ffffff',
    layerFill: '#f6f6f6',
    layerFillFocus: '#ececec',
    layerLine: '#777777',
    layerLineFocus: '#111111',
    objectFill: '#efefef',
    objectStroke: '#111111',
    enemyFill: '#c9c9c9',
    enemyStroke: '#111111',
    exitFill: '#ffffff',
    exitStroke: '#111111',
    selfFill: '#111111',
    selfStroke: '#111111',
    pastSelfFill: '#9a9a9a',
    pastSelfStroke: '#4d4d4d',
    worldLine: '#111111',
  },
}

export function applyCssVars(cssVars: Record<string, string>): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  for (const [name, value] of Object.entries(cssVars)) {
    root.style.setProperty(name, value)
  }
}

export function applyThemeCssVars(theme: AppTheme): void {
  applyCssVars(theme.cssVars)
}
