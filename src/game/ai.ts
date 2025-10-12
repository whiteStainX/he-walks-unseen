import type { Actor, Ai, AiState, GameState, Point } from '../engine/state.js';
import { FOV, Path } from 'rot-js';
import { resolveAttack } from './combat.js';

function canSeePlayer(
  enemy: Actor,
  player: Actor,
  state: GameState
): boolean {
  const fov = new FOV.PreciseShadowcasting((x, y) => {
    return state.map.tiles[y]?.[x]?.transparent ?? false;
  });

  let seesPlayer = false;
  fov.compute(enemy.position.x, enemy.position.y, 10, (x, y, r, visibility) => {
    if (x === player.position.x && y === player.position.y) {
      seesPlayer = true;
    }
  });

  return seesPlayer;
}

function chasePlayer(enemy: Actor, player: Actor, state: GameState): void {
  const astar = new Path.AStar(
    player.position.x,
    player.position.y,
    (x, y) => {
      if (enemy.ai?.canPassThroughWalls) {
        return true;
      }
      const isOccupied = state.actors.some(
        (a) => a.id !== enemy.id && a.position.x === x && a.position.y === y
      );
      return (state.map.tiles[y]?.[x]?.walkable ?? false) && !isOccupied;
    },
    { topology: 4 }
  );

  const path: Point[] = [];
  astar.compute(enemy.position.x, enemy.position.y, (x, y) => {
    path.push({ x, y });
  });

  if (path.length > 1) {
    const nextStep = path[1];
    if (nextStep.x === player.position.x && nextStep.y === player.position.y) {
      resolveAttack(enemy, player, state);
    } else {
      const enemyInState = state.actors.find(e => e.id === enemy.id);
      if (enemyInState) {
        enemyInState.position = nextStep;
      }
    }
  }
}

function flee(enemy: Actor, player: Actor, state: GameState): void {
  const dx = enemy.position.x - player.position.x;
  const dy = enemy.position.y - player.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 10) {
    if (enemy.ai) {
      enemy.ai.state = enemy.ai.patrolPoints ? 'patrol' : 'wander';
    }
    return;
  }

  const moveX = enemy.position.x + Math.sign(dx);
  const moveY = enemy.position.y + Math.sign(dy);

  if (
    moveX >= 0 &&
    moveX < state.map.width &&
    moveY >= 0 &&
    moveY < state.map.height &&
    state.map.tiles[moveY]?.[moveX]?.walkable &&
    !state.actors.some((a) => a.position.x === moveX && a.position.y === moveY)
  ) {
    const enemyInState = state.actors.find(e => e.id === enemy.id);
    if (enemyInState) {
      enemyInState.position = { x: moveX, y: moveY };
    }
  } else {
    wander(enemy, state);
  }
}

function wander(enemy: Actor, state: GameState): void {
  const dx = Math.floor(Math.random() * 3) - 1;
  const dy = Math.floor(Math.random() * 3) - 1;

  if (dx === 0 && dy === 0) {
    return;
  }

  const targetX = enemy.position.x + dx;
  const targetY = enemy.position.y + dy;

  if (
    targetX < 0 ||
    targetX >= state.map.width ||
    targetY < 0 ||
    targetY >= state.map.height ||
    !state.map.tiles[targetY][targetX].walkable ||
    state.actors.some(
      (a) => a.id !== enemy.id && a.position.x === targetX && a.position.y === targetY
    )
  ) {
    return;
  }

  const enemyInState = state.actors.find(e => e.id === enemy.id);
  if (enemyInState) {
    enemyInState.position = { x: targetX, y: targetY };
  }
}

function patrol(enemy: Actor, state: GameState): void {
  const ai = enemy.ai;
  if (!ai?.patrolPoints || ai.patrolPoints.length === 0) {
    wander(enemy, state);
    return;
  }

  let currentIndex = ai.currentPatrolIndex ?? 0;
  const targetPoint = ai.patrolPoints[currentIndex];

  if (
    enemy.position.x === targetPoint.x &&
    enemy.position.y === targetPoint.y
  ) {
    currentIndex = (currentIndex + 1) % ai.patrolPoints.length;
  }

  const astar = new Path.AStar(
    targetPoint.x,
    targetPoint.y,
    (x, y) => {
      if (ai.canPassThroughWalls) {
        return true;
      }
      const isOccupied = state.actors.some(
        (a) => a.id !== enemy.id && a.position.x === x && a.position.y === y
      );
      return (state.map.tiles[y]?.[x]?.walkable ?? false) && !isOccupied;
    },
    { topology: 4 }
  );

  const path: Point[] = [];
  astar.compute(enemy.position.x, enemy.position.y, (x, y) => {
    path.push({ x, y });
  });

  const nextStep = path.length > 1 ? path[1] : enemy.position;

  const enemyInState = state.actors.find(e => e.id === enemy.id);
  if (enemyInState) {
    enemyInState.position = nextStep;
    if (enemyInState.ai) {
      enemyInState.ai.currentPatrolIndex = currentIndex;
    }
  }
}

export function runEnemyTurn(enemy: Actor, state: GameState): void {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player || !enemy.ai) {
    return;
  }

  const seesPlayer = canSeePlayer(enemy, player, state);

  let nextState: AiState = enemy.ai.state;

  if (enemy.ai.state !== 'flee' && seesPlayer) {
    nextState = 'chase';
  } else if (enemy.ai.state === 'chase' && !seesPlayer) {
    nextState = enemy.ai.patrolPoints ? 'patrol' : 'wander';
  }

  if (nextState !== enemy.ai.state) {
    enemy.ai.state = nextState;
  }

  switch (enemy.ai.state) {
    case 'chase':
      chasePlayer(enemy, player, state);
      break;
    case 'flee':
      flee(enemy, player, state);
      break;
    case 'wander':
      wander(enemy, state);
      break;
    case 'patrol':
      patrol(enemy, state);
      break;
  }
}