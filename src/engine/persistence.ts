import { promises as fs } from 'fs';
import path from 'path';
import { initializeEngine, getCurrentState } from './narrativeEngine.js';
import { GameState } from './state.js';

const SAVE_DIR = './saves';
const SAVE_FILE = path.join(SAVE_DIR, 'savegame.json');

export function replacer(key: any, value: any) {
  if (value instanceof Map) {
    return { _type: 'Map', value: Array.from(value.entries()) };
  }
  if (value instanceof Set) {
    return { _type: 'Set', value: Array.from(value.values()) };
  }
  return value;
}

export function reviver(key: any, value: any) {
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

export async function saveGame(): Promise<void> {
  try {
    await fs.mkdir(SAVE_DIR, { recursive: true });
    const currentState = getCurrentState();
    if (currentState) {
      const serializedState = JSON.stringify(currentState, replacer, 2);
      await fs.writeFile(SAVE_FILE, serializedState);
    }
  } catch (error) {
    console.error('Error saving game:', error);
  }
}

export async function loadGame(): Promise<GameState | null> {
  try {
    const fileContent = await fs.readFile(SAVE_FILE, 'utf-8');
    if (!fileContent) {
      return null; // No save file
    }

    const savedState = JSON.parse(fileContent, reviver) as GameState;
    initializeEngine(savedState);
    return savedState;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null; // Save file doesn't exist
    }
    console.error('Error loading game:', error);
    return null;
  }
}

export async function deleteSaveGame(): Promise<void> {
  try {
    await fs.unlink(SAVE_FILE);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return; // Save file doesn't exist, which is fine.
    }
    console.error('Error deleting save game:', error);
  }
}