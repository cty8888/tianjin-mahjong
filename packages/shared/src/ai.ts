// ---------------------------------------------------------------------------
// AI Decision Engine (v1 Random) for Tianjin Mahjong (天津麻将)
// Task 8 — Simple random decisions for non-human players.
// ---------------------------------------------------------------------------

import type { Player, Tile, ActionType } from './types';
import { getLegalDiscards, canPong, canMingKong } from './rules';

// ---------------------------------------------------------------------------
// aiDecideDiscard
// ---------------------------------------------------------------------------

/**
 * Choose which tile to discard from the player's hand.
 *
 * Picks a random tile from among the legal discards (non-hun tiles).
 * Returns the index into the player's hand array.
 *
 * v1: purely random selection among legal tiles.
 */
export function aiDecideDiscard(player: Player): number {
  const legalDiscards = getLegalDiscards(player);

  // Edge case: no legal discards (all tiles are hun). We still must return
  // a valid index to avoid crashing the game loop. Fall back to any tile.
  if (legalDiscards.length === 0) {
    return 0;
  }

  // Pick a random legal discard tile
  const randomLegal = legalDiscards[Math.floor(Math.random() * legalDiscards.length)];

  // Find its index in the player's hand
  const index = player.hand.findIndex(
    (t) => t.suit === randomLegal.suit && t.rank === randomLegal.rank && t.isHun === randomLegal.isHun,
  );

  return index >= 0 ? index : 0;
}

// ---------------------------------------------------------------------------
// aiDecideResponse
// ---------------------------------------------------------------------------

/**
 * Decide whether to pong or ming-kong in response to another player's discard.
 *
 * v1: randomly chooses among available options with ~50% chance of responding
 * to each possible action. If both pong and kong are possible, each gets a
 * ~50% independent chance (both could be rejected → null).
 *
 * @returns 'pong', 'ming-kong', or null (pass).
 */
export function aiDecideResponse(player: Player, discardTile: Tile): ActionType | null {
  const canP = canPong(player, discardTile);
  const canK = canMingKong(player, discardTile);

  if (!canP && !canK) {
    return null;
  }

  // Build the list of available options
  const options: (ActionType | null)[] = [null]; // always can pass

  // v1: 50% chance for each available action
  if (canP && Math.random() < 0.5) {
    options.push('pong');
  }
  if (canK && Math.random() < 0.5) {
    options.push('ming-kong');
  }

  // Pick randomly from the constructed options
  const chosen = options[Math.floor(Math.random() * options.length)];

  return chosen;
}
