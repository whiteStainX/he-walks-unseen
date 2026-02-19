import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'

import type { Direction2D } from '../../core/position'
import type { AppDispatch } from '../../game/store'
import {
  applyRift,
  configureRiftSettings,
  restart,
  setContentPackId,
  setInteractionConfig,
  setStatus,
  waitTurn,
} from '../../game/gameSlice'
import {
  closeTopLayer,
  pushDirectionalInput,
  selectDirectionalMode,
  toggleActionMenu,
  toggleLogOverlay,
  toggleProgressionOverlay,
  toggleStateOverlay,
  toggleSystemMenu,
  type DirectionalActionMode,
  type InputStateMachine,
} from '../inputStateMachine'
import type { ProgressionManifest } from '../../data/progression'
import type { ProgressionSnapshot } from './useProgressionState'

function directionForKey(key: string): Direction2D | null {
  switch (key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      return 'north'
    case 'a':
    case 'A':
    case 'ArrowLeft':
      return 'west'
    case 's':
    case 'S':
    case 'ArrowDown':
      return 'south'
    case 'd':
    case 'D':
    case 'ArrowRight':
      return 'east'
    default:
      return null
  }
}

interface UseKeyboardControlsInput {
  dispatch: AppDispatch
  inputMachine: InputStateMachine
  isActionMenuOpen: boolean
  isProgressionOverlayOpen: boolean
  availablePackIds: string[]
  contentPackId: string
  riftDefaultDelta: number
  interactionMaxPushChain: number
  progressionManifest: ProgressionManifest | null
  progressionState: ProgressionSnapshot | null
  setSelectedTrack: (trackId: string) => void
  setCurrentEntryIndex: (index: number) => void
  applyMachineTransition: (nextMachine: InputStateMachine) => void
  dispatchDirectionalIntent: (intent: { mode: DirectionalActionMode; direction: Direction2D }) => void
  setShowDangerPreview: Dispatch<SetStateAction<boolean>>
}

export function useKeyboardControls(input: UseKeyboardControlsInput) {
  const {
    dispatch,
    inputMachine,
    isActionMenuOpen,
    isProgressionOverlayOpen,
    availablePackIds,
    contentPackId,
    riftDefaultDelta,
    interactionMaxPushChain,
    progressionManifest,
    progressionState,
    setSelectedTrack,
    setCurrentEntryIndex,
    applyMachineTransition,
    dispatchDirectionalIntent,
    setShowDangerPreview,
  } = input

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      const direction = directionForKey(event.key)

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        applyMachineTransition(toggleActionMenu(inputMachine))
        return
      }

      if (event.key === 'Tab') {
        event.preventDefault()
        applyMachineTransition(toggleStateOverlay(inputMachine))
        return
      }

      if (event.key === 'l' || event.key === 'L') {
        event.preventDefault()
        applyMachineTransition(toggleLogOverlay(inputMachine))
        return
      }

      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault()
        applyMachineTransition(toggleSystemMenu(inputMachine))
        return
      }

      if (event.key === 'g' || event.key === 'G') {
        event.preventDefault()
        applyMachineTransition(toggleProgressionOverlay(inputMachine))
        return
      }

      if (event.key === 'Escape') {
        const next = closeTopLayer(inputMachine)

        if (next !== inputMachine) {
          event.preventDefault()
          applyMachineTransition(next)
          return
        }
      }

      if (isActionMenuOpen) {
        if (event.key === '1') {
          event.preventDefault()
          applyMachineTransition(selectDirectionalMode(inputMachine, 'Move'))
          return
        }

        if (event.key === '2') {
          event.preventDefault()
          applyMachineTransition(selectDirectionalMode(inputMachine, 'Push'))
          return
        }

        if (event.key === '3') {
          event.preventDefault()
          applyMachineTransition(selectDirectionalMode(inputMachine, 'Pull'))
          return
        }
      }

      if (isProgressionOverlayOpen) {
        event.preventDefault()

        if (!progressionManifest || !progressionState) {
          return
        }

        const trackCount = progressionManifest.tracks.length
        const selectedTrackIndex = progressionManifest.tracks.findIndex(
          (track) => track.id === progressionState.selectedTrackId,
        )
        const activeTrackIndex = selectedTrackIndex < 0 ? 0 : selectedTrackIndex
        const selectedTrack = progressionManifest.tracks[activeTrackIndex]

        if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
          if (trackCount > 1) {
            const nextTrackIndex = activeTrackIndex <= 0 ? trackCount - 1 : activeTrackIndex - 1
            setSelectedTrack(progressionManifest.tracks[nextTrackIndex].id)
          }
          return
        }

        if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
          if (trackCount > 1) {
            const nextTrackIndex = activeTrackIndex >= trackCount - 1 ? 0 : activeTrackIndex + 1
            setSelectedTrack(progressionManifest.tracks[nextTrackIndex].id)
          }
          return
        }

        if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
          if (selectedTrack) {
            const nextIndex = Math.max(0, progressionState.currentEntryIndex - 1)
            setCurrentEntryIndex(nextIndex)
          }
          return
        }

        if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
          if (selectedTrack) {
            const maxIndex = Math.max(0, selectedTrack.entries.length - 1)
            const nextIndex = Math.min(maxIndex, progressionState.currentEntryIndex + 1)
            setCurrentEntryIndex(nextIndex)
          }
          return
        }

        if (event.key === 'Enter' && selectedTrack) {
          const entry = selectedTrack.entries[progressionState.currentEntryIndex]

          if (!entry) {
            return
          }

          // 14C allows direct browsing/load of any listed pack.
          // Unlock gating/policy is finalized in 14D.
          dispatch(setContentPackId(entry.packId))
          applyMachineTransition(closeTopLayer(inputMachine))
        }

        return
      }

      if (direction) {
        event.preventDefault()
        const result = pushDirectionalInput(inputMachine, direction)

        if (result.immediate) {
          dispatchDirectionalIntent(result.immediate)
        }

        return
      }

      if (inputMachine.layer !== 'Gameplay') {
        return
      }

      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault()
        setShowDangerPreview((enabled) => !enabled)
        return
      }

      if (event.key === 'v' || event.key === 'V') {
        event.preventDefault()
        if (availablePackIds.length > 0) {
          const currentIndex = availablePackIds.findIndex((id) => id === contentPackId)
          const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % availablePackIds.length
          dispatch(setContentPackId(availablePackIds[nextIndex]))
        }
        return
      }

      if (event.key === ' ') {
        event.preventDefault()
        dispatch(applyRift(undefined))
        return
      }

      if (event.key === '[') {
        event.preventDefault()
        dispatch(configureRiftSettings({ defaultDelta: Math.max(1, riftDefaultDelta - 1) }))
        return
      }

      if (event.key === ']') {
        event.preventDefault()
        dispatch(configureRiftSettings({ defaultDelta: riftDefaultDelta + 1 }))
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        dispatch(waitTurn())
        return
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        dispatch(restart())
        return
      }

      if (event.key === '-') {
        event.preventDefault()
        dispatch(
          setInteractionConfig({
            maxPushChain: Math.max(1, interactionMaxPushChain - 1),
          }),
        )
        return
      }

      if (event.key === '=') {
        event.preventDefault()
        dispatch(
          setInteractionConfig({
            maxPushChain: interactionMaxPushChain + 1,
          }),
        )
        return
      }

      if (event.key === 'q' || event.key === 'Q') {
        event.preventDefault()
        dispatch(setStatus('Quit is not wired in web build.'))
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [
    availablePackIds,
    contentPackId,
    dispatch,
    applyMachineTransition,
    dispatchDirectionalIntent,
    inputMachine,
    interactionMaxPushChain,
    isActionMenuOpen,
    isProgressionOverlayOpen,
    progressionManifest,
    progressionState,
    riftDefaultDelta,
    setCurrentEntryIndex,
    setSelectedTrack,
    setShowDangerPreview,
  ])
}
