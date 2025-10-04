# Bug Log

This document tracks interesting bugs encountered during the development of "He Walks Unseen".

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