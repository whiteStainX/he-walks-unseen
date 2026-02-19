import type { Result } from '../../core/result'
import { isInBounds } from '../../core/position'
import {
  STORY_SPEC_SCHEMA_VERSION,
  type StoryBoxSpec,
  type StoryDifficultyIntent,
  type StoryEnemyDetectionSpec,
  type StoryEnemyMovementSpec,
  type StoryEnemySpec,
  type StoryGoalSpec,
  type StoryRiftSpec,
  type StoryRulesIntent,
  type StorySpec,
  type StorySpecValidationError,
  type StorySpecValidationIssue,
  type StoryThemeIntent,
  type StoryWallSpec,
} from './contracts'

interface ValidateStorySpecOptions {
  strict?: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function compareIssue(a: StorySpecValidationIssue, b: StorySpecValidationIssue): number {
  if (a.path === b.path) {
    return a.message.localeCompare(b.message)
  }

  return a.path.localeCompare(b.path)
}

function pushIssue(issues: StorySpecValidationIssue[], path: string, message: string): void {
  issues.push({ path, message })
}

function rejectUnknownKeys(input: Record<string, unknown>, allowed: string[], path: string, issues: StorySpecValidationIssue[]): void {
  const allowedSet = new Set(allowed)
  const unknown = Object.keys(input)
    .filter((key) => !allowedSet.has(key))
    .sort((a, b) => a.localeCompare(b))

  for (const key of unknown) {
    pushIssue(issues, `${path}.${key}`, 'unknown field')
  }
}

function expectObject(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
): Record<string, unknown> | null {
  if (!isRecord(value)) {
    pushIssue(issues, path, 'expected object')
    return null
  }

  return value
}

function parseNonEmptyString(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    pushIssue(issues, path, 'expected non-empty string')
    return null
  }

  return value
}

function parseInteger(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
  min: number,
): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    pushIssue(issues, path, `expected integer >= ${min}`)
    return null
  }

  return value
}

function parseFiniteNumber(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
  min: number,
): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) {
    pushIssue(issues, path, `expected finite number >= ${min}`)
    return null
  }

  return value
}

function parseBoolean(value: unknown, path: string, issues: StorySpecValidationIssue[]): boolean | null {
  if (typeof value !== 'boolean') {
    pushIssue(issues, path, 'expected boolean')
    return null
  }

  return value
}

function parsePosition2D(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
): { x: number; y: number } | null {
  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return null
  }

  rejectUnknownKeys(objectValue, ['x', 'y'], path, issues)
  const x = parseInteger(objectValue.x, `${path}.x`, issues, 0)
  const y = parseInteger(objectValue.y, `${path}.y`, issues, 0)

  if (x === null || y === null) {
    return null
  }

  return { x, y }
}

function parsePosition3D(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
): { x: number; y: number; t: number } | null {
  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return null
  }

  rejectUnknownKeys(objectValue, ['x', 'y', 't'], path, issues)
  const x = parseInteger(objectValue.x, `${path}.x`, issues, 0)
  const y = parseInteger(objectValue.y, `${path}.y`, issues, 0)
  const t = parseInteger(objectValue.t, `${path}.t`, issues, 0)

  if (x === null || y === null || t === null) {
    return null
  }

  return { x, y, t }
}

function parseWallSpec(value: unknown, path: string, issues: StorySpecValidationIssue[]): StoryWallSpec | null {
  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return null
  }

  rejectUnknownKeys(objectValue, ['id', 'position'], path, issues)
  const position = parsePosition3D(objectValue.position, `${path}.position`, issues)

  if (!position) {
    return null
  }

  let id: string | undefined

  if (objectValue.id !== undefined) {
    const parsed = parseNonEmptyString(objectValue.id, `${path}.id`, issues)

    if (parsed) {
      id = parsed
    }
  }

  return { id, position }
}

