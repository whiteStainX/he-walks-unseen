import type { GamePhase } from './fsm.js';

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  name: string;
  char: string;
  color?: string;
  position: Point;
  interaction?: DoorInteraction | ChestInteraction;
}

export interface DoorInteraction {
  type: 'door';
  isOpen: boolean;
}

export interface ChestInteraction {
  type: 'chest';
  isLooted: boolean;
  loot: string; // For now, a simple string representing the item id
}

export interface Actor extends Entity {
  hp: {
    current: number;
    max: number;
  };
  attack: number;
  defense: number;
  isPlayer?: true;
  inventory?: Item[];
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
  xpValue?: number;
  skills?: Skill[];
  ai?: {
    canWander?: boolean;
    canChase?: boolean;
  };
}

export interface Item extends Entity {
  effect: PotionEffect;
  potency: number;
}

export interface Tile {
  char: string;
  walkable: boolean;
  transparent: boolean;
}

export type PotionEffect = 'heal' | 'damage';

export interface Skill {
  id: string;
  name: string;
  description: string;
}

export type MessageType = 'info' | 'damage' | 'heal' | 'win' | 'death';

export interface GameState {
  phase: GamePhase;
  actors: Actor[];
  items: Item[];
  entities: Entity[];
  map: {
    tiles: Tile[][];
    width: number;
    height: number;
  };
  message: string;
  messageType: MessageType;
  selectedItemIndex?: number;
  target?: Point;
  currentFloor: number;
}
