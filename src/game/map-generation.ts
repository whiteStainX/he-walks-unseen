import { RNG } from 'rot-js';
import Digger from 'rot-js/lib/map/digger.js';
import type { Tile } from '../engine/state.js';

export const WALL_TILE: Tile = { char: '#', walkable: false, transparent: false };
export const FLOOR_TILE: Tile = { char: '.', walkable: true, transparent: true };
export const EXIT_TILE: Tile = { char: '>', walkable: true, transparent: true };

export type TileMap = Tile[][];

export function generateMap(width: number, height: number): { map: TileMap, playerStart: { x: number, y: number }, exitPosition: { x: number, y: number } } {
  const map = Array.from({ length: height }, () => Array.from({ length: width }, () => WALL_TILE));

  const digger = new Digger(width, height);
  const rooms = [];
  let playerStart = { x: 0, y: 0 };
  let exitPosition = { x: 0, y: 0 };

  digger.create((x, y, value) => {
    if (value) {
      return;
    }
    map[y][x] = FLOOR_TILE;
  });

  const createdRooms = digger.getRooms();

  for (const room of createdRooms) {
    rooms.push(room);
    room.getDoors((x, y) => {
      map[y][x] = FLOOR_TILE;
    });
  }

  const firstRoom = rooms[0];
  playerStart = { x: firstRoom.getCenter()[0], y: firstRoom.getCenter()[1] };

  const lastRoom = rooms[rooms.length - 1];
  exitPosition = { x: lastRoom.getCenter()[0], y: lastRoom.getCenter()[1] };

  map[exitPosition.y][exitPosition.x] = EXIT_TILE;

  return { map, playerStart, exitPosition };
}