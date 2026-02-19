import type { RefObject } from 'react'

import type { ProgressionManifest } from '../../data/progression'
import type { PackDisplayMeta } from './useContentPackLoading'
import type { ProgressionSnapshot } from './useProgressionState'

interface ProgressionOverlayProps {
  isOpen: boolean
  overlayRef: RefObject<HTMLElement | null>
  progressionManifest: ProgressionManifest | null
  progressionState: ProgressionSnapshot | null
  progressionError: string | null
  packMetaById: Record<string, PackDisplayMeta>
  currentContentPackId: string
  onSelectTrack: (trackId: string) => void
  onSelectEntryIndex: (index: number) => void
  onLoadPack: (packId: string) => void
}

export function ProgressionOverlay({
  isOpen,
  overlayRef,
  progressionManifest,
  progressionState,
  progressionError,
  packMetaById,
  currentContentPackId,
  onSelectTrack,
  onSelectEntryIndex,
  onLoadPack,
}: ProgressionOverlayProps) {
  if (!isOpen) {
    return null
  }

  if (!progressionManifest || !progressionState) {
    return (
      <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Progression">
        <section className="overlay-window progression-window" ref={overlayRef} tabIndex={-1}>
          <header className="overlay-header">
            <h2>Progression</h2>
            <p>G / Esc: close</p>
          </header>
          <div className="overlay-body progression-body">
            <p className="empty-log">
              {progressionError
                ? `Progression unavailable (${progressionError}).`
                : 'Loading progression...'}
            </p>
          </div>
        </section>
      </div>
    )
  }

  const selectedTrack =
    progressionManifest.tracks.find((track) => track.id === progressionState.selectedTrackId) ??
    progressionManifest.tracks[0] ??
    null

  const selectedTrackIndex = selectedTrack
    ? progressionManifest.tracks.findIndex((track) => track.id === selectedTrack.id)
    : -1

  const selectedEntryIndex = selectedTrack
    ? Math.min(
        Math.max(0, progressionState.currentEntryIndex),
        Math.max(0, selectedTrack.entries.length - 1),
      )
    : 0

  return (
    <div className="overlay-backdrop" role="dialog" aria-modal="true" aria-label="Progression">
      <section className="overlay-window progression-window" ref={overlayRef} tabIndex={-1}>
        <header className="overlay-header">
          <h2>Progression</h2>
          <p>G / Esc close | Arrows navigate | Enter load</p>
        </header>
        <div className="overlay-body progression-body">
          {selectedTrack ? (
            <>
              <div className="progression-track-bar">
                <button
                  type="button"
                  className="progression-track-button"
                  onClick={() => {
                    if (progressionManifest.tracks.length <= 1) {
                      return
                    }

                    const previousIndex =
                      selectedTrackIndex <= 0
                        ? progressionManifest.tracks.length - 1
                        : selectedTrackIndex - 1
                    onSelectTrack(progressionManifest.tracks[previousIndex].id)
                  }}
                >
                  Prev
                </button>
                <p className="progression-track-label">
                  Track {selectedTrackIndex + 1}/{progressionManifest.tracks.length}: {selectedTrack.id}
                </p>
                <button
                  type="button"
                  className="progression-track-button"
                  onClick={() => {
                    if (progressionManifest.tracks.length <= 1) {
                      return
                    }

                    const nextIndex =
                      selectedTrackIndex >= progressionManifest.tracks.length - 1
                        ? 0
                        : selectedTrackIndex + 1
                    onSelectTrack(progressionManifest.tracks[nextIndex].id)
                  }}
                >
                  Next
                </button>
              </div>

              <div className="progression-entry-list">
                {selectedTrack.entries.map((entry, index) => {
                  const unlocked = progressionState.unlockedPackIds.includes(entry.packId)
                  const completed = progressionState.completedPackIds.includes(entry.packId)
                  const isSelected = index === selectedEntryIndex
                  const isCurrent = entry.packId === currentContentPackId
                  const packMeta = packMetaById[entry.packId]
                  const difficulty = entry.difficulty ?? packMeta?.difficulty ?? 'n/a'
                  const packClass = packMeta?.class ?? 'n/a'
                  const stateLabel = completed ? 'complete' : unlocked ? 'unlocked' : 'locked'

                  return (
                    <button
                      key={`${selectedTrack.id}-${index}-${entry.packId}`}
                      type="button"
                      className={[
                        'progression-entry',
                        isSelected ? 'is-selected' : '',
                        unlocked ? 'is-unlocked' : 'is-locked',
                        completed ? 'is-complete' : '',
                        isCurrent ? 'is-current' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        onSelectEntryIndex(index)
                      }}
                      onDoubleClick={() => {
                        if (unlocked) {
                          onLoadPack(entry.packId)
                        }
                      }}
                    >
                      <span className="progression-entry-col progression-entry-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="progression-entry-col progression-entry-name">
                        {entry.title ?? entry.packId}
                      </span>
                      <span className="progression-entry-col progression-entry-id">{entry.packId}</span>
                      <span className="progression-entry-col progression-entry-class">{packClass}</span>
                      <span className="progression-entry-col progression-entry-difficulty">{difficulty}</span>
                      <span className="progression-entry-col progression-entry-state">{stateLabel}</span>
                      <span className="progression-entry-col progression-entry-current">
                        {isCurrent ? 'current' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="empty-log">No progression tracks defined.</p>
          )}
        </div>
      </section>
    </div>
  )
}
