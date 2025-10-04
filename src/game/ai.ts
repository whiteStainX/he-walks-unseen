import type { Actor, GameState, Point } from '../engine/state.js';
import { FOV, Path } from 'rot-js';
import { handleAttack } from './combat.js';

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
      const isOccupied = state.actors.some(
        (a) => !a.isPlayer && a.position.x === x && a.position.y === y
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
      return handleAttack(enemy, player, state);
    } else {
      const newActors = state.actors.map((actor) =>
        actor.id === enemy.id ? { ...actor, position: nextStep } : actor
      );
      return { ...state, actors: newActors };
    }
  }

  return state;
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
    state.actors.some((a) => a.position.x === targetX && a.position.y === targetY)
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

export function runEnemyTurn(enemy: Actor, state: GameState): GameState {
  const player = state.actors.find((a) => a.isPlayer);
  if (!player) {
    return state;
  }

  if (enemy.ai?.canChase && canSeePlayer(enemy, player, state)) {
    return chasePlayer(enemy, player, state);
  }

  if (enemy.ai?.canWander) {
    return wander(enemy, state);
  }

  return state;
}
