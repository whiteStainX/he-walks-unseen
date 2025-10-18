import type { GamePhase } from './fsm.js';
import type { ThemeName } from '../themes.js';
import type { z } from 'zod';
import { StatusEffectsSchema, AiStatesSchema, EquipmentSlotsSchema, AttributesSchema, MessageTypesSchema, EffectsSchema } from './schemas.js';

export interface Point {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  name: string;
  char: string;
  color?: string;
  states?: Record<string, string>;
  position: Point;
  interaction?: DoorInteraction | ChestInteraction | StairsInteraction | PortalInteraction | ConversationInteraction;
}

export interface ConversationInteraction {
  type: 'conversation';
  parcelId: string;
}

export interface PortalInteraction {
  type: 'portal';
  id: string;
  targetMapId: string;
  targetPortalId: string;
}

export interface StairsInteraction {
  type: 'stairs';
  direction: 'up' | 'down';
}

export interface DoorInteraction {
  type: 'door';
  isOpen: boolean;
}

export interface ChestInteraction {
  type: 'chest';
  isLooted: boolean;
  lootTableId: string;
}

export interface Actor extends Entity {
  hp: {
    current: number;
    max: number;
  };
  attack: number;
  defense: number;
  isPlayer?: true;
  equipment?: Partial<Record<EquipmentSlot, Item>>;
  inventory?: Item[];
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
  xpValue?: number;
  lootTableId?: string;
  ai?: Ai;
  statusEffects?: StatusEffect[];
  profile?: string;
  skillPoints?: number;
  learnedSkills?: Record<string, boolean>;
  actionPoints?: { current: number; max: number; };
  critChance?: number;
  critDamage?: number;

  // Attributes
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  vitality?: number;
  attributePoints?: number;
}

export type StatusEffectType = keyof z.infer<typeof StatusEffectsSchema>;


export interface StatusEffect {
  id: string;
  type: StatusEffectType;
  duration: number; // in turns
  potency: number; // e.g., damage per turn for poison
}

export type AiState = keyof z.infer<typeof AiStatesSchema>;

export interface Ai {
  state: AiState;
  canPassThroughWalls?: boolean;
  fleeThreshold?: number; // as a percentage of max HP
  patrolPoints?: Point[];
  currentPatrolIndex?: number;
}

export type EquipmentSlot = keyof z.infer<typeof EquipmentSlotsSchema>;

export interface Equipment {
  slot: EquipmentSlot;
  bonuses: {
    attack?: number;
    defense?: number;
    critChance?: number;
    critDamage?: number;
  };
  damage?: { min: number; max: number; };
  onHit?: {
    type: StatusEffectType;
    duration: number;
    potency: number;
    chance: number; // e.g., 0.5 for 50%
  };
}

export type Attribute = keyof z.infer<typeof AttributesSchema>;

export type EffectType = keyof z.infer<typeof EffectsSchema>;

export interface Effect {
  type: EffectType;
  requiresTarget: boolean;
  potency?: number;
  radius?: number;
  status?: StatusEffectType;
  duration?: number;
  attribute?: Attribute;
}

export interface Item extends Entity {
  effects?: Effect[];
  equipment?: Equipment;
  unidentifiedName?: string;
  identified?: boolean;
}

export interface Tile {
  char: string;
  walkable: boolean;
  transparent: boolean;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'passive' | 'active';
  prerequisites?: string[];
  cost?: number;
  apCost?: number;
  
  effects?: Effect[];
}

export type MessageType = keyof z.infer<typeof MessageTypesSchema>;

export interface Message {
  id: string;
  text: string;
  type: MessageType;
}

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
  log: Message[];
  logOffset: number;
  visibleTiles: Set<string>; // "x,y" format for quick lookups
  exploredTiles: Set<string>; // "x,y" format for quick lookups
  selectedItemIndex?: number;
  pendingItem?: Item;
  target?: Point;
  combatTargetId?: string;
  selectedCombatMenuIndex?: number;
  currentMapId: string;
  mapStates: Map<string, GameState>;
  conversation?: ConversationState;
  activeTheme: ThemeName;
}

export interface ConversationState {
  parcelId: string;
  currentNodeId: string;
  selectedChoiceIndex: number;
  actorId?: string;
}

export type Prefab = Omit<Entity, 'id' | 'position'>;

export interface DefinitionCollection {
  [id: string]: Prefab;
}
