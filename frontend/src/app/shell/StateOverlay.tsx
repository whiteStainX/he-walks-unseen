import type { RefObject } from 'react'

import type { DirectionalActionMode } from '../inputStateMachine'
import type { GamePhase } from '../../game/gameSlice'
import type { Position3D } from '../../core/position'
import type { InteractionConfig } from '../../game/interactions/types'
import type { PublicPackDifficultyMeta } from '../../data/loader'

interface StateOverlayProps {
  isOpen: boolean
  overlayRef: RefObject<HTMLElement | null>
  boardWidth: number
  boardHeight: number
  timeDepth: number
  turn: number
  currentTime: number
  phase: GamePhase
  directionalActionMode: DirectionalActionMode
  riftDefaultDelta: number
  interactionConfig: InteractionConfig
  showDangerPreview: boolean
  objectsAtCurrentTimeCount: number
  player: Position3D | null
  contentPackId: string
  contentPackClass?: string
  contentPackDifficulty?: string
  contentPackDifficultyMeta?: PublicPackDifficultyMeta
  contentPackDifficultyFlavor?: string
  contentPackDifficultyTarget?: string
}

export function StateOverlay({
  isOpen,
  overlayRef,
  boardWidth,
  boardHeight,
  timeDepth,
  turn,
  currentTime,
  phase,
  directionalActionMode,
  riftDefaultDelta,
  interactionConfig,
  showDangerPreview,
  objectsAtCurrentTimeCount,
  player,
  contentPackId,
  contentPackClass,
  contentPackDifficulty,
  contentPackDifficultyMeta,
  contentPackDifficultyFlavor,
  contentPackDifficultyTarget,
}: StateOverlayProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="State Details">
      <section className="overlay-window" ref={overlayRef} tabIndex={-1}>
        <header className="overlay-header">
          <h2>State Details</h2>
          <p>Tab / Esc: close</p>
        </header>
        <div className="overlay-body state-overlay-body">
          <section className="state-block">
            <h3 className="state-block-title">Core</h3>
            <div className="metric-grid">
              <div className="metric-item">
                <span className="metric-label">Board</span>
                <span className="metric-value">{boardWidth} x {boardHeight}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Depth</span>
                <span className="metric-value">{timeDepth}</span>
              </div>
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
                <span className="metric-label">Mode</span>
                <span className="metric-value">{directionalActionMode}</span>
              </div>
            </div>
          </section>

          <section className="state-block">
            <h3 className="state-block-title">Tools</h3>
            <div className="metric-grid">
              <div className="metric-item">
                <span className="metric-label">Rift Delta</span>
                <span className="metric-value">-{riftDefaultDelta}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Push Max</span>
                <span className="metric-value">{interactionConfig.maxPushChain}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Pull</span>
                <span className="metric-value">{interactionConfig.allowPull ? 'on' : 'off'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Danger</span>
                <span className="metric-value">{showDangerPreview ? 'on' : 'off'}</span>
              </div>
            </div>
          </section>

          <section className="state-block">
            <h3 className="state-block-title">Snapshot</h3>
            <div className="metric-grid metric-grid-single">
              <div className="metric-item">
                <span className="metric-label">Slice Objects</span>
                <span className="metric-value">{objectsAtCurrentTimeCount}</span>
              </div>
              <div className="metric-item metric-item-wide">
                <span className="metric-label">Player</span>
                <span className="metric-value">
                  {player ? `${player.x},${player.y},t=${player.t}` : 'N/A'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Content Pack</span>
                <span className="metric-value">{contentPackId}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Pack Class</span>
                <span className="metric-value">{contentPackClass ?? 'n/a'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Difficulty</span>
                <span className="metric-value">{contentPackDifficulty ?? 'n/a'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Diff Source</span>
                <span className="metric-value">{contentPackDifficultyMeta?.source ?? 'n/a'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Diff Score</span>
                <span className="metric-value">
                  {contentPackDifficultyMeta ? contentPackDifficultyMeta.score.toFixed(2) : 'n/a'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Diff Model</span>
                <span className="metric-value">{contentPackDifficultyMeta?.modelVersion ?? 'n/a'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Diff Target</span>
                <span className="metric-value">{contentPackDifficultyTarget ?? 'n/a'}</span>
              </div>
              <div className="metric-item metric-item-wide">
                <span className="metric-label">Flavor</span>
                <span className="metric-value">{contentPackDifficultyFlavor ?? 'n/a'}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Spatial</span>
                <span className="metric-value">
                  {contentPackDifficultyMeta
                    ? contentPackDifficultyMeta.vector.spatialPressure.toFixed(2)
                    : 'n/a'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Temporal</span>
                <span className="metric-value">
                  {contentPackDifficultyMeta
                    ? contentPackDifficultyMeta.vector.temporalPressure.toFixed(2)
                    : 'n/a'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Detect</span>
                <span className="metric-value">
                  {contentPackDifficultyMeta
                    ? contentPackDifficultyMeta.vector.detectionPressure.toFixed(2)
                    : 'n/a'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Interact</span>
                <span className="metric-value">
                  {contentPackDifficultyMeta
                    ? contentPackDifficultyMeta.vector.interactionComplexity.toFixed(2)
                    : 'n/a'}
                </span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Paradox</span>
                <span className="metric-value">
                  {contentPackDifficultyMeta
                    ? contentPackDifficultyMeta.vector.paradoxRisk.toFixed(2)
                    : 'n/a'}
                </span>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
