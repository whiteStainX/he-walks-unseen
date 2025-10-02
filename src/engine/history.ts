import type { GameState } from './state.js';

// A unique identifier for a commit (e.g., a hash or UUID).
export type CommitId = string;

// Stores all committed GameState snapshots. The key is a unique commit ID.
const commitHistory = new Map<CommitId, GameState>();

// Stores named branches. The key is the branch name, the value is the commit ID it points to.
const branches = new Map<string, CommitId>();

// A pointer to the currently active branch name.
let HEAD: string = 'main';

/**
 * Saves a snapshot of the current GameState.
 * In a real implementation, this would generate a unique ID and store the state.
 * @param state The current game state to commit.
 * @returns The ID of the new commit.
 */
export function commit(state: GameState): CommitId {
	const id = crypto.randomUUID();
	commitHistory.set(id, state);
	console.log(`Commit ${id} created.`);
	// In a real implementation, the current branch would be updated to point to this new commit.
	return id;
}

/**
 * Creates a new branch pointing to a specific commit.
 * @param name The name for the new branch.
 * @param commitId The commit ID the new branch should point to.
 */
export function branch(name: string, commitId: CommitId): void {
	if (commitHistory.has(commitId)) {
		branches.set(name, commitId);
		console.log(`Branch '${name}' created at commit ${commitId}.`);
	} else {
		throw new Error(`Commit with ID "${commitId}" not found.`);
	}
}

/**
 * Switches the active timeline to the head of a different branch.
 * @param name The name of the branch to check out.
 * @returns The GameState from the head of the checked-out branch.
 */
export function checkout(name: string): GameState {
	const commitId = branches.get(name);
	if (!commitId) {
		throw new Error(`Branch with name "${name}" not found.`);
	}

	const state = commitHistory.get(commitId);
	if (!state) {
		// This case should ideally not happen if data is consistent.
		throw new Error(
			`Data inconsistency: Branch '${name}' points to a non-existent commit ID "${commitId}".`
		);
	}

	HEAD = name;
	console.log(`Switched to branch '${name}'.`);
	return state;
}

// Initialize the default 'main' branch.
const initialCommitId = 'initial';
// Add a placeholder initial state to the history for the main branch to point to.
commitHistory.set(initialCommitId, {} as GameState); // Cast is for placeholder; would be a real state.
branches.set('main', initialCommitId);