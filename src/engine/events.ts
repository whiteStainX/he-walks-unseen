import { EventEmitter } from 'events';

/**
 * A globally accessible event bus for inter-module communication.
 */
export const eventBus = new EventEmitter();