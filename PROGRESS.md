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