# He Walks Unseen

A narrative RPG with a Git-like timeline mechanic.

## 1. Concept

In the dial-up haze of 2004, a socially invisible teenager at a high school summer camp gains the ability to navigate different timelines of their own life. They must use this power to solve a dark mystery that haunts the campgrounds by exploring "what could have been."

The core mechanic is a **"Git-like" narrative engine** that allows the player to `commit` snapshots of their progress, create `branch`es to explore alternate paths, and `checkout` different timelines to see how choices unfold.

## 2. Features

This project implements several classic roguelike mechanics to create a challenging and replayable experience.

*   **Turn-Based System:** The game operates on a strict "I-Go-You-Go" turn-based system. The world only advances when the player takes an action, allowing for careful, strategic thinking.
*   **Permadeath & Replayability:** When the player is defeated, the game is over. Each new game generates a unique, procedurally-generated world with randomized room layouts and enemy placements, ensuring no two runs are the same.
*   **Risk vs. Reward:** The world contains unidentified potions and scrolls. Their effects are unknown until they are used or identified, forcing players to weigh the potential benefits against the risks.
*   **Item Identification:** A classic roguelike feature where magical items like potions and scrolls are initially unidentified. Discover their true properties through use or by finding a special "Scroll of Identify."
*   **Enhanced UI Feedback:**
    *   **Color-Coded UI:** Actors, items, and messages are color-coded for at-a-glance clarity. Damage is red, healing is green, and important events are yellow.
    *   **Player Highlighting:** The player's character is always highlighted on the map, making it easy to track your position.
    *   **Enemy Status Panel:** A dedicated panel displays the health of all visible enemies, aiding in tactical decision-making.
    *   **Detailed Message Log:** A scrollable message log allows you to review the history of combat, interactions, and other events.
*   **Items & Inventory:** Pick up items from the world and manage them in a dedicated inventory screen. Use items like potions for healing, or powerful scrolls to cast area-of-effect spells and reveal the map.
*   **Skills & Progression:** Gain experience points by defeating enemies. Level up to increase your health and attack power, making you stronger as you explore the world.
*   **Environmental Interactions:** The world is not just a static backdrop. Interact with doors to open them and loot chests to find valuable items.
*   **Data-Driven World Map:** Explore a world composed of multiple interconnected maps. The entire structure of the world, from map layouts to the connections between them, is defined in data files, allowing for complex and interesting environments.
*   **Map Themes:** Each map has a unique theme with different enemies, items, and visuals.
*   **Field of View / Fog of War:** The player's view is limited to what their character can see. Explored areas are remembered and displayed in a dimmed "fog of war."
*   **Advanced Enemy AI:** Enemies are driven by a state-based AI system, allowing for complex behaviors. They can intelligently chase the player, patrol predefined routes, and even flee from combat when low on health.
*   **Equipment System:** Find and equip weapons and armor to boost your stats. Equipped items provide passive bonuses to your attack and defense, which are automatically factored into combat.
*   **Status Effects:** Some weapons can inflict debilitating status effects like poison on your enemies. These effects are displayed on the UI and tick down each turn.
*   **Prefab System:** A data-driven prefab system allows for the easy creation and management of entity templates.
*   **Persistent Save/Load:** Your game progress is automatically saved after every action and loaded when you restart, allowing you to continue your adventure seamlessly.

## 3. Controls

| Key(s)          | Action                |
| --------------- | --------------------- |
| `w`, `a`, `s`, `d` / `↑`, `←`, `↓`, `→` | Move Player           |
| `g`             | Pick up Item          |
| `i`             | Open/Close Inventory  |
| `l`             | Open/Close Message Log|
| `e`             | Interact with objects |
| `q`             | Quit Game             |

