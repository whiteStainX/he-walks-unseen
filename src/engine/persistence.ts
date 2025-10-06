import { promises as fs } from 'fs';
import path from 'path';
import {
  commitHistory,
  branches,
  activeBranch,
  initializeEngine,
} from './narrativeEngine.js';
import { GameState } from './state.js';

const SAVE_DIR = './saves';
const SAVE_FILE = path.join(SAVE_DIR, 'savegame.json');

/**
 * A replacer function for JSON.stringify to handle complex types.
 * - Converts Map to an array of [key, value] pairs.
 * - Converts Set to an array of values.
 */
function replacer(key: any, value: any) {
  if (value instanceof Map) {
    return {
      _type: 'Map',
      value: Array.from(value.entries()),
    };
  }
  if (value instanceof Set) {
    return {
      _type: 'Set',
      value: Array.from(value.values()),
    };
  }
  return value;
}

/**
 * A reviver function for JSON.parse to reconstruct complex types.
 * - Converts an object with _type: 'Map' back to a Map.
 * - Converts an object with _type: 'Set' back to a Set.
 */
function reviver(key: any, value: any) {
  if (typeof value === 'object' && value !== null) {
    if (value._type === 'Map') {
      return new Map(value.value);
    }
    if (value._type === 'Set') {
      return new Set(value.value);
    }
  }
  return value;
}

/**
 * Saves the entire narrative engine state to a file.
 */
export async function saveGame(): Promise<void> {
  try {
    // Ensure the save directory exists
    await fs.mkdir(SAVE_DIR, { recursive: true });

    const narrativeState = {
      commitHistory: commitHistory,
      branches: branches,
      activeBranch: activeBranch,
    };

    const serializedState = JSON.stringify(narrativeState, replacer, 2);
    await fs.writeFile(SAVE_FILE, serializedState);
  } catch (error) {
    // In a real application, you'd want more robust error handling
    console.error('Error saving game:', error);
  }
}

/**
 * Loads the narrative engine state from a file.
 */
export async function loadGame(): Promise<void> {
  try {
    const fileContent = await fs.readFile(SAVE_FILE, 'utf-8');
    if (!fileContent) {
      return; // No save file, start a new game
    }

    const narrativeState = JSON.parse(fileContent, reviver);

    // Type assertion to ensure the loaded data has the correct structure
    const history = narrativeState.commitHistory as Map<string, GameState>;
    const branchMap = narrativeState.branches as Map<string, string>;
    const currentBranch = narrativeState.activeBranch as string;

    initializeEngine(history, branchMap, currentBranch);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Save file doesn't exist, which is fine on first run.
      return;
    }
    console.error('Error loading game:', error);
  }
}