import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameAction } from '../input/actions.js';
import type { GameState, Point } from './state.js';
import { move } from './systems/movement.js';

// ES Module-friendly path resolution.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Go up two directories from engine/ to the root, then to data/maps.json
const mapPath = path.join(__dirname, '..', '..', 'data', 'maps.json');

const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));

function findStartPosition(tiles: string[][]): Point {
	for (let y = 0; y < tiles.length; y++) {
		for (let x = 0; x < tiles[y].length; x++) {
			if (tiles[y][x] === '@') {
				return { x, y };
			}
		}
	}
	// Default to a fallback position if no '@' is found.
	return { x: 1, y: 1 };
}

export function getInitialState(): GameState {
	const defaultMap = mapData.default;
	const startPosition = findStartPosition(defaultMap.tiles);

	// Remove player character from the map tiles so it doesn't render statically
	const cleanTiles = defaultMap.tiles.map((row: string[]) =>
		row.map((tile) => (tile === '@' ? '.' : tile))
	);

	return {
		player: {
			position: startPosition,
			hp: 100,
		},
		map: {
			tiles: cleanTiles,
			width: defaultMap.width,
			height: defaultMap.height,
		},
		message: 'Welcome to "He Walks Unseen". Use arrow keys to move.',
	};
}

export function update(
	currentState: GameState,
	action: GameAction
): GameState {
	switch (action) {
		case GameAction.MOVE_NORTH:
			return move(currentState, 'north');
		case GameAction.MOVE_SOUTH:
			return move(currentState, 'south');
		case GameAction.MOVE_EAST:
			return move(currentState, 'east');
		case GameAction.MOVE_WEST:
			return move(currentState, 'west');
		case GameAction.QUIT:
			// In a pure function, we don't exit the process.
			// The presentation layer will handle the actual exit.
			return { ...currentState, message: 'Quitting...' };
		default:
			return currentState;
	}
}