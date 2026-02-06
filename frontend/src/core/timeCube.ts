export interface TimeSlice {
  t: number
}

export interface TimeCube {
  width: number
  height: number
  timeDepth: number
  slices: TimeSlice[]
}

export function createTimeCube(width: number, height: number, timeDepth: number): TimeCube {
  const slices: TimeSlice[] = []

  for (let t = 0; t < timeDepth; t += 1) {
    slices.push({ t })
  }

  return {
    width,
    height,
    timeDepth,
    slices,
  }
}
