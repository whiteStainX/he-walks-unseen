import type { RefObject } from 'react'

import type { InteractionHistoryEntry } from '../../game/gameSlice'
import { actionSummary } from './actionSummary'

interface LogOverlayProps {
  isOpen: boolean
  overlayRef: RefObject<HTMLElement | null>
  history: InteractionHistoryEntry[]
}

export function LogOverlay({ isOpen, overlayRef, history }: LogOverlayProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Action Log">
      <section className="overlay-window" ref={overlayRef} tabIndex={-1}>
        <header className="overlay-header">
          <h2>Action Log</h2>
          <p>L / Esc: close</p>
        </header>
        <div className="overlay-body">
          {history.length === 0 ? (
            <p className="empty-log">No actions yet.</p>
          ) : (
            history
              .slice()
              .reverse()
              .map((entry) => (
                <div className="log-row" key={`${entry.turn}-${entry.action.kind}`}>
                  <span className="log-turn">T{entry.turn}</span>
                  <span className="log-text">{actionSummary(entry)}</span>
                </div>
              ))
          )}
        </div>
      </section>
    </div>
  )
}
