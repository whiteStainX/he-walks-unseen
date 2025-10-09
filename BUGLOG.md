# Bug Log

This document tracks interesting bugs encountered during the development of "He Walks Unseen".

## Inconsistent Portal Destinations

-   **Date:** October 2025
-   **Status:** Fixed

### Symptoms

Portals that should have stable, bidirectional destinations (e.g., a portal from Map A to Map B should always lead to Map B, and the corresponding portal in Map B should always lead back to Map A) would behave inconsistently. After a first successful trip (A -> B -> A), a second attempt to use the portal in Map A would incorrectly lead to a different map (e.g., Map C) or fail.

### Root Cause

The issue was a subtle state management bug in `src/game/interaction.ts`. When a player entered a map that had been previously visited, the game would load that map's state from the `mapStates` cache. However, the loaded `GameState` object contained its own `mapStates` property, which was a snapshot from an earlier point in time. The `Object.assign(state, newState)` operation would overwrite the *current, master* `mapStates` with this older, incomplete version from the cache. This effectively erased the history of any maps visited after the cached state was saved, leading to the inconsistent portal behavior.

### Fix

The fix was to ensure the master `mapStates` object is never overwritten by a cached version. This was achieved by:
1. In `src/game/interaction.ts`, before replacing the current state with the newly loaded state, the reference to the current `mapStates` object is preserved.
2. After the new state is loaded (either from the cache or by new creation), the preserved `mapStates` object is assigned to the `newState.mapStates` property.
3. This ensures that the single, authoritative `mapStates` cache is carried forward through all map transitions, maintaining a consistent history of all visited maps.

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

## Player Interaction with Adjacent NPCs Fails

-   **Date:** October 2025
-   **Status:** Open

### Symptoms

When a player stands adjacent to an interactable entity (e.g., an NPC) and presses the interaction key ('e'), followed by a directional input towards the entity, the interaction fails to trigger. The game appears to hang because the player's turn does not resolve, and no conversation or other interaction is initiated.

### Root Cause Analysis

The initial investigation pointed to a race condition in the game's state management. The interaction is initiated in the `Targeting` phase, which is handled by `src/game/targetingActions.ts`. This function would end the player's turn by setting the game phase to `EnemyTurn` before the asynchronous `start-conversation` event (handled in `src/main.tsx`) had a chance to switch the game to the `Dialogue` phase. This left the player stuck in a non-interactive state.

### Fix Attempt

A fix was implemented to resolve this race condition.
1.  The `handleInteraction` function in `src/game/interaction.ts` was refactored to return a boolean value. It returns `true` if the interaction it triggers is one that will take control of the game phase (like a conversation) and `false` otherwise.
2.  The `handleTargeting` function was updated to check this boolean return value. It now only sets the phase to `EnemyTurn` if the `handleInteraction` function returns `false`, theoretically preventing the race condition.

### Current Status

Despite the implemented fix, the bug persists. The player is still unable to correctly interact with the adjacent NPC, and the game hangs in the `Targeting` phase. The root cause is not fully understood and requires a deeper investigation into the state transition logic between the `Targeting`, `Dialogue`, and `EnemyTurn` phases.