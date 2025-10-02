# He Walks Unseen

A narrative RPG with a Git-like timeline mechanic.

## 1. Concept

In the dial-up haze of 2004, a socially invisible teenager at a high school summer camp gains the ability to navigate different timelines of their own life. They must use this power to solve a dark mystery that haunts the campgrounds by exploring "what could have been."

The core mechanic is a **"Git-like" narrative engine** that allows the player to `commit` snapshots of their progress, create `branch`es to explore alternate paths, and `checkout` different timelines to see how choices unfold.

## 2. Architecture

This project is built with a strict **3-layer decoupled architecture** to ensure a clean separation of concerns.

1.  **Data Layer (`/data`)**
    *   **Responsibility:** Holds static game data, like map layouts, in JSON format.
    *   **Implementation:** Plain JSON files.

2.  **Logic Layer (`/src/engine`)**
    *   **Responsibility:** Contains the complete, "headless" game logic. It manages the `GameState`, implements all game rules, and handles the narrative engine's branching system.
    *   **Constraint:** This layer is pure TypeScript and contains **no UI code**. It cannot import from `ink` or `react`.

3.  **Presentation Layer (`/src/components`, `main.tsx`)**
    *   **Responsibility:** Renders the UI using [Ink](https://github.com/vadimdemedes/ink) based on the `GameState` provided by the Logic Layer. It captures user input and translates it into abstract `GameAction`s.

This separation allows the game logic to be tested independently of the UI and makes the entire system more modular and maintainable.

## 3. How to Run

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

### Controls

*   **Arrow Keys** or **WASD**: Move the character (`@`).
*   **q** or **Ctrl+C**: Quit the game.

## 4. Building for Production

You can compile the TypeScript code into JavaScript using the build script:

```bash
npm run build
```

The output will be placed in the `/dist` directory. You can then run the compiled application with:

```bash
node dist/main.js
```