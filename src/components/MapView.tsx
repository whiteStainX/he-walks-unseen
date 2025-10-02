import React from 'react';
import { Box, Text } from 'ink';
import type { GameState } from '../engine/state';

interface Props {
	state: GameState;
}

const MapView: React.FC<Props> = ({ state }) => {
	const { player, map, message } = state;

	// Create a mutable copy of the tiles to draw the player on top.
	const displayTiles = map.tiles.map((row) => [...row]);

	// Add the player character to the display grid.
	if (
		player.position.y >= 0 &&
		player.position.y < map.height &&
		player.position.x >= 0 &&
		player.position.x < map.width
	) {
		displayTiles[player.position.y][player.position.x] = '@';
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Box flexDirection="column" alignItems="center" marginBottom={1}>
				<Text bold>He Walks Unseen</Text>
			</Box>

			<Box flexDirection="column" alignItems="center">
				{displayTiles.map((row, y) => (
					<Text key={y}>{row.join(' ')}</Text>
				))}
			</Box>

			<Box marginTop={1} paddingX={2} borderStyle="round">
				<Text>{message}</Text>
			</Box>
		</Box>
	);
};

export default MapView;