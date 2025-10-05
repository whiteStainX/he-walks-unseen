import { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { loadResources } from './engine/resourceManager.js';
import { eventBus } from './engine/events.js';
import type { GameState } from './engine/state.js';
import GameScreen from './components/GameScreen.js';
import { createInitialGameState } from './game/initialState.js';

const App = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeEngine = async () => {
      try {
        await loadResources('./data');
        eventBus.emit('engineReady');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        eventBus.emit('engineError', `Failed to initialize engine: ${errorMessage}`);
      }
    };

    const handleEngineReady = () => {
      setGameState(createInitialGameState());
    };

    const handleEngineError = (errorMessage: string) => {
      setError(errorMessage);
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

  if (error) {
    return (
      <Box borderStyle="round" padding={1} borderColor="red">
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (!gameState) {
    return (
      <Box borderStyle="round" padding={1}>
        <Text>Initializing engine...</Text>
      </Box>
    );
  }

  return <GameScreen initialState={gameState} />;
};

render(<App />);
