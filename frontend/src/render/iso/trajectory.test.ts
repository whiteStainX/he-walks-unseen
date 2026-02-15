import { describe, expect, it } from 'vitest'

import { buildTrackRenderModel, type IsoTrackPoint } from './trajectory'

describe('buildTrackRenderModel', () => {
  it('segments local paths and non-local bridges', () => {
    const anchors: IsoTrackPoint[] = [
      { x: 1, y: 1, t: 0, turn: 0 },
      { x: 2, y: 1, t: 1, turn: 1 },
      { x: 5, y: 5, t: 4, turn: 2 },
      { x: 5, y: 6, t: 5, turn: 3 },
    ]

    const model = buildTrackRenderModel(anchors, 'exact')

    expect(model.localPaths).toHaveLength(2)
    expect(model.localPaths[0]).toHaveLength(2)
    expect(model.localPaths[1]).toHaveLength(2)
    expect(model.riftBridges).toEqual([
      {
        from: { x: 2, y: 1, t: 1, turn: 1 },
        to: { x: 5, y: 5, t: 4, turn: 2 },
      },
    ])
  })

  it('returns sampled smooth points for organic mode', () => {
    const anchors: IsoTrackPoint[] = [
      { x: 1, y: 1, t: 0, turn: 0 },
      { x: 2, y: 1, t: 1, turn: 1 },
      { x: 3, y: 1, t: 2, turn: 2 },
      { x: 4, y: 1, t: 3, turn: 3 },
    ]

    const model = buildTrackRenderModel(anchors, 'organic')

    expect(model.localPaths).toHaveLength(1)
    expect(model.localPaths[0].length).toBeGreaterThan(anchors.length)
    expect(model.riftBridges).toHaveLength(0)
  })
})