function parseBoxSpec(value: unknown, path: string, issues: StorySpecValidationIssue[]): StoryBoxSpec | null {
  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return null
  }

  rejectUnknownKeys(objectValue, ['id', 'position'], path, issues)
  const position = parsePosition3D(objectValue.position, `${path}.position`, issues)

  if (!position) {
    return null
  }

  let id: string | undefined

  if (objectValue.id !== undefined) {
    const parsed = parseNonEmptyString(objectValue.id, `${path}.id`, issues)

    if (parsed) {
      id = parsed
    }
  }

  return { id, position }
}

function parseRiftSpec(value: unknown, path: string, issues: StorySpecValidationIssue[]): StoryRiftSpec | null {
  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return null
  }

  rejectUnknownKeys(objectValue, ['id', 'source', 'target', 'bidirectional'], path, issues)

  const source = parsePosition3D(objectValue.source, `${path}.source`, issues)
  const target = parsePosition3D(objectValue.target, `${path}.target`, issues)

  if (!source || !target) {
    return null
  }

  let id: string | undefined
  let bidirectional: boolean | undefined

  if (objectValue.id !== undefined) {
    const parsed = parseNonEmptyString(objectValue.id, `${path}.id`, issues)

    if (parsed) {
      id = parsed
    }
  }

  if (objectValue.bidirectional !== undefined) {
    const parsed = parseBoolean(objectValue.bidirectional, `${path}.bidirectional`, issues)

    if (parsed !== null) {
      bidirectional = parsed
    }
  }

  return { id, source, target, bidirectional }
}

function parseMovementSpec(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
): StoryEnemyMovementSpec | undefined {
  if (value === undefined) {
    return undefined
  }

  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return undefined
  }

  rejectUnknownKeys(objectValue, ['kind', 'path'], path, issues)
  const kind = parseNonEmptyString(objectValue.kind, `${path}.kind`, issues)

  if (!kind) {
    return undefined
  }

  if (kind === 'Static') {
    return { kind: 'Static' }
  }

  if (kind !== 'PatrolLoop' && kind !== 'PatrolPingPong') {
    pushIssue(issues, `${path}.kind`, 'expected Static|PatrolLoop|PatrolPingPong')
    return undefined
  }

  if (!Array.isArray(objectValue.path)) {
    pushIssue(issues, `${path}.path`, 'expected array')
    return undefined
  }

  const pathPoints: Array<{ x: number; y: number }> = []

  for (let index = 0; index < objectValue.path.length; index += 1) {
    const point = parsePosition2D(objectValue.path[index], `${path}.path[${index}]`, issues)

    if (point) {
      pathPoints.push(point)
    }
  }

  return {
    kind,
    path: pathPoints,
  }
}

function parseDetectionSpec(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
): StoryEnemyDetectionSpec | undefined {
  if (value === undefined) {
    return undefined
  }

  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return undefined
  }

  rejectUnknownKeys(objectValue, ['enabled', 'delayTurns', 'maxDistance'], path, issues)

  const parsed: StoryEnemyDetectionSpec = {}

  if (objectValue.enabled !== undefined) {
    const enabled = parseBoolean(objectValue.enabled, `${path}.enabled`, issues)

    if (enabled !== null) {
      parsed.enabled = enabled
    }
  }

  if (objectValue.delayTurns !== undefined) {
    const delayTurns = parseInteger(objectValue.delayTurns, `${path}.delayTurns`, issues, 1)

    if (delayTurns !== null) {
      parsed.delayTurns = delayTurns
    }
  }

  if (objectValue.maxDistance !== undefined) {
    const maxDistance = parseFiniteNumber(objectValue.maxDistance, `${path}.maxDistance`, issues, 0)

    if (maxDistance !== null) {
      parsed.maxDistance = maxDistance
    }
  }

  return parsed
}

