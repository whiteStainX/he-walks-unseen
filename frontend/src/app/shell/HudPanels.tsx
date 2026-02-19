import type { DirectionalActionMode } from '../inputStateMachine'
import type { GamePhase } from '../../game/gameSlice'
import type { DirectionalOption } from './constants'

interface HudPanelsProps {
  directionalActionMode: DirectionalActionMode
  isActionMenuOpen: boolean
  directionalOptions: DirectionalOption[]
  turn: number
  currentTime: number
  phase: GamePhase
  riftDefaultDelta: number
  showDangerPreview: boolean
  status: string
}

export function HudPanels({
  directionalActionMode,
  isActionMenuOpen,
  directionalOptions,
  turn,
  currentTime,
  phase,
  riftDefaultDelta,
  showDangerPreview,
  status,
}: HudPanelsProps) {
  return (
    <aside className="hud-stack" aria-label="HUD Panel">
      <section className="ui-window command-window" aria-label="Command Window">
        <h2 className="ui-window-title">Command</h2>
        <div className="ui-window-body">
          <p className="window-note">Mode: {directionalActionMode}</p>
          <div className="command-meta command-meta-compact">
            <span>F Menu</span>
            <span>G Levels</span>
            <span>Space Rift</span>
            <span>Enter Wait</span>
            <span>R Restart</span>
          </div>
          {isActionMenuOpen ? (
            <div className="command-list">
              {directionalOptions.map((option) => (
                <div
                  key={option.mode}
                  className={[
                    'command-row',
                    directionalActionMode === option.mode ? 'is-selected' : '',
                    isActionMenuOpen ? 'is-menu-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="command-key">{option.keyLabel}</span>
                  <span className="command-text">{option.mode}</span>
                  <span className="command-desc">{option.description}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="ui-window state-window" aria-label="State Window">
        <h2 className="ui-window-title">State</h2>
        <div className="ui-window-body">
          <div className="metric-grid">
            <div className="metric-item">
              <span className="metric-label">Turn</span>
              <span className="metric-value">{turn}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Time</span>
              <span className="metric-value">{currentTime}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Phase</span>
              <span className="metric-value">{phase}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Rift Delta</span>
              <span className="metric-value">-{riftDefaultDelta}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Danger</span>
              <span className="metric-value">{showDangerPreview ? 'on' : 'off'}</span>
            </div>
          </div>
          <p className="window-note state-zoom-note">Tab: details</p>
        </div>
      </section>

      <section className="ui-window log-window" aria-label="Log Window">
        <h2 className="ui-window-title">Log</h2>
        <div className="ui-window-body log-body-compact">
          <p className="window-note status-line" role="status" aria-live="polite">
            {status}
          </p>
        </div>
      </section>
    </aside>
  )
}
