import React from 'react';
import { GameState } from '../engine/state.js';
import ProfileView from './ProfileView.js';

interface Props {
  gameState: GameState;
}

const PlayerExpressionManager: React.FC<Props> = ({ gameState }) => {
  const player = gameState.actors.find((a) => a.isPlayer);
  const visibleEnemies = gameState.actors.filter(
    (a) => !a.isPlayer && gameState.visibleTiles.has(`${a.position.x},${a.position.y}`)
  );
  const primaryEnemy = visibleEnemies.length > 0 ? visibleEnemies[0] : null;

  let currentExpressionId: string | undefined;

  // Determine expression based on game phase and other state
  if (gameState.phase === 'CombatMenu' || gameState.phase === 'Targeting') {
    // If in combat or targeting, show primary enemy's profile
    currentExpressionId = primaryEnemy?.profile;
  } else if (gameState.phase === 'Dialogue' && gameState.conversation) {
    // If in dialogue, show NPC's profile
    // This requires the NPC to have an actorId in the conversation state
    const npc = gameState.actors.find((a) => a.id === gameState.conversation?.actorId);
    currentExpressionId = npc?.profile;
  } else if (gameState.phase === 'Inventory') {
    currentExpressionId = 'player_inventory';
  } else if (gameState.phase === 'MessageLog') {
    currentExpressionId = 'player_log';
  } else if (player?.hp.current && player.hp.current < player.hp.max / 2) {
    // If player is hurt (less than half HP), show hurt expression
    currentExpressionId = 'player_hurt';
  } else {
    // Default to player idle
    currentExpressionId = 'player_idle';
  }

  return <ProfileView profileId={currentExpressionId} />;
};

export default PlayerExpressionManager;
