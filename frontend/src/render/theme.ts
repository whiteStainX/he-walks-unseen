export interface CanvasTheme {
  boardBackground: string
  playerFill: string
  playerStroke: string
  pastSelfFill: string
  pastSelfStroke: string
  objectFill: string
  objectStroke: string
  objectGlyph: string
}

export interface AppTheme {
  cssVars: Record<string, string>
  canvas: CanvasTheme
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
  },
}

export function applyThemeCssVars(theme: AppTheme): void {
  if (typeof document === 'undefined') {
    return
  }

  const root = document.documentElement

  for (const [name, value] of Object.entries(theme.cssVars)) {
    root.style.setProperty(name, value)
  }
}
