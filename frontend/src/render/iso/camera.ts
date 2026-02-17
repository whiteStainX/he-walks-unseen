import type { RefObject } from 'react'
import type { OrthographicCamera } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export function applyIsoCameraReset(
  cameraRef: RefObject<OrthographicCamera | null>,
  controlsRef: RefObject<OrbitControlsImpl | null>,
  cameraPosition: [number, number, number],
  zoom: number,
) {
  const camera = cameraRef.current
  const controls = controlsRef.current

  if (!camera || !controls) {
    return
  }

  camera.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2])
  camera.zoom = zoom
  camera.updateProjectionMatrix()
  controls.target.set(0, 0, 0)
  controls.update()
}
