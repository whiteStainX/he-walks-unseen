import React, { useState, useEffect } from 'react';
import { render, Text, Box } from 'ink';
import { loadResources } from './engine/resourceManager.js';
import { eventBus } from './engine/events.js';

const App = () => {
  const [message, setMessage] = useState('Initializing engine...');

  useEffect(() => {
    const initializeEngine = async () => {
      try {
        await loadResources('./data');
        // Emit an event to signal that the engine is ready
        eventBus.emit('engineReady', 'Engine Initialized Successfully!');
      } catch (error) {
        console.error(error);
        eventBus.emit('engineError', 'Failed to initialize engine.');
      }
    };

    const handleEngineReady = (newMessage: string) => {
      setMessage(newMessage);
    };

    const handleEngineError = (errorMessage: string) => {
        setMessage(errorMessage);
    }

    eventBus.on('engineReady', handleEngineReady);
    eventBus.on('engineError', handleEngineError);

    initializeEngine();

    // Cleanup listener on unmount
    return () => {
      eventBus.off('engineReady', handleEngineReady);
      eventBus.off('engineError', handleEngineError);
    };
  }, []);

  return (
    <Box borderStyle="round" padding={1}>
      <Text>{message}</Text>
    </Box>
  );
};

render(<App />);