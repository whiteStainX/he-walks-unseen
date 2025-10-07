import { GameState } from './state.js';
import { customAlphabet } from 'nanoid';
import { eventBus } from './events.js';

const nanoid = customAlphabet('1234567890abcdef', 7);

export let commitHistory = new Map<string, GameState>();
export let branches = new Map<string, string>();
export let activeBranch: string = 'main';

function commit(state: GameState): string {
  const commitId = nanoid();
  commitHistory.set(commitId, state);
  branches.set(activeBranch, commitId);

  return commitId;
}

eventBus.on('stateChanged', (state: GameState) => {
  commit(state);
});

export function initializeEngine(initialState: GameState): void {
  const commitId = nanoid();
  commitHistory.clear();
  branches.clear();
  activeBranch = 'main';

  commitHistory.set(commitId, initialState);
  branches.set('main', commitId);
}

export function getCommit(commitId: string): GameState | undefined {
  return commitHistory.get(commitId);
}

export function createBranch(branchName: string, commitId: string): void {
  if (!commitHistory.has(commitId)) {
    throw new Error(`Commit with ID "${commitId}" does not exist.`);
  }
  branches.set(branchName, commitId);
}

export function checkout(branchName: string): void {
  if (!branches.has(branchName)) {
    throw new Error(`Branch with name "${branchName}" does not exist.`);
  }
  activeBranch = branchName;
}

export function getBranchHead(branchName: string): string | undefined {
  return branches.get(branchName);
}

export function getCurrentState(): GameState | undefined {
  const headCommitId = branches.get(activeBranch);
  if (!headCommitId) return undefined;
  return getCommit(headCommitId);
}