function parseEnemySpec(value: unknown, path: string, issues: StorySpecValidationIssue[]): StoryEnemySpec | null {
  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return null
  }

  rejectUnknownKeys(objectValue, ['id', 'position', 'movement', 'detection'], path, issues)

  const position = parsePosition3D(objectValue.position, `${path}.position`, issues)

  if (!position) {
    return null
  }

  let id: string | undefined

  if (objectValue.id !== undefined) {
    const parsedId = parseNonEmptyString(objectValue.id, `${path}.id`, issues)

    if (parsedId) {
      id = parsedId
    }
  }

  return {
    id,
    position,
    movement: parseMovementSpec(objectValue.movement, `${path}.movement`, issues),
    detection: parseDetectionSpec(objectValue.detection, `${path}.detection`, issues),
  }
}

function parseRulesIntent(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
): StoryRulesIntent | undefined {
  if (value === undefined) {
    return undefined
  }

  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return undefined
  }

  rejectUnknownKeys(objectValue, ['rift', 'interaction', 'detection'], path, issues)

  const parsed: StoryRulesIntent = {}

  if (objectValue.rift !== undefined) {
    const rift = expectObject(objectValue.rift, `${path}.rift`, issues)

    if (rift) {
      rejectUnknownKeys(rift, ['defaultDelta', 'baseEnergyCost'], `${path}.rift`, issues)

      parsed.rift = {}

      if (rift.defaultDelta !== undefined) {
        const defaultDelta = parseInteger(rift.defaultDelta, `${path}.rift.defaultDelta`, issues, 1)

        if (defaultDelta !== null) {
          parsed.rift.defaultDelta = defaultDelta
        }
      }

      if (rift.baseEnergyCost !== undefined) {
        const baseEnergyCost = parseInteger(rift.baseEnergyCost, `${path}.rift.baseEnergyCost`, issues, 0)

        if (baseEnergyCost !== null) {
          parsed.rift.baseEnergyCost = baseEnergyCost
        }
      }
    }
  }

  if (objectValue.interaction !== undefined) {
    const interaction = expectObject(objectValue.interaction, `${path}.interaction`, issues)

    if (interaction) {
      rejectUnknownKeys(interaction, ['maxPushChain', 'allowPull'], `${path}.interaction`, issues)

      parsed.interaction = {}

      if (interaction.maxPushChain !== undefined) {
        const maxPushChain = parseInteger(
          interaction.maxPushChain,
          `${path}.interaction.maxPushChain`,
          issues,
          1,
        )

        if (maxPushChain !== null) {
          parsed.interaction.maxPushChain = maxPushChain
        }
      }

      if (interaction.allowPull !== undefined) {
        const allowPull = parseBoolean(interaction.allowPull, `${path}.interaction.allowPull`, issues)

        if (allowPull !== null) {
          parsed.interaction.allowPull = allowPull
        }
      }
    }
  }

  if (objectValue.detection !== undefined) {
    const detection = expectObject(objectValue.detection, `${path}.detection`, issues)

    if (detection) {
      rejectUnknownKeys(detection, ['enabled', 'delayTurns', 'maxDistance'], `${path}.detection`, issues)

      parsed.detection = {}

      if (detection.enabled !== undefined) {
        const enabled = parseBoolean(detection.enabled, `${path}.detection.enabled`, issues)

        if (enabled !== null) {
          parsed.detection.enabled = enabled
        }
      }

      if (detection.delayTurns !== undefined) {
        const delayTurns = parseInteger(detection.delayTurns, `${path}.detection.delayTurns`, issues, 1)

        if (delayTurns !== null) {
          parsed.detection.delayTurns = delayTurns
        }
      }

      if (detection.maxDistance !== undefined) {
        const maxDistance = parseFiniteNumber(detection.maxDistance, `${path}.detection.maxDistance`, issues, 0)

        if (maxDistance !== null) {
          parsed.detection.maxDistance = maxDistance
        }
      }
    }
  }

  return parsed
}

