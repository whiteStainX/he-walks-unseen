# He Walks Unseen Engine Design

## 1. Technical Specifications

### 1.1 Runtime and Tooling
- **Language & Build**: TypeScript project targeting Node.js 18+. Uses `tsx` for development execution and `tsc` for builds.[README.md:L53-L78](./README.md#L53-L78)[package.json:L1-L31](./package.json#L1-L31)
- **Primary Dependencies**:
  - [Ink](https://github.com/vadimdemedes/ink) and React for terminal UI rendering.[package.json:L12-L18](./package.json#L12-L18)
  - `nanoid` for generating compact commit identifiers within the narrative engine.[package.json:L12-L18](./package.json#L12-L18)[src/engine/narrativeEngine.ts:L1-L32](./src/engine/narrativeEngine.ts#L1-L32)
  - `geotic` and `rot-js` are available for future entity/system or roguelike mechanics integration.[package.json:L12-L18](./package.json#L12-L18)
- **Testing**: Jest with `ts-jest` for TypeScript-aware unit tests.[package.json:L1-L31](./package.json#L1-L31)[README.md:L59-L66](./README.md#L59-L66)

### 1.2 Engine Capabilities
- **Resource Loading & Validation**: Discovers every JSON file in `/data`, parses them, validates their structure using `zod` schemas, and caches the result for fast lookup.
- **World Map System**: A data-driven world system (`worldManager.ts`) loads and manages the world structure from `data/world.json`, including the graph of interconnected maps, their properties, and prefab placements.
- **Game State Modeling**: Centralized `GameState` snapshot includes a unified `Entity` system. `Actors`, `Items`, and other interactables are all extensions of the base `Entity` type. Interactions are handled through a component-based approach. The game state tracks the `currentMapId` and caches the state of visited maps in `mapStates` for a persistent world experience.
- **Event-Driven Core**: Global `EventEmitter` enables decoupled communication across systems and the UI.[src/engine/events.ts:L1-L6](./src/engine/events.ts#L1-L6)
- **Finite State Machine**: Tracks high-level runtime phases (e.g., `MainMenu`, `PlayerTurn`, `EnemyTurn`, `Inventory`, `Targeting`, `CombatMenu`) and publishes transitions on the event bus.[src/engine/fsm.ts:L1-L26](./src/engine/fsm.ts#L1-L26)
- **Event-Driven State Management with Immer**: The engine uses `immer` to manage state immutably. Actions trigger state changes through a central `updateState` function, which uses `immer`'s `produce` to create a new state. This new state is then broadcast via an event bus, and the `narrativeEngine` commits it to history. This provides an efficient and predictable state management system.
- **Git-Like Narrative History**: Supports committing state snapshots, naming timeline branches, and checking out alternate histories.[src/engine/narrativeEngine.ts:L1-L82](./src/engine/narrativeEngine.ts#L1-L82)
- **Script Processor**: Executes simple verb-argument command tuples and broadcasts side effects (dialogue, inventory hooks).[src/engine/scriptProcessor.ts:L1-L27](./src/engine/scriptProcessor.ts#L1-L27)
- **Terminal Presentation Layer**: Ink-based map renderer overlays actors and items on top of cached map tiles and surfaces system messages with color-coded feedback.[src/components/MapView.tsx:L1-L44](./src/components/MapView.tsx#L1-L44)
- **Inventory & Progression**: The engine supports a full inventory system (pickup, use, drop, stacking) and a player progression system (XP and leveling).[src/game/progression.ts:L1-L59](./src/game/progression.ts#L1-L59)
- **Input Abstraction**: Converts key presses into semantic `GameAction` enums for the logic layer to consume. The keybinding system is phase-aware, allowing for different controls in different game states (e.g., `PlayerTurn` vs. `Inventory`).[src/input/actions.ts:L1-L24](./src/input/actions.ts#L1-L24)[src/input/keybindings.ts:L1-L39](./src/input/keybindings.ts#L1-L39)
- **Modular Game Logic**: The core game logic is broken down into smaller, decoupled modules, each responsible for a specific domain (e.g., `playerActions.ts`, `inventoryActions.ts`, `combatMenuActions.ts`). This makes the codebase more maintainable, testable, and easier to extend. The main `updateState.ts` file acts as a router, delegating actions to the appropriate module.
- **State-Based Enemy AI**: Enemies operate on a state machine (`idle`, `wander`, `patrol`, `chase`, `flee`). This allows for advanced behaviors like patrol routes, intelligent chasing via A* pathfinding, and fleeing when at low health.[src/game/ai.ts](./src/game/ai.ts)
- **Equipment System**: Actors can equip items (e.g., weapons, armor) into specific slots. Equipped items provide passive stat bonuses (e.g., attack, defense) that are automatically applied in combat calculations. The system is managed through `src/game/equipment.ts` and integrated into the UI via the `EquipmentView` component.
- **Status Effects System**: A framework for applying temporary conditions to actors, such as `Poisoned`. The system processes effects each turn, applying damage and decrementing duration. Effects can be applied via combat hits and are displayed on the UI.
- **Expanded Item & Magic System**: A flexible item system that supports a variety of effects, including healing, damage, area-of-effect spells, and utility magic. Items can have multiple effects and can require targeting, which transitions the game to a dedicated `Targeting` phase.
- **Item Identification System**: A classic roguelike mechanic where magical items can be unidentified. The system supports identification through use (e.g., drinking a potion) or via a "Scroll of Identify". This is managed through `identified` and `unidentifiedName` properties on the `Item` object and a dedicated `IdentifyMenu` game phase.
- **Prefab System**: A data-driven system for creating entity templates (prefabs). This simplifies content creation by allowing for the definition of base entities that can be instantiated and placed in the world.
- **Manual Save/Load**: The game state can be manually saved by the player. The game automatically loads the last save on startup. This is handled by a dedicated `persistence.ts` module that serializes and deserializes complex data structures like `Map` and `Set` objects.[src/engine/persistence.ts](./src/engine/persistence.ts)
- **Detailed Message Log**: A scrollable, in-game message log allows players to review a history of events, from combat results to item interactions. The log is accessible via a dedicated key and UI phase.

### 1.3 Current Limitations
- **Script Vocabulary**: Only `SAY` and `ADD_ITEM` verbs are implemented; additional opcodes require manual extension.[src/engine/scriptProcessor.ts:L9-L26](./src/engine/scriptProcessor.ts#L9-L26)
- **UI Bootstrap**: The current Ink entry point demonstrates initialization feedback but does not yet host gameplay loops or player input wiring.[src/main.tsx:L1-L48](./src/main.tsx#L1-L48)

## 2. Architecture Overview

```
+-------------------------+
|        Presentation     |
|  (Ink React components) |
|  - main.tsx             |
|  - MapView              |
+------------+------------+
             |
             | eventBus emits/render props
             v
+------------+------------+
|         Logic Layer     |
|  - FiniteStateMachine   |
|  - Narrative Engine     |
|  - World Manager        |
|  - Script Processor     |
|  - GameState model      |
|  - Event Bus            |
+------------+------------+
             |
             | getResource()/loadResources()
             v
+------------+------------+
|          Data Layer     |
|   JSON under /data      |
|   - world.json          |
|   - themes.json         |
|   - enemies.json        |
|   - items.json          |
|   - entities.json       |
+-------------------------+
```

### 2.1 Data Layer
- Maintains canonical definitions for the world structure, themes, enemies, items, and interactable entities, serialized as JSON. `world.json` is the entry point for the world's structure.
- The `ResourceManager` ingests this directory during boot, populating an in-memory cache keyed by filename sans extension.

### 2.2 Logic Layer
- **State Orchestration**: `FiniteStateMachine` emits `gameStateChanged` events whenever the UI or scripts switch top-level modes, enabling the presentation layer or other systems to respond.[src/engine/fsm.ts:L1-L26](./src/engine/fsm.ts#L1-L26)
- **Timeline Control**: `commit`, `createBranch`, `checkout`, and `getCurrentState` provide Git-inspired time travel over full `GameState` snapshots; branches map to the last commit they reference.[src/engine/narrativeEngine.ts:L7-L82](./src/engine/narrativeEngine.ts#L7-L82)
- **Scripting Hooks**: `executeScript` iterates command tuples, performing engine mutations by emitting semantic events—allowing custom reactors without coupling the interpreter to specific subsystems.[src/engine/scriptProcessor.ts:L9-L26](./src/engine/scriptProcessor.ts#L9-L26)
- **Global Messaging**: `eventBus` is the transport between logic and presentation; all runtime notifications (engine ready, dialogue, inventory updates) flow through it.[src/engine/events.ts:L1-L6](./src/engine/events.ts#L1-L6)[src/main.tsx:L10-L38](./src/main.tsx#L10-L38)
- **Game State Shape**: `GameState` defines the minimal world snapshot structure, enabling timeline commits and UI rendering to share a single contract.[src/engine/state.ts:L13-L22](./src/engine/state.ts#L13-L22)

### 2.3 Presentation Layer
- `main.tsx` boots the engine by loading resources and reporting readiness or failure via Ink components subscribed to the event bus.[src/main.tsx:L1-L48](./src/main.tsx#L1-L48)
- `MapView` consumes `GameState` props to visualize the tile grid and overlay the player location while highlighting status messages.[src/components/MapView.tsx:L9-L39](./src/components/MapView.tsx#L9-L39)
- Input translation modules map keystrokes into `GameAction` events, keeping the UI reactive while insulating the logic from raw input details.[src/input/actions.ts:L1-L24](./src/input/actions.ts#L1-L24)[src/input/keybindings.ts:L4-L38](./src/input/keybindings.ts#L4-L38)

## 3. Developer Manual

### 3.1 Project Setup
1. Install dependencies: `npm install`.
2. Run the interactive build: `npm start` for development or `npm run build` followed by `node dist/main.js` for production binaries.[README.md:L43-L78](./README.md#L43-L78)
3. Execute tests during refactors with `npm test` to exercise the TypeScript-aware Jest suite.[README.md:L59-L66](./README.md#L59-L66)

### 3.2 Loading and Accessing Data
- Place domain JSON under `/data`. Each file becomes accessible via its basename, e.g. `enemies.json` → `getResource('enemies')`.
- The startup sequence in `main.tsx` calls `loadResources('./data')` to populate the cache, and then `loadWorldData()` to process `world.json` and initialize the `worldManager`.
- Example: after initialization, retrieve a map's definition with `const mapDef = getMapDefinition('town');` and hydrate your `GameState` before committing.

### 3.3 Managing Game State
- Instantiate a `GameState` object conforming to `state.ts` before entering the gameplay loop. Populate `player`, `map`, and `message` fields to keep the renderer synchronized.[src/engine/state.ts:L13-L22](./src/engine/state.ts#L13-L22)[src/components/MapView.tsx:L9-L39](./src/components/MapView.tsx#L9-L39)
- Use `commit(state)` whenever a meaningful narrative decision or checkpoint occurs. Store the returned commit ID if you need to branch later.[src/engine/narrativeEngine.ts:L22-L40](./src/engine/narrativeEngine.ts#L22-L40)
- To explore alternates, call `createBranch('what-if', commitId)` followed by `checkout('what-if')`, then mutate `GameState` and `commit` again. `getCurrentState()` retrieves the head snapshot for the active branch, useful when resuming play after a checkout.[src/engine/narrativeEngine.ts:L43-L82](./src/engine/narrativeEngine.ts#L43-L82)

### 3.4 Orchestrating Flow with the FSM
- Construct `new FiniteStateMachine('MainMenu')` at startup. Subscribe to `gameStateChanged` on the event bus to update UI layout or pause input when states change.[src/engine/fsm.ts:L3-L26](./src/engine/fsm.ts#L3-L26)
- Call `fsm.transition('Dialogue')` when launching scripted conversations; the bus event enables components to swap views without directly coupling to the FSM instance.[src/engine/fsm.ts:L16-L24](./src/engine/fsm.ts#L16-L24)

### 3.5 Scripting Narrative Moments
- Script files or inline definitions should provide arrays of tuples such as `['SAY', 'The woods are silent.']` or `['ADD_ITEM', 'flashlight']`.
- Pass the array into `executeScript`, then listen for `dialogue` or `inventoryUpdate` events to update UI panels or mutate inventory systems.[src/engine/scriptProcessor.ts:L9-L26](./src/engine/scriptProcessor.ts#L9-L26)
- Extend the command vocabulary by adding new `case` blocks; ensure each branch communicates through the event bus or directly alters `GameState` as needed.

### 3.6 Integrating Input
- Bind key handlers (Ink `useInput`) to `resolveAction` so keystrokes emit `GameAction` values. Route those actions to your gameplay systems to move the player, trigger commits, or open menus.[src/input/keybindings.ts:L4-L38](./src/input/keybindings.ts#L4-L38)[src/input/actions.ts:L6-L24](./src/input/actions.ts#L6-L24)
- Expand `GameAction` whenever you introduce new verbs, and mirror them in `characterBindings` to provide keyboard access.

### 3.7 Rendering the World
- The main `GameScreen` component consumes the active `GameState` to render the world. When the state changes (e.g., after a player action or map transition), React and Ink re-render the necessary UI components.
- Map transitions are handled by updating the `GameState` to the new map's state, which triggers a full re-render of the `GameScreen` with the new map data.

### 3.8 Extending the Engine
- **Persistence**: Wrap narrative commits in a serialization layer to persist `commitHistory` and `branches` between sessions.[src/engine/narrativeEngine.ts:L7-L82](./src/engine/narrativeEngine.ts#L7-L82)
- **Validation**: The engine now uses `zod` for robust schema validation of all data files, catching malformed data during development.
- **Gameplay Systems**: Introduce collision detection or combat by enriching `GameState` with additional structures and wiring new events or FSM states to orchestrate transitions.[src/engine/state.ts:L7-L22](./src/engine/state.ts#L7-L22)[src/engine/fsm.ts:L3-L26](./src/engine/fsm.ts#L3-L26)
- **UI Enhancements**: Expand the Ink presentation with panels reacting to `dialogue`, `inventoryUpdate`, and custom events triggered by scripts and timeline operations.[src/main.tsx:L21-L37](./src/main.tsx#L21-L37)[src/engine/scriptProcessor.ts:L13-L26](./src/engine/scriptProcessor.ts#L13-L26)

### 3.9 Using the Prefab System

The engine includes a prefab system to simplify the creation of entities. Prefabs are templates for actors and items, defined in `data/prefabs.json`.

**Defining Prefabs:**

Prefabs are defined in `data/prefabs.json`. Each prefab is a JSON object with a unique key. For example:
```json
{
  "goblin": {
    "name": "Goblin",
    "char": "g",
    "hp": { "current": 8, "max": 8 },
    ...
  }
}
```

**Instantiating Prefabs:**

To create a new entity from a prefab, use the `instantiate` function:
```typescript
import { instantiate } from '../engine/prefab.js';

const newGoblin = instantiate('goblin');
```
The `instantiate` function will create a deep copy of the prefab and assign it a new, unique ID.

**Integration with Map Generation:**

The map generation logic in `src/game/initialState.ts` uses the prefab system to populate the world with enemies, items, and prefabs defined in the `world.json` data.

### 3.10 Code Hygiene

To maintain a clean codebase, the project is configured to detect unused variables and imports. This is enforced by the TypeScript compiler via the `noUnusedLocals` option in `tsconfig.json`.

To check for any unused code, you can run:
```bash
npx tsc --noEmit
```
This will report any unused local variables or imports without generating any JavaScript files.

## 4. Reference Startup Sequence
1. `main.tsx` mounts the Ink app, calls `loadResources('./data')`, and then `loadWorldData()`.
2. Upon success, it emits `engineReady`; failures emit `engineError` for graceful degradation.[src/main.tsx:L10-L38](./src/main.tsx#L10-L38)
3. Subscribers (e.g., UI components, dev tooling) listen on `eventBus` to react, then instantiate the FSM, load initial `GameState` (using the `startMapId` from the world data), render `GameScreen`, and start collecting input.
4. As gameplay progresses, systems call into the narrative engine to checkpoint, branch, and retrieve alternate timelines, maintaining the Git-like storytelling loop.[src/engine/narrativeEngine.ts:L22-L82](./src/engine/narrativeEngine.ts#L22-L82)

## 5. Future Enhancements

This section outlines potential features that would round out the roguelike engine fundamentals before focusing on narrative content.