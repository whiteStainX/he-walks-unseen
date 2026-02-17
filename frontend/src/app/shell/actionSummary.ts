import type { InteractionHistoryEntry } from '../../game/gameSlice'

export function actionSummary(entry: InteractionHistoryEntry): string {
  const actionText =
    entry.action.kind === 'Move' ||
    entry.action.kind === 'Push' ||
    entry.action.kind === 'Pull'
      ? `${entry.action.kind.toLowerCase()} ${entry.action.direction ?? ''}`.trim()
      : entry.action.kind === 'ApplyRift'
        ? 'rift'
        : entry.action.kind.toLowerCase()

  return `${actionText} -> ${entry.outcome.kind.toLowerCase()}`
}