function parseDifficultyIntent(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
): StoryDifficultyIntent | undefined {
  if (value === undefined) {
    return undefined
  }

  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return undefined
  }

  rejectUnknownKeys(objectValue, ['tier', 'flavor'], path, issues)

  const parsed: StoryDifficultyIntent = {}

  if (objectValue.tier !== undefined) {
    const tier = parseNonEmptyString(objectValue.tier, `${path}.tier`, issues)

    if (tier) {
      if (tier !== 'easy' && tier !== 'normal' && tier !== 'hard' && tier !== 'expert') {
        pushIssue(issues, `${path}.tier`, 'expected easy|normal|hard|expert')
      } else {
        parsed.tier = tier
      }
    }
  }

  if (objectValue.flavor !== undefined) {
    const flavor = parseNonEmptyString(objectValue.flavor, `${path}.flavor`, issues)

    if (flavor) {
      parsed.flavor = flavor
    }
  }

  return parsed
}

function parseThemeIntent(
  value: unknown,
  path: string,
  issues: StorySpecValidationIssue[],
): StoryThemeIntent | undefined {
  if (value === undefined) {
    return undefined
  }

  const objectValue = expectObject(value, path, issues)

  if (!objectValue) {
    return undefined
  }

  rejectUnknownKeys(objectValue, ['id', 'iconPackId', 'cssVars'], path, issues)

  const parsed: StoryThemeIntent = {}

  if (objectValue.id !== undefined) {
    const id = parseNonEmptyString(objectValue.id, `${path}.id`, issues)

    if (id) {
      parsed.id = id
    }
  }

  if (objectValue.iconPackId !== undefined) {
    const iconPackId = parseNonEmptyString(objectValue.iconPackId, `${path}.iconPackId`, issues)

    if (iconPackId) {
      parsed.iconPackId = iconPackId
    }
  }

  if (objectValue.cssVars !== undefined) {
    const cssVarsObject = expectObject(objectValue.cssVars, `${path}.cssVars`, issues)

    if (cssVarsObject) {
      const cssVars: Record<string, string> = {}

      for (const key of Object.keys(cssVarsObject).sort((a, b) => a.localeCompare(b))) {
        const valueAtKey = cssVarsObject[key]

        if (typeof valueAtKey !== 'string' || valueAtKey.length === 0) {
          pushIssue(issues, `${path}.cssVars.${key}`, 'expected non-empty string')
          continue
        }

        cssVars[key] = valueAtKey
      }

      parsed.cssVars = cssVars
    }
  }

  return parsed
}

function isPositionInBoard(
  position: { x: number; y: number; t: number },
  board: { width: number; height: number; timeDepth: number },
): boolean {
  return position.t >= 0 && position.t < board.timeDepth && isInBounds({ x: position.x, y: position.y }, board.width, board.height)
}

function withSortedIssues(issues: StorySpecValidationIssue[]): StorySpecValidationError {
  return {
    kind: 'InvalidStorySpec',
    issues: [...issues].sort(compareIssue),
  }
}

/**
 * Validate StorySpec payload with strict unknown-field checks by default.
 */
