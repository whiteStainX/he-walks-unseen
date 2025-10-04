# Bug Log

This document tracks interesting bugs encountered during the development of "He Walks Unseen".

## The Intermittent Door Bug

-   **Date:** October 2025
-   **Status:** Resolved

### Symptoms

When interacting with a door, the door's character would sometimes fail to change from `+` (closed) to `-` (open), even though the game logic registered the door as open. This bug was intermittent and difficult to reproduce consistently.

### Diagnosis

My initial hypothesis was that the issue was a simple state mutation problem. I attempted to fix it by ensuring that the `entities` array and the `map` object were being replaced with new instances on every interaction. However, this did not resolve the issue.

The root cause of the bug was more subtle. It was a combination of a state mutation issue and a rendering issue in the `MapView` component. The `displayGrid` was being constructed directly inside the component, which meant it was being recalculated on every render. This was inefficient and led to subtle rendering bugs.

### Solution

I resolved the bug by taking a more rigorous, test-driven approach:

1.  **Unit Test:** I created a dedicated unit test for the `handleInteraction` function to isolate the game logic from the rendering logic.
2.  **Isolate the Bug:** The unit test passed, which proved that the bug was not in the game logic, but in the `MapView` component.
3.  **Refactor `MapView`:** I refactored the `MapView` component to use a more functional and immutable approach. I created a helper function that takes the game state and returns a new `displayGrid` on every render. This ensures that the `displayGrid` is always in sync with the game state.

This experience highlighted the importance of a rigorous, test-driven approach to debugging. It also reinforced the importance of using immutable state updates in a React-like environment.
