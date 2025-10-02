import React, { useState, useEffect } from 'react';
import { render, useApp, useInput } from 'ink';
import { getInitialState, update } from './engine/game.js';
import { GameAction } from './input/actions.js';
import { keybindings } from './input/keybindings.js';
import MapView from './components/MapView.js';
import type { GameState } from './engine/state.js';

const App = () => {
	const [state, setState] = useState<GameState>(getInitialState);
	const { exit } = useApp();

	// This effect will run after a render, checking if the game's state
	// indicates it's time to quit. This is cleaner than exiting directly
	// from the input handler.
	useEffect(() => {
		if (state.message === 'Quitting...') {
			exit();
		}
	}, [state.message, exit]);

	useInput((input, key) => {
		// Allow Ctrl+C to exit at any time.
		if (key.ctrl && input === 'c') {
			setState(update(state, GameAction.QUIT));
			return;
		}

		// Determine the action from the keybinding map.
		// `key.name` is for special keys (e.g., 'arrowUp'), `input` is for regular chars.
		const actionKey = key.name || input;
		const action = keybindings[actionKey];

		if (action) {
			const newState = update(state, action);
			setState(newState);
		}
	});

	return <MapView state={state} />;
};

render(<App />);