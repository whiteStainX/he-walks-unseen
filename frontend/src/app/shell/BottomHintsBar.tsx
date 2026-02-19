import type { UiSettings } from './constants'

interface BottomHintsBarProps {
  uiSettings: UiSettings
}

export function BottomHintsBar({ uiSettings }: BottomHintsBarProps) {
  const bottomHints = uiSettings.compactHints
    ? ['F Menu', 'G Levels', 'Tab State', 'WASD/Arrows', 'Space Rift', 'Enter Wait', 'M Settings', 'R Restart']
    : [
        'F Menu',
        'G Levels',
        '1/2/3 Mode',
        'Tab State',
        'WASD/Arrows Direction',
        'Space Rift',
        'Enter Wait',
        'L Log',
        'P Danger',
        'V Pack',
        '[ ] Rift +/-',
        '- = Push Max +/-',
        'M Settings',
        'R Restart',
      ]

  return (
    <footer className={['bottom-bar', uiSettings.compactHints ? 'is-compact' : ''].filter(Boolean).join(' ')}>
      {bottomHints.map((hint) => (
        <span key={hint}>{hint}</span>
      ))}
    </footer>
  )
}
