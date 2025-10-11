# Project Progress Log

This document tracks the major features and milestones completed during the development of "He Walks Unseen."

## Milestone 1: Core Roguelike Foundation (October 2025)

This milestone established the fundamental gameplay loop and mechanics that define the roguelike experience.

-   **Turn-Based System:** Implemented a formal, sequential turn system (`PlayerTurn` -> `EnemyTurn`).
-   **Permadeath & Restart:** Added a complete game over and restart cycle.
-   **Procedural Generation:**
    -   Map generation is now randomized for unique layouts each run.
    -   Enemy and item placements are randomized.
-   **Combat System:** A basic "bump-to-attack" combat system was implemented.
-   **Risk/Reward Mechanic:** Introduced unidentified potions with random positive or negative effects.

## Milestone 2: UI and Visual Polish (October 2025)

This milestone focused on improving the user interface and providing clearer visual feedback to the player.

-   **Color-Coded UI:**
    -   Actors (`@`), enemies (`g`), and items (`!`) are rendered with distinct colors.
    -   Game messages are colored based on context (e.g., red for damage, green for healing).
-   **Player Highlighting:** The player's current tile is highlighted with a background color for easy visibility.
-   **Enemy Status Panel:** A new UI panel was added to display the health of all visible enemies.
-   **Enhanced Combat Log:** Combat messages now include damage dealt and the remaining health of the target.

## Milestone 3: Core Gameplay Systems (October 2025)

This milestone introduced foundational gameplay systems that add depth and player agency.

-   **Items & Inventory System:**
    -   Implemented the ability to pick up items from the dungeon floor.
    -   Added a dedicated inventory screen for viewing and using items.
    -   The system is extensible for various item types, starting with healing potions.
-   **Skills & Progression System:**
    -   Players now gain experience points (XP) for defeating enemies.
    -   A leveling system was introduced, allowing players to increase their health and attack power.
    -   The UI was updated to display the player's current level and XP.

## Milestone 4: Foundational Systems Expansion (October 2025)

This milestone focused on building robust, scalable, and data-driven foundations for key gameplay systems, in line with the "Stage 2: Expanding the Systems" phase of development.

-   **Inventory Enhancements:**
    -   Grouped stackable items in the inventory view for a cleaner UI.
    -   Added a "drop item" action, allowing players to manage their inventory more effectively.
-   **Foundational Skill System:**
    -   Implemented the basic infrastructure for a skill system.
    -   Players can now acquire skills through leveling up, starting with a passive "Power Strike" skill.
-   **Flexible AI System:**
    -   Moved to a data-driven AI model using behavior flags (`canWander`, `canChase`).
    -   This allows for the easy creation of new enemy types with different behaviors.
-   **Environmental Interactions:**
    -   Introduced a unified `Entity` system to represent all objects in the game world.
    -   Implemented a component-based interaction system, starting with doors and chests.
    -   Added a `Targeting` mode for directional interactions.

## Milestone 5: Dungeon Progression and Variety (October 2025)

This milestone introduced a sense of progression and variety to the dungeon, moving the project into the "Stage 3: Content Generation" phase.

-   **Persistent Floor System:**
    -   Implemented a multi-level dungeon with a floor system.
    -   The state of each visited floor is cached, allowing for seamless transitions between levels.
-   **Dungeon Theming:**
    -   Created a data-driven theming system to define the visual style, enemies, and items for each floor.
    -   Introduced two new themes: "The Overgrown Keep" and "The Sunken Crypt".
-   **Bug Fixes:**
    -   Fixed a critical and intermittent bug where doors would not visually update correctly, ensuring a more stable and reliable player experience.

## Milestone 6: Combat System Overhaul (October 2025)

This milestone refactored the combat system to be more robust and strategic, moving beyond the initial "bump-to-attack" mechanic.

-   **Modular Combat Foundation:**
    -   Refactored the core combat logic into smaller, more modular functions (`calculateDamage`, `resolveAttack`).
    -   This makes the system more transparent, extensible, and easier to test.
    -   Greatly expanded the test suite to cover a wide range of combat scenarios.
-   **Strategic Combat Menu:**
    -   Replaced the "bump-to-attack" mechanic with a menu-driven system.
    -   When engaging an enemy, players are now presented with options ("Attack", "Cancel"), allowing for more deliberate tactical decisions.

## Milestone 7: Advanced Enemy AI (October 2025)

This milestone moved the enemy AI from a simple flag-based system to a more robust, state-based model, allowing for more complex and dynamic behaviors.

-   **State-Based AI:**
    -   Replaced simple boolean flags (`canWander`, `canChase`) with a state machine (`idle`, `wander`, `patrol`, `chase`, `flee`).
    -   This provides a flexible foundation for creating more intelligent and varied enemy behaviors.
-   **New AI Behaviors:**
    -   **Patrol:** Enemies can now be assigned predefined patrol routes, making their movements more predictable and strategic.
    -   **Flee:** Enemies can now be configured to flee from combat when their health drops below a certain threshold, adding a new layer of tactical depth.

## Milestone 8: Equipment System (October 2025)

This milestone introduced a foundational equipment system, a critical component of player progression and customization.

-   **Core Equipment Logic:**
    -   Players can now equip and unequip items (weapons and armor) into designated slots.
    -   Equipped items provide passive stat bonuses (e.g., attack, defense) that are applied in combat.
-   **UI Integration:**
    -   A new "Equipment" panel was added to the main game screen, providing players with a clear view of their equipped items and the bonuses they provide.
-   **Data-Driven Items:**
    -   The item data format was extended to support equippable properties, allowing for the easy creation of new equipment through JSON files.

## Milestone 9: Status Effects System (October 2025)

This milestone introduced a foundational status effects system, adding a new layer of tactical depth to combat encounters.

-   **Core Status Effects Logic:**
    -   A new system processes temporary conditions on actors each turn, such as poison.
    -   Effects apply damage and tick down their duration until they expire.
-   **Combat and Equipment Integration:**
    -   The equipment system was extended to support `onHit` effects, allowing weapons to apply status effects with a certain probability.
-   **UI Feedback:**
    -   A new "Active Effects" panel was added to the UI, clearly displaying all current status effects on the player and their remaining durations.
-   **Data-Driven Effects:**
    -   Status effects are defined in data files, allowing for easy creation of new items and enemies that can apply them.

## Milestone 10: Expanded Item & Magic System (October 2025)

This milestone significantly enhances the item system, moving it from a simple model to a flexible, data-driven foundation for a wide range of magical effects.

-   **Flexible Item Effects System:**
    -   Replaced the hardcoded `PotionEffect` with a versatile `effects` array on items.
    -   Each effect is a structured object, supporting various types (`heal`, `damage`, `fireball`, `revealMap`) and properties (e.g., `potency`, `radius`).
-   **Targeting Mechanic:**
    -   Implemented a new `Targeting` game phase for effects that require player input.
    -   This allows for the creation of targeted spells and abilities, such as area-of-effect attacks.
-   **New Item Types:**
    -   Added new item types, including a "Scroll of Fireball" and a "Scroll of Mapping," to demonstrate the system's new capabilities.
-   **Modular Effect Logic:**
    -   Centralized all effect-handling logic in a new `src/game/itemEffects.ts` module, improving code organization and making the system easier to extend.

## Milestone 11: Item Identification System (October 2025)

This milestone introduces a classic roguelike item identification system, adding a layer of mystery and risk vs. reward to the game.

-   **Identification Mechanic:** Magical items like potions and scrolls are now initially unidentified. Their true properties are unknown to the player.
-   **Identification by Use:** The first time an unidentified item is used, it becomes identified, and all other items of the same type in the player's inventory are also revealed.
-   **Scroll of Identify:** A new "Scroll of Identify" allows the player to choose a specific item from their inventory to identify, providing a more reliable method of discovery.
-   **UI Enhancements:** The inventory screen was updated with a dedicated `IdentifyMenu` phase to handle the identification process, and all relevant UI components now display the correct item name based on its identification status.

## Milestone 12: Game Logic Refactoring (October 2025)

This milestone focused on improving the codebase structure and maintainability.

-   **Decoupled Game Logic:** The monolithic `updateState.ts` file was broken down into smaller, more focused modules, each responsible for a specific piece of game logic (e.g., `playerActions.ts`, `inventoryActions.ts`).
-   **Improved Maintainability:** This refactoring makes the codebase easier to understand, test, and extend.

## Milestone 13: Persistent Save/Load System (October 2025)

This milestone introduced a persistent save/load system, allowing players to resume their progress between sessions.

-   **Modular Persistence Logic:** A new `persistence.ts` module was created to handle all file I/O and serialization, keeping the save/load logic decoupled from the core game engine.
-   **Automatic Saving:** The game state, including the entire narrative history, is automatically saved to disk after every action, ensuring no progress is lost.
-   **Seamless Loading:** The system automatically loads the saved game state on startup, allowing players to seamlessly continue their adventure.

## Milestone 14: Detailed Message Log (October 2025)

This milestone enhances the user interface by replacing the single-line message display with a comprehensive, scrollable message log.

-   **Message History:** The game now stores a history of all messages, allowing players to review past events.
-   **Scrollable Log View:** A new full-screen message log can be opened and scrolled through, providing a detailed view of combat results, item interactions, and other game events.
-   **UI Integration:** The log is accessible via a dedicated key ('l'), and the main game UI has been updated to show the most recent messages in the sidebar.

## Milestone 15: Prefab System (October 2025)

This milestone introduced a prefab system to streamline content creation and reduce data duplication.

-   **Prefab System:** Implemented a system for creating entity templates (prefabs) in `data/prefabs.json`.
-   **Instantiation:** Created an `instantiate` function to create new entities from prefabs.
-   **Integration:** Refactored the map generation logic to use the new prefab system.

## Milestone 16: Data-Driven World System (October 2025)

This milestone represents a major architectural shift, replacing the linear, floor-based dungeon progression with a flexible, data-driven world map system.

-   **World Map Architecture:** The concept of "floors" was replaced with a graph of interconnected "maps," defined in a new `data/world.json` file. This allows for the creation of complex, non-linear world layouts.
-   **Data Validation:** Integrated the `zod` library to add schema validation for all world-related data files, significantly improving the engine's robustness against data errors.
-   **Portal System:** The old "stairs" system was replaced with a generic "portal" entity, allowing for data-driven connections between any two points on any two maps.
-   **State Management:** The core `GameState` was refactored to support the new world system, including caching the state of visited maps to create a persistent world.
-   **Integration and Bug Fixes:** Ensured all existing systems, including map generation and entity placement, were integrated with the new world data. Fixed critical bugs related to engine startup and player movement after map transitions.

## Milestone 17: State Management Overhaul (October 2025)

This milestone represents a complete overhaul of the core state management system, moving to a more robust, predictable, and efficient architecture.

-   **Immutable State with Immer:** The entire state management system was refactored to use `immer`, ensuring that all state updates are handled immutably. This eliminates a whole class of potential bugs related to direct state mutation.
-   **Event-Driven Architecture:** A fully event-driven architecture was implemented for state changes. Game actions now trigger a centralized `updateState` function, which produces a new state and broadcasts it via a global event bus. This decouples the game logic from the narrative engine and other systems.
-   **Manual Save/Load Control:** The automatic save-on-every-action system was replaced with explicit player-controlled actions. Players can now start a new game (deleting the old save) or explicitly save and quit, giving them more control over their progress.

## Milestone 18: Engine Performance Optimization (October 2025)

This milestone focused on improving the engine's performance by optimizing critical code paths.

-   **Efficient Rendering:** The core `MapView` component was optimized by memoizing the display grid calculation. This prevents the expensive process of rebuilding the entire map view on every render, significantly improving UI responsiveness.
-   **Optimized AI Visibility:** Enemy AI was made more efficient by replacing expensive, per-enemy Field of View (FOV) calculations with a single, fast check against the player's pre-calculated `visibleTiles` set. This dramatically reduces CPU load on turns with many enemies.

## Milestone 19: Welcome Screen and UI Overhaul (October 2025)

This milestone introduced a formal welcome screen and refactored the main game UI to better align with classic roguelike conventions, improving the new player experience and overall visual hierarchy.

-   **Welcome Screen:** A new welcome screen is now the first thing the player sees, presenting clear options to "Start New Game" or "Load Game". This is managed by a new `Welcome` game phase.
-   **Classic UI Layout:** The main game screen was refactored into a vertical layout. The top section contains the map view and a contextual sidebar, while the bottom section is dedicated to a persistent player status bar and the scrollable message log.
-   **Future Work Placeholder:** The "Load Game" functionality is currently foundational. Full integration with the narrative engine's branching and state management capabilities is planned for a future milestone.