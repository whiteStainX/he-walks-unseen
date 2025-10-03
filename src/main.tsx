import React, { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { loadResources } from './engine/resourceManager.js';
import { eventBus } from './engine/events.js';
import type { GameState } from './engine/state.js';
import GameScreen from './components/GameScreen.js';
import { createInitialGameState } from './game/initialState.js';

const App = () => {
  const [statusMessage, setStatusMessage] = useState('Initializing engine...');
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    const initializeEngine = async () => {
      try {
        await loadResources('./data');
        eventBus.emit('engineReady', 'Engine ready. Use WASD or the arrow keys to move.');
      } catch (error) {
        console.error(error);
        eventBus.emit('engineError', 'Failed to initialize engine.');
      }
    };

    const handleEngineReady = (newMessage: string) => {
      setStatusMessage(newMessage);
      setGameState(createInitialGameState(newMessage));
    };

    const handleEngineError = (errorMessage: string) => {
      setStatusMessage(errorMessage);
      setGameState(null);
    };

    eventBus.on('engineReady', handleEngineReady);
    eventBus.on('engineError', handleEngineError);

    initializeEngine();

    return () => {
      eventBus.off('engineReady', handleEngineReady);
      eventBus.off('engineError', handleEngineError);
    };
  }, []);

  if (!gameState) {
    return (
      <Box borderStyle="round" padding={1}>
        <Text>{statusMessage}</Text>
      </Box>
    );
  }

  return <GameScreen initialState={gameState} statusMessage={statusMessage} />;
};

render(<App />);
