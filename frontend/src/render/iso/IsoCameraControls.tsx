import { OrbitControls } from '@react-three/drei'
import type { RefObject } from 'react'
import { MOUSE } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

import type { IsoPathMode } from './trajectory'

interface IsoControlBarProps {
  pathMode: IsoPathMode
  onPathModeChange: (mode: IsoPathMode) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

export function IsoControlBar({
  pathMode,
  onPathModeChange,
  onZoomIn,
  onZoomOut,
  onReset,
}: IsoControlBarProps) {
  return (
    <div className="iso-controls" aria-label="Isometric camera controls">
      <button
        type="button"
        className="iso-control-button"
        onClick={onZoomOut}
        aria-label="Zoom out isometric view"
      >
        -
      </button>
      <button
        type="button"
        className="iso-control-button"
        onClick={onZoomIn}
        aria-label="Zoom in isometric view"
      >
        +
      </button>
      <button
        type="button"
        className="iso-control-button"
        onClick={onReset}
        aria-label="Reset isometric view"
      >
        Reset
      </button>
      <button
        type="button"
        className={['iso-control-button', pathMode === 'organic' ? 'is-active' : ''].join(' ')}
        onClick={() => onPathModeChange('organic')}
        aria-label="Use organic trajectory view"
      >
        Org
      </button>
      <button
        type="button"
        className={['iso-control-button', pathMode === 'exact' ? 'is-active' : ''].join(' ')}
        onClick={() => onPathModeChange('exact')}
        aria-label="Use exact trajectory view"
      >
        Exact
      </button>
    </div>
  )
}

interface IsoOrbitSceneControlsProps {
  controlsRef: RefObject<OrbitControlsImpl | null>
  minZoom: number
  maxZoom: number
}

export function IsoOrbitSceneControls({
  controlsRef,
  minZoom,
  maxZoom,
}: IsoOrbitSceneControlsProps) {
  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={false}
      enablePan
      enableZoom
      screenSpacePanning
      minZoom={minZoom}
      maxZoom={maxZoom}
      mouseButtons={{
        LEFT: MOUSE.PAN,
        RIGHT: MOUSE.PAN,
        MIDDLE: MOUSE.DOLLY,
      }}
    />
  )
}
