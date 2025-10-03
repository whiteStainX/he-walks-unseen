import { eventBus } from './events.js';

type ScriptCommand = [string, ...any[]];

/**
 * A simple script processor that executes a list of commands.
 * @param commands An array of command tuples.
 */
export function executeScript(commands: ScriptCommand[]): void {
  for (const command of commands) {
    const [action, ...args] = command;

    switch (action.toUpperCase()) {
      case 'SAY':
        // For a SAY command, we might emit an event for the UI to handle.
        eventBus.emit('dialogue', { speaker: 'Narrator', line: args[0] });
        break;
      case 'ADD_ITEM':
        // Placeholder for adding an item to player inventory
        eventBus.emit('inventoryUpdate', { action: 'add', itemId: args[0] });
        break;
      // Add other command handlers here
      default:
        console.warn(`Unknown script action: ${action}`);
    }
  }
}