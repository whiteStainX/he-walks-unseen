# Bug Log

This document tracks interesting bugs encountered during the development of "He Walks Unseen".

## Flawed Deep Copy in Narrative Engine

-   **Date:** October 2025
-   **Status:** Fixed

### Symptoms

The `commit` function in `src/engine/narrativeEngine.ts` used `JSON.parse(JSON.stringify(state))` to create a deep copy of the game state for the history map. The `GameState` interface contains `Set` and `Map` objects (`visibleTiles`, `exploredTiles`, `floorStates`). Standard `JSON.stringify` does not correctly serialize these data structures (e.g., a `Set` becomes an empty object `{}`). As a result, every time a state was committed, these crucial properties were corrupted in the historical record. This broke the narrative engine's ability to correctly store and restore past game states.

### Fix

The `persistence.ts` module already contained the correct logic for serializing and deserializing `Map` and `Set` objects using a custom `replacer` and `reviver`. The fix involved:
1. Exporting the `replacer` and `reviver` functions from `src/engine/persistence.ts`.
2. Importing them into `src/engine/narrativeEngine.ts`.
3. Modifying the `commit` function in `src/engine/narrativeEngine.ts` to use `JSON.parse(JSON.stringify(state, replacer), reviver)` for a robust deep copy.

This ensures that all data structures are correctly preserved in the narrative engine's history.

## The Intermittent Door Bug

-   **Date:** October 2025
-   **Status:** Open

### Symptoms

When interacting with a door, the door's character would sometimes fail to change from `+` (closed) to `-` (open), even though the game logic registered the door as open. This bug is intermittent and seems to be triggered when data files are modified, even after a full rebuild.

### History

My initial hypothesis was that the issue was a simple state mutation problem related to hot-reloading in the development environment. This was proven incorrect as the bug persists in production builds.

The next hypothesis was a subtle state mutation issue in the game logic. I refactored the `MapView` component to use a more functional and immutable approach, and created a unit test to isolate the game logic from the rendering logic. While the unit test passes, the bug still appears in the running application.

### Current Status

The root cause of this bug is still under investigation. It is likely a subtle state management issue that is not being caught by the current test suite. Further investigation is required.

## Main Menu Options Not Implemented

-   **Date:** October 2025
-   **Status:** Future Work

### Symptoms

The game does not present the player with a clear choice to start a new game or continue from a save. The game automatically loads a save if one exists. To start a new game, the player must know to press the 'n' key, which is not discoverable through the UI.

### Plan

A main menu screen should be implemented that appears on startup. This menu will present the player with clear options:

- **Continue:** If a save file exists, this option will be available to load the saved game.
- **New Game:** This option will start a fresh game, deleting any existing save file.
- **Quit:** This option will exit the application.

This will be implemented in a future milestone.