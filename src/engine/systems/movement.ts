import type { GameState, Point } from '../state.js';

function isWalkable(state: GameState, point: Point): boolean {
	if (
		point.x < 0 ||
		point.x >= state.map.width ||
		point.y < 0 ||
		point.y >= state.map.height
	) {
		return false;
	}
	return state.map.tiles[point.y][point.x] !== '#';
}

export function move(
	state: GameState,
	direction: 'north' | 'south' | 'east' | 'west'
): GameState {
	let { x, y } = state.player.position;

	switch (direction) {
		case 'north':
			y -= 1;
			break;
		case 'south':
			y += 1;
			break;
		case 'east':
			x += 1;
			break;
		case 'west':
			x -= 1;
			break;
	}

	if (!isWalkable(state, { x, y })) {
		return {
			...state,
			message: "You can't move there.",
		};
	}

	return {
		...state,
		player: {
			...state.player,
			position: { x, y },
		},
		message: `You moved ${direction}.`,
	};
}