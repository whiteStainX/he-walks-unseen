import type { Actor, Ai, AiState, GameState, Point } from '../engine/state.js';
import { FOV, Path } from 'rot-js';
import { resolveAttack } from './combat.js';

function canSeePlayer(
  enemy: Actor,
  player: Actor,
  state: GameState
): boolean {
  const fov = new FOV.PreciseShadowcasting(
    (x, y) => state.map.tiles[y]?.[x]?.transparent ?? false
  );

  let playerVisible = false;
  fov.compute(enemy.position.x, enemy.position.y, 8, (x, y) => {
    if (x === player.position.x && y === player.position.y) {
      playerVisible = true;
    }
  });

  return playerVisible;
}

function chasePlayer(enemy: Actor, player: Actor, state: GameState): GameState {
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
      return resolveAttack(enemy, player, state);
    } else {
      const newActors = state.actors.map((actor) =>
        actor.id === enemy.id ? { ...actor, position: nextStep } : actor
      );
      return { ...state, actors: newActors };
    }
  }

  return state;
}

function flee(enemy: Actor, player: Actor, state: GameState): GameState {
  const dx = enemy.position.x - player.position.x;
  const dy = enemy.position.y - player.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 10) {
    const newActors = state.actors.map((actor) => {
      if (actor.id === enemy.id && actor.ai) {
        const newAi: Ai = {
          ...actor.ai,
          state: actor.ai.patrolPoints ? 'patrol' : 'wander',
        };
        return { ...actor, ai: newAi };
      }
      return actor;
    });
    return { ...state, actors: newActors };
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
    const newActors = state.actors.map((actor) =>
      actor.id === enemy.id
        ? { ...actor, position: { x: moveX, y: moveY } }
        : actor
    );
    return { ...state, actors: newActors };
  }

  return wander(enemy, state);
}

function wander(enemy: Actor, state: GameState): GameState {
  const dx = Math.floor(Math.random() * 3) - 1;
  const dy = Math.floor(Math.random() * 3) - 1;

  if (dx === 0 && dy === 0) {
    return state;
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
    return state;
  }

  const newActors = state.actors.map((actor) =>
    actor.id === enemy.id
      ? { ...actor, position: { x: targetX, y: targetY } }
      : actor
  );

  return { ...state, actors: newActors };
}

function patrol(enemy: Actor, state: GameState): GameState {
  const ai = enemy.ai;
  if (!ai?.patrolPoints || ai.patrolPoints.length === 0) {
    return wander(enemy, state);
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

  const newActors = state.actors.map((actor) => {
    if (actor.id === enemy.id) {
      const newAi: Ai = { ...actor.ai!, currentPatrolIndex: currentIndex };
      return { ...actor, position: nextStep, ai: newAi };
    }
    return actor;
  });

  return { ...state, actors: newActors };
}

export function runEnemyTurn(enemy: Actor, state: GameState): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player || !enemy.ai) {
    return state;
  }

  const currentAi = enemy.ai;
  const seesPlayer = canSeePlayer(enemy, player, state);

  let nextState: AiState = currentAi.state;

  if (currentAi.state !== 'flee' && seesPlayer) {
    nextState = 'chase';
  } else if (currentAi.state === 'chase' && !seesPlayer) {
    nextState = currentAi.patrolPoints ? 'patrol' : 'wander';
  }

  // If the state changed, update the actor in the state
  let updatedEnemy: Actor = enemy;
  if (nextState !== currentAi.state) {
    const newAi: Ai = { ...currentAi, state: nextState };
    updatedEnemy = { ...enemy, ai: newAi };
  }

  const newState: GameState = {
    ...state,
    actors: state.actors.map((a) => (a.id === updatedEnemy.id ? updatedEnemy : a)),
  };

  if (!updatedEnemy.ai) {
    return newState;
  }

  switch (updatedEnemy.ai.state) {
    case 'chase':
      return chasePlayer(updatedEnemy, player, newState);
    case 'flee':
      return flee(updatedEnemy, player, newState);
    case 'wander':
      return wander(updatedEnemy, newState);
    case 'patrol':
      return patrol(updatedEnemy, newState);
    case 'idle':
      return newState;
    default:
      return newState;
  }
}