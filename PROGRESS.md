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