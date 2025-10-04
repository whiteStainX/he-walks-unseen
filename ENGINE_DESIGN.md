# He Walks Unseen Engine Design

## 1. Technical Specifications

### 1.1 Runtime and Tooling
- **Language & Build**: TypeScript project targeting Node.js 18+. Uses `tsx` for development execution and `tsc` for builds.【F:README.md†L53-L78】【F:package.json†L1-L31】
- **Primary Dependencies**:
  - [Ink](https://github.com/vadimdemedes/ink) and React for terminal UI rendering.【F:package.json†L12-L18】
  - `nanoid` for generating compact commit identifiers within the narrative engine.【F:package.json†L12-L18】【F:src/engine/narrativeEngine.ts†L1-L32】
  - `geotic` and `rot-js` are available for future entity/system or roguelike mechanics integration.【F:package.json†L12-L18】
- **Testing**: Jest with `ts-jest` for TypeScript-aware unit tests.【F:package.json†L1-L31】【F:README.md†L59-L66】

### 1.2 Engine Capabilities
- **Resource Loading**: Discovers every JSON file in `/data`, parses them, and caches the result for fast lookup.【F:src/engine/resourceManager.ts†L1-L42】
- **Game State Modeling**: Centralized `GameState` snapshot includes a unified `Entity` system. `Actors`, `Items`, and other interactables are all extensions of the base `Entity` type. Interactions are handled through a component-based approach.【F:src/engine/state.ts†L2-L55】
- **Event-Driven Core**: Global `EventEmitter` enables decoupled communication across systems and the UI.【F:src/engine/events.ts†L1-L6】
- **Finite State Machine**: Tracks high-level runtime phases (e.g., `MainMenu`, `PlayerTurn`, `EnemyTurn`, `Inventory`, `Targeting`) and publishes transitions on the event bus.【F:src/engine/fsm.ts†L1-L26】
- **Git-Like Narrative History**: Supports committing deep-copied state snapshots, naming timeline branches, and checking out alternate histories.【F:src/engine/narrativeEngine.ts†L1-L82】
- **Script Processor**: Executes simple verb-argument command tuples and broadcasts side effects (dialogue, inventory hooks).【F:src/engine/scriptProcessor.ts†L1-L27】
- **Terminal Presentation Layer**: Ink-based map renderer overlays actors and items on top of cached map tiles and surfaces system messages with color-coded feedback.【F:src/components/MapView.tsx†L1-L44】
- **Inventory & Progression**: The engine supports a full inventory system (pickup, use, drop, stacking) and a player progression system (XP and leveling).【F:src/game/progression.ts†L1-L59】【F:src/game/updateState.ts†L1-L270】
- **Input Abstraction**: Converts key presses into semantic `GameAction` enums for the logic layer to consume. The keybinding system is phase-aware, allowing for different controls in different game states (e.g., `PlayerTurn` vs. `Inventory`).【F:src/input/actions.ts†L1-L24】【F:src/input/keybindings.ts†L1-L39】

### 1.3 Current Limitations
- **Volatile History**: Commit and branch registries live in-memory; no persistence between sessions or disk serialization is provided.【F:src/engine/narrativeEngine.ts†L7-L82】
- **Simple AI**: Enemies follow a data-driven AI with behavior flags (`canWander`, `canChase`). The engine includes basic bump-to-attack combat.【F:src/game/ai.ts†L1-L81】【F:src/game/combat.ts†L1-L49】
- **Script Vocabulary**: Only `SAY` and `ADD_ITEM` verbs are implemented; additional opcodes require manual extension.【F:src/engine/scriptProcessor.ts†L9-L26】
- **UI Bootstrap**: The current Ink entry point demonstrates initialization feedback but does not yet host gameplay loops or player input wiring.【F:src/main.tsx†L1-L48】
- **Resource Schema**: JSON structures are lightly validated; malformed files will throw during load and halt startup.【F:src/engine/resourceManager.ts†L15-L29】

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
|   - enemies.json        |
|   - items.json          |
|   - entities.json       |
+-------------------------+
```

### 2.1 Data Layer
- Maintains canonical definitions for enemies, items, and interactable entities, serialized as JSON.【F:README.md†L15-L18】【F:data/enemies.json†L1-L21】【F:data/items.json†L1-L13】【F:data/entities.json†L1-L13】
- The `ResourceManager` ingests this directory during boot, populating an in-memory cache keyed by filename sans extension.【F:src/engine/resourceManager.ts†L15-L24】

### 2.2 Logic Layer
- **State Orchestration**: `FiniteStateMachine` emits `gameStateChanged` events whenever the UI or scripts switch top-level modes, enabling the presentation layer or other systems to respond.【F:src/engine/fsm.ts†L1-L26】
- **Timeline Control**: `commit`, `createBranch`, `checkout`, and `getCurrentState` provide Git-inspired time travel over full `GameState` snapshots; branches map to the last commit they reference.【F:src/engine/narrativeEngine.ts†L7-L82】
- **Scripting Hooks**: `executeScript` iterates command tuples, performing engine mutations by emitting semantic events—allowing custom reactors without coupling the interpreter to specific subsystems.【F:src/engine/scriptProcessor.ts†L9-L26】
- **Global Messaging**: `eventBus` is the transport between logic and presentation; all runtime notifications (engine ready, dialogue, inventory updates) flow through it.【F:src/engine/events.ts†L1-L6】【F:src/main.tsx†L10-L38】
- **Game State Shape**: `GameState` defines the minimal world snapshot structure, enabling timeline commits and UI rendering to share a single contract.【F:src/engine/state.ts†L13-L22】

### 2.3 Presentation Layer
- `main.tsx` boots the engine by loading resources and reporting readiness or failure via Ink components subscribed to the event bus.【F:src/main.tsx†L1-L48】
- `MapView` consumes `GameState` props to visualize the tile grid and overlay the player location while highlighting status messages.【F:src/components/MapView.tsx†L9-L39】
- Input translation modules map keystrokes into `GameAction` events, keeping the UI reactive while insulating the logic from raw input details.【F:src/input/actions.ts†L1-L24】【F:src/input/keybindings.ts†L4-L38】

## 3. Developer Manual

### 3.1 Project Setup
1. Install dependencies: `npm install`.
2. Run the interactive build: `npm start` for development or `npm run build` followed by `node dist/main.js` for production binaries.【F:README.md†L43-L78】
3. Execute tests during refactors with `npm test` to exercise the TypeScript-aware Jest suite.【F:README.md†L59-L66】

### 3.2 Loading and Accessing Data
- Place domain JSON under `/data`. Each file becomes accessible via its basename, e.g. `maps.json` → `getResource('maps')`.
- Call `loadResources('./data')` during bootstrap (already done in `main.tsx`) to populate the cache. Any load failure is emitted as `engineError` on the bus for the UI to surface.【F:src/engine/resourceManager.ts†L15-L42】【F:src/main.tsx†L10-L38】
- Example: after initialization, retrieve the default map with `const maps = getResource<MapDictionary>('maps');` and hydrate your `GameState` before committing.

### 3.3 Managing Game State
- Instantiate a `GameState` object conforming to `state.ts` before entering the gameplay loop. Populate `player`, `map`, and `message` fields to keep the renderer synchronized.【F:src/engine/state.ts†L13-L22】【F:src/components/MapView.tsx†L9-L39】
- Use `commit(state)` whenever a meaningful narrative decision or checkpoint occurs. Store the returned commit ID if you need to branch later.【F:src/engine/narrativeEngine.ts†L22-L40】
- To explore alternates, call `createBranch('what-if', commitId)` followed by `checkout('what-if')`, then mutate `GameState` and `commit` again. `getCurrentState()` retrieves the head snapshot for the active branch, useful when resuming play after a checkout.【F:src/engine/narrativeEngine.ts†L43-L82】

### 3.4 Orchestrating Flow with the FSM
- Construct `new FiniteStateMachine('MainMenu')` at startup. Subscribe to `gameStateChanged` on the event bus to update UI layout or pause input when states change.【F:src/engine/fsm.ts†L3-L26】
- Call `fsm.transition('Dialogue')` when launching scripted conversations; the bus event enables components to swap views without directly coupling to the FSM instance.【F:src/engine/fsm.ts†L16-L24】

### 3.5 Scripting Narrative Moments
- Script files or inline definitions should provide arrays of tuples such as `['SAY', 'The woods are silent.']` or `['ADD_ITEM', 'flashlight']`.
- Pass the array into `executeScript`, then listen for `dialogue` or `inventoryUpdate` events to update UI panels or mutate inventory systems.【F:src/engine/scriptProcessor.ts†L9-L26】
- Extend the command vocabulary by adding new `case` blocks; ensure each branch communicates through the event bus or directly alters `GameState` as needed.

### 3.6 Integrating Input
- Bind key handlers (Ink `useInput`) to `resolveAction` so keystrokes emit `GameAction` values. Route those actions to your gameplay systems to move the player, trigger commits, or open menus.【F:src/input/keybindings.ts†L4-L38】【F:src/input/actions.ts†L6-L24】
- Expand `GameAction` whenever you introduce new verbs, and mirror them in `characterBindings` to provide keyboard access.

### 3.7 Rendering the World
- Compose the active `GameState` into UI components such as `MapView`. The component already overlays the player's position and message buffer; augment it with additional panels (inventory, timeline) by passing derived props or listening to event bus updates.【F:src/components/MapView.tsx†L9-L39】
- When changing maps, update `state.map` and re-render; consider storing multiple map definitions in `/data` to swap contexts quickly.【F:data/maps.json†L1-L13】

### 3.8 Extending the Engine
- **Persistence**: Wrap narrative commits in a serialization layer to persist `commitHistory` and `branches` between sessions.【F:src/engine/narrativeEngine.ts†L7-L82】
- **Validation**: Integrate JSON schema validation before caching resources to catch malformed data during development.【F:src/engine/resourceManager.ts†L15-L29】
- **Gameplay Systems**: Introduce collision detection or combat by enriching `GameState` with additional structures and wiring new events or FSM states to orchestrate transitions.【F:src/engine/state.ts†L7-L22】【F:src/engine/fsm.ts†L3-L26】
- **UI Enhancements**: Expand the Ink presentation with panels reacting to `dialogue`, `inventoryUpdate`, and custom events triggered by scripts and timeline operations.【F:src/main.tsx†L21-L37】【F:src/engine/scriptProcessor.ts†L13-L26】

## 4. Reference Startup Sequence
1. `main.tsx` mounts the Ink app and invokes `loadResources('./data')`.
2. Upon success, it emits `engineReady`; failures emit `engineError` for graceful degradation.【F:src/main.tsx†L10-L38】
3. Subscribers (e.g., UI components, dev tooling) listen on `eventBus` to react, then instantiate the FSM, load initial `GameState` from cached resources, render `MapView`, and start collecting input.
4. As gameplay progresses, systems call into the narrative engine to checkpoint, branch, and retrieve alternate timelines, maintaining the Git-like storytelling loop.【F:src/engine/narrativeEngine.ts†L22-L82】