### Inventory Mode
| Key(s)          | Action                |
| --------------- | --------------------- |
| `w` / `↑`         | Select Previous Item  |
| `s` / `↓`         | Select Next Item      |
| `d`             | Drop Selected Item    |
| `e`             | Equip Selected Item   |
| `Enter`         | Use Selected Item     |
| `Escape` / `i`  | Close Inventory       |

### Combat Menu Mode
| Key(s)          | Action                |
| --------------- | --------------------- |
| `w` / `↑`         | Select Previous Option|
| `s` / `↓`         | Select Next Option    |
| `Enter`         | Confirm Action        |
| `Escape`        | Cancel Combat         |

### Targeting Mode
| Key(s)          | Action                |
| --------------- | --------------------- |
| `w`, `a`, `s`, `d` / `↑`, `←`, `↓`, `→` | Select Target Direction |
| `Escape`        | Cancel Targeting      |

### Identify Menu Mode
| Key(s)          | Action                |
| --------------- | --------------------- |
| `w` / `↑`         | Select Previous Item  |
| `s` / `↓`         | Select Next Item      |
| `Enter`         | Confirm Selection     |
| `Escape`        | Cancel Identification |

### Message Log Mode
| Key(s)          | Action                |
| --------------- | --------------------- |
| `w` / `↑`         | Scroll Log Up         |
| `s` / `↓`         | Scroll Log Down       |
| `l` / `Escape`  | Close Message Log     |


## 4. Architecture

This project is built with a strict **3-layer decoupled architecture** to ensure a clean separation of concerns.

1.  **Data Layer (`/data`)**
    *   **Responsibility:** Holds static game data, like the world structure (`world.json`), items, and dialogue, in JSON format.
    *   **Implementation:** Plain JSON files. Loaded on startup by the `ResourceManager`.

2.  **Logic Layer (`/src/engine`)**
    *   **Responsibility:** Contains the complete, "headless" game logic. It manages the `GameState`, implements all game rules, and handles the narrative engine's branching system.
    *   **Constraint:** This layer is pure TypeScript and contains **no UI code**. It cannot import from `ink` or `react`.
    *   **Core Modules:**
        *   **Event Bus (`events.ts`):** A global `EventEmitter` for decoupled communication between engine systems.
        *   **Resource Manager (`resourceManager.ts`):** Loads and caches all game data from the `/data` directory at startup.
        *   **World Manager (`worldManager.ts`):** Loads and validates the world map structure from `data/world.json`.
        *   **Finite State Machine (`fsm.ts`):** Manages high-level game states (e.g., `MainMenu`, `Playing`, `Dialogue`).
        *   **Narrative Engine (`narrativeEngine.ts`):** Implements the Git-like history system for saving state (`commit`), creating alternate timelines (`branch`), and switching between them (`checkout`).
        *   **Script Processor (`scriptProcessor.ts`):** Executes simple, command-based scripts for in-game events (e.g., dialogue, cutscenes).

3.  **Presentation Layer (`/src/components`, `main.tsx`)**
    *   **Responsibility:** Renders the UI using [Ink](https://github.com/vadimdemedes/ink) based on the `GameState` provided by the Logic Layer. It captures user input and translates it into abstract `GameAction`s.

This separation allows the game logic to be tested independently of the UI and makes the entire system more modular and maintainable.

## 5. How to Run

### Prerequisites

*   Node.js (v18 or higher)
*   npm (or your preferred package manager)

### Installation

1.  Clone the repository.
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Game

To start the application in development mode, run:

```bash
npm start
```

This will use `tsx` to compile and run the TypeScript source files directly.

### Running Tests

This project uses Jest for testing. To run the test suite:

```bash
npm test
```

## 6. Building for Production

```bash
npm run build
```

The output will be placed in the `/dist` directory. You can then run the compiled application with:

```bash
node dist/main.js
```

## 7. Known Issues

-   **Intermittent Door Bug:** There is a known intermittent bug where doors do not visually update correctly. This issue is being tracked in the `BUGLOG.md` file.