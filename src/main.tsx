import { useState, useEffect } from 'react';
import { render, Box, Text } from 'ink';
import { loadResources } from './engine/resourceManager.js';
import { eventBus } from './engine/events.js';
import type { GameState } from './engine/state.js';
import WelcomeScreen from './components/WelcomeScreen.js';
import GameScreen from './components/GameScreen.js';
import { createInitialGameState } from './game/initialState.js';
import { loadGame } from './engine/persistence.js';
import { getCurrentState, initializeEngine } from './engine/narrativeEngine.js';
import { loadWorldData } from './engine/worldManager.js';
import { processEnemyTurns } from './game/enemyTurns.js';
import { produce } from 'immer';

import { enableMapSet } from 'immer';

enableMapSet();

const App = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await loadResources('./data');
        loadWorldData();

        const savedState = await loadGame();
        if (!savedState) {
          initializeEngine(createInitialGameState());
        }

        eventBus.emit('engineReady');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        eventBus.emit('engineError', `Failed to initialize engine: ${errorMessage}`);
      }
    };

    const handleEngineReady = () => {
      setGameState(getCurrentState()!);
    };

    const handleEngineError = (errorMessage: string) => {
      setError(errorMessage);
    };

    const handleStateChanged = (newState: GameState) => {
      setGameState(newState);
    };

    eventBus.on('engineReady', handleEngineReady);
    eventBus.on('engineError', handleEngineError);
    eventBus.on('stateChanged', handleStateChanged);

    init();

    return () => {
      eventBus.off('engineReady', handleEngineReady);
      eventBus.off('engineError', handleEngineError);
      eventBus.off('stateChanged', handleStateChanged);
    };
  }, []);

  useEffect(() => {
    if (gameState?.phase === 'EnemyTurn') {
      const timer = setTimeout(() => {
        const nextState = produce(gameState, (draft) => {
          processEnemyTurns(draft);
        });
        eventBus.emit('stateChanged', nextState);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

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

  if (gameState.phase === 'Welcome') {
    return <WelcomeScreen />;
  }

  return <GameScreen gameState={gameState} />;
};

render(<App />);
