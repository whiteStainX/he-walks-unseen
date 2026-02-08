export interface TimeWindow {
  startT: number
  endT: number
  focusT: number
}

export function selectIsoWindow(
  currentT: number,
  timeDepth: number,
  maxWindow = 10,
): TimeWindow {
  if (timeDepth <= 0) {
    return { startT: 0, endT: 0, focusT: 0 }
  }

  const clampedCurrentT = Math.min(Math.max(currentT, 0), timeDepth - 1)
  const windowLen = Math.min(Math.max(maxWindow, 1), timeDepth)
  const availableFuture = Math.max(0, timeDepth - 1 - clampedCurrentT)
  const maxFuture = Math.floor(maxWindow / 2)
  const futureCount = Math.min(availableFuture, maxFuture, windowLen - 1)
  const pastAndPresentCount = windowLen - futureCount

  let startT = clampedCurrentT - (pastAndPresentCount - 1)
  let endT = startT + windowLen - 1

  if (startT < 0) {
    endT += -startT
    startT = 0
  }

  if (endT >= timeDepth) {
    const shift = endT - (timeDepth - 1)
    startT = Math.max(0, startT - shift)
    endT = timeDepth - 1
  }

  return { startT, endT, focusT: clampedCurrentT }
}