export function validateStorySpec(
  input: unknown,
  options: ValidateStorySpecOptions = {},
): Result<StorySpec, StorySpecValidationError> {
  const strict = options.strict ?? true
  const issues: StorySpecValidationIssue[] = []
  const root = expectObject(input, 'storySpec', issues)

  if (!root) {
    return { ok: false, error: withSortedIssues(issues) }
  }

  if (strict) {
    rejectUnknownKeys(
      root,
      [
        'schemaVersion',
        'storyId',
        'title',
        'board',
        'start',
        'goal',
        'layout',
        'actors',
        'interactives',
        'rulesIntent',
        'difficultyIntent',
        'themeIntent',
      ],
      'storySpec',
      issues,
    )
  }

  if (root.schemaVersion !== STORY_SPEC_SCHEMA_VERSION) {
    pushIssue(
      issues,
      'storySpec.schemaVersion',
      `expected ${STORY_SPEC_SCHEMA_VERSION}`,
    )
  }

  const storyId = parseNonEmptyString(root.storyId, 'storySpec.storyId', issues)
  const title = parseNonEmptyString(root.title, 'storySpec.title', issues)

  const boardRaw = expectObject(root.board, 'storySpec.board', issues)
  let board: StorySpec['board'] | null = null

  if (boardRaw) {
    if (strict) {
      rejectUnknownKeys(boardRaw, ['width', 'height', 'timeDepth'], 'storySpec.board', issues)
    }

    const width = parseInteger(boardRaw.width, 'storySpec.board.width', issues, 1)
    const height = parseInteger(boardRaw.height, 'storySpec.board.height', issues, 1)
    const timeDepth = parseInteger(boardRaw.timeDepth, 'storySpec.board.timeDepth', issues, 1)

    if (width !== null && height !== null && timeDepth !== null) {
      board = {
        width,
        height,
        timeDepth,
      }
    }
  }

  const start = parsePosition3D(root.start, 'storySpec.start', issues)

  const goalRaw = expectObject(root.goal, 'storySpec.goal', issues)
  let goal: StoryGoalSpec | null = null

  if (goalRaw) {
    if (strict) {
      rejectUnknownKeys(goalRaw, ['type', 'target'], 'storySpec.goal', issues)
    }

    const goalType = parseNonEmptyString(goalRaw.type, 'storySpec.goal.type', issues)

    if (goalType && goalType !== 'ReachExit') {
      pushIssue(issues, 'storySpec.goal.type', 'expected ReachExit')
    }

    const target = parsePosition3D(goalRaw.target, 'storySpec.goal.target', issues)

    if (goalType === 'ReachExit' && target) {
      goal = {
        type: 'ReachExit',
        target,
      }
    }
  }

  const layoutRaw = expectObject(root.layout, 'storySpec.layout', issues)
  const walls: StoryWallSpec[] = []

  if (layoutRaw) {
    if (strict) {
      rejectUnknownKeys(layoutRaw, ['walls'], 'storySpec.layout', issues)
    }

    if (layoutRaw.walls !== undefined) {
      if (!Array.isArray(layoutRaw.walls)) {
        pushIssue(issues, 'storySpec.layout.walls', 'expected array')
      } else {
        for (let index = 0; index < layoutRaw.walls.length; index += 1) {
          const wall = parseWallSpec(layoutRaw.walls[index], `storySpec.layout.walls[${index}]`, issues)

          if (wall) {
            walls.push(wall)
          }
        }
      }
    }
  }

  const actorsRaw = expectObject(root.actors, 'storySpec.actors', issues)
  const enemies: StoryEnemySpec[] = []

  if (actorsRaw) {
    if (strict) {
      rejectUnknownKeys(actorsRaw, ['enemies'], 'storySpec.actors', issues)
    }

    if (actorsRaw.enemies !== undefined) {
      if (!Array.isArray(actorsRaw.enemies)) {
        pushIssue(issues, 'storySpec.actors.enemies', 'expected array')
      } else {
        for (let index = 0; index < actorsRaw.enemies.length; index += 1) {
          const enemy = parseEnemySpec(
            actorsRaw.enemies[index],
            `storySpec.actors.enemies[${index}]`,
            issues,
          )

          if (enemy) {
            enemies.push(enemy)
          }
        }
      }
    }
  }

  const interactivesRaw = root.interactives === undefined
    ? undefined
    : expectObject(root.interactives, 'storySpec.interactives', issues)
  const boxes: StoryBoxSpec[] = []
  const rifts: StoryRiftSpec[] = []

  if (interactivesRaw) {
    if (strict) {
      rejectUnknownKeys(interactivesRaw, ['boxes', 'rifts'], 'storySpec.interactives', issues)
    }

    if (interactivesRaw.boxes !== undefined) {
      if (!Array.isArray(interactivesRaw.boxes)) {
        pushIssue(issues, 'storySpec.interactives.boxes', 'expected array')
      } else {
        for (let index = 0; index < interactivesRaw.boxes.length; index += 1) {
          const box = parseBoxSpec(interactivesRaw.boxes[index], `storySpec.interactives.boxes[${index}]`, issues)

          if (box) {
            boxes.push(box)
          }
        }
      }
    }

    if (interactivesRaw.rifts !== undefined) {
      if (!Array.isArray(interactivesRaw.rifts)) {
        pushIssue(issues, 'storySpec.interactives.rifts', 'expected array')
      } else {
        for (let index = 0; index < interactivesRaw.rifts.length; index += 1) {
          const rift = parseRiftSpec(interactivesRaw.rifts[index], `storySpec.interactives.rifts[${index}]`, issues)

          if (rift) {
            rifts.push(rift)
          }
        }
      }
    }
  }

  const rulesIntent = parseRulesIntent(root.rulesIntent, 'storySpec.rulesIntent', issues)
  const difficultyIntent = parseDifficultyIntent(
    root.difficultyIntent,
    'storySpec.difficultyIntent',
    issues,
  )
  const themeIntent = parseThemeIntent(root.themeIntent, 'storySpec.themeIntent', issues)

  if (board && start && !isPositionInBoard(start, board)) {
    pushIssue(issues, 'storySpec.start', 'position out of board bounds')
  }

  if (board && goal && !isPositionInBoard(goal.target, board)) {
    pushIssue(issues, 'storySpec.goal.target', 'position out of board bounds')
  }

  if (board) {
    for (let index = 0; index < walls.length; index += 1) {
      if (!isPositionInBoard(walls[index].position, board)) {
        pushIssue(issues, `storySpec.layout.walls[${index}].position`, 'position out of board bounds')
      }
    }

    for (let index = 0; index < enemies.length; index += 1) {
      if (!isPositionInBoard(enemies[index].position, board)) {
        pushIssue(issues, `storySpec.actors.enemies[${index}].position`, 'position out of board bounds')
      }

      const movement = enemies[index].movement

      if (movement && 'path' in movement) {
        for (let pathIndex = 0; pathIndex < movement.path.length; pathIndex += 1) {
          if (!isInBounds(movement.path[pathIndex], board.width, board.height)) {
            pushIssue(
              issues,
              `storySpec.actors.enemies[${index}].movement.path[${pathIndex}]`,
              'position out of board bounds',
            )
          }
        }
      }
    }

    for (let index = 0; index < boxes.length; index += 1) {
      if (!isPositionInBoard(boxes[index].position, board)) {
        pushIssue(issues, `storySpec.interactives.boxes[${index}].position`, 'position out of board bounds')
      }
    }

    for (let index = 0; index < rifts.length; index += 1) {
      if (!isPositionInBoard(rifts[index].source, board)) {
        pushIssue(issues, `storySpec.interactives.rifts[${index}].source`, 'position out of board bounds')
      }

      if (!isPositionInBoard(rifts[index].target, board)) {
        pushIssue(issues, `storySpec.interactives.rifts[${index}].target`, 'position out of board bounds')
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, error: withSortedIssues(issues) }
  }

  return {
    ok: true,
    value: {
      schemaVersion: STORY_SPEC_SCHEMA_VERSION,
      storyId: storyId!,
      title: title!,
      board: board!,
      start: start!,
      goal: goal!,
      layout: {
        walls,
      },
      actors: {
        enemies,
      },
      interactives: {
        boxes,
        rifts,
      },
      rulesIntent,
      difficultyIntent,
      themeIntent,
    },
  }
}

export function formatStorySpecValidationError(error: StorySpecValidationError): string {
  return error.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')
}
