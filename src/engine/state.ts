import type { GamePhase } from './fsm.js';
import type { ThemeName } from '../themes.js';

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
  equipment?: Partial<Record<EquipmentSlot, Item>>;
  inventory?: Item[];
  level?: number;
  xp?: number;
  xpToNextLevel?: number;
  xpValue?: number;
  skills?: Skill[];
  loot?: string;
  ai?: Ai;
  statusEffects?: StatusEffect[];
  profile?: string;
}

export type StatusEffectType = 'poison';

export interface StatusEffect {
  id: string;
  type: StatusEffectType;
  duration: number; // in turns
  potency: number; // e.g., damage per turn for poison
}

export type AiState = 'idle' | 'wander' | 'chase' | 'flee' | 'patrol';

export interface Ai {
  state: AiState;
  canPassThroughWalls?: boolean;
  fleeThreshold?: number; // as a percentage of max HP
  patrolPoints?: Point[];
  currentPatrolIndex?: number;
}

export type EquipmentSlot = 'weapon' | 'armor';

export interface Equipment {
  slot: EquipmentSlot;
  bonuses: {
    attack?: number;
    defense?: number;
  };
  onHit?: {
    type: StatusEffectType;
    duration: number;
    potency: number;
    chance: number; // e.g., 0.5 for 50%
  };
}

export type ItemEffectType =
  | 'heal'
  | 'damage'
  | 'fireball'
  | 'revealMap'
  | 'applyStatus'
  | 'identify';

export interface BaseEffect {
  type: ItemEffectType;
  requiresTarget: boolean;
}

export interface HealEffect extends BaseEffect {
  type: 'heal';
  potency: number;
}

export interface DamageEffect extends BaseEffect {
  type: 'damage';
  potency: number;
}

export interface FireballEffect extends BaseEffect {
  type: 'fireball';
  potency: number;
  radius: number;
}

export interface RevealMapEffect extends BaseEffect {
  type: 'revealMap';
}

export interface ApplyStatusEffect extends BaseEffect {
  type: 'applyStatus';
  status: StatusEffectType;
  duration: number;
  potency: number;
}

export interface IdentifyEffect extends BaseEffect {
  type: 'identify';
}

export type ItemEffect =
  | HealEffect
  | DamageEffect
  | FireballEffect
  | RevealMapEffect
  | ApplyStatusEffect
  | IdentifyEffect;

export interface Item extends Entity {
  effects?: ItemEffect[];
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
}

export type MessageType = 'info' | 'damage' | 'heal' | 'win' | 'death';

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
  playerExpression?: string;
}

export interface ConversationState {
  parcelId: string;
  currentNodeId: string;
  selectedChoiceIndex: number;
}

export type Prefab = Omit<Entity, 'id' | 'position'>;

export interface PrefabCollection {
  [id: string]: Prefab;
}
