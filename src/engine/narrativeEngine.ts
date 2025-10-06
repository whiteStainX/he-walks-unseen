import { GameState } from './state.js';
import { customAlphabet } from 'nanoid';
import { saveGame } from './persistence.js';

// Using a custom alphabet for shorter, URL-friendly IDs
const nanoid = customAlphabet('1234567890abcdef', 7);

/**
 * Stores snapshots of the game state, keyed by a unique commit ID.
 */
export let commitHistory = new Map<string, GameState>();

/**
 * Stores named pointers (branches) to specific commit IDs.
 */
export let branches = new Map<string, string>();

/**
 * The currently active branch.
 */
export let activeBranch: string = 'main';

/**
 * Overwrites the entire narrative engine state. Used for loading saved games.
 * @param history The commit history to load.
 * @param branchMap The branch map to load.
 * @param currentBranch The active branch to set.
 */
export function initializeEngine(
  history: Map<string, GameState>,
  branchMap: Map<string, string>,
  currentBranch: string
): void {
  commitHistory = history;
  branches = branchMap;
  activeBranch = currentBranch;
}

/**
 * Saves a snapshot of the current game state to the history.
 * @param state The game state to save.
 * @returns The unique ID for this commit.
 */
export function commit(state: GameState): string {
  const commitId = nanoid();
  commitHistory.set(commitId, JSON.parse(JSON.stringify(state))); // Deep copy
  branches.set(activeBranch, commitId); // Update the active branch head

  // Fire-and-forget save operation
  saveGame().catch(err => {
    // In a real app, this should be logged to a more robust system
    console.error('Failed to save game state:', err);
  });

  return commitId;
}

/**
 * Retrieves a game state snapshot from history.
 * @param commitId The ID of the commit to retrieve.
 * @returns The stored game state, or undefined if not found.
 */
export function getCommit(commitId: string): GameState | undefined {
  return commitHistory.get(commitId);
}

/**
 * Creates a new branch pointing to a specific commit ID.
 * @param branchName The name for the new branch.
 * @param commitId The commit ID the new branch should point to.
 */
export function createBranch(branchName: string, commitId: string): void {
  if (!commitHistory.has(commitId)) {
    throw new Error(`Commit with ID "${commitId}" does not exist.`);
  }
  branches.set(branchName, commitId);
}

/**
 * Switches the active branch.
 * @param branchName The name of the branch to switch to.
 */
export function checkout(branchName: string): void {
  if (!branches.has(branchName)) {
    throw new Error(`Branch with name "${branchName}" does not exist.`);
  }
  activeBranch = branchName;
}

/**
 * Gets the commit ID that the specified branch points to.
 * @param branchName The name of the branch.
 * @returns The commit ID, or undefined if the branch doesn't exist.
 */
export function getBranchHead(branchName: string): string | undefined {
  return branches.get(branchName);
}

/**
 * Gets the state at the head of the current active branch.
 */
export function getCurrentState(): GameState | undefined {
    const headCommitId = branches.get(activeBranch);
    if (!headCommitId) return undefined;
    return getCommit(headCommitId);
}