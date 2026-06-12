// ---------------------------------------------------------------------------
// Pong and Kong rules for Tianjin Mahjong (天津麻将)
// Task 5 — Query and execution functions for pong/kong actions.
// ---------------------------------------------------------------------------

import type { Tile, Player, MeldType } from './types';
import { tilesMatch } from './tile';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return a unique key for a tile's suit+rank combination.
 */
function tileKey(tile: Tile): string {
  return `${tile.suit}:${tile.rank}`;
}

/**
 * Count matching tiles in the hand for a given discard tile.
 * Counts tiles whose suit+rank match the discard (ignoring isHun).
 */
function countMatching(hand: Tile[], target: Tile): number {
  return hand.filter((t) => tilesMatch(t, target)).length;
}

/**
 * Group tiles in hand by suit+rank key.
 */
function groupBySuitRank(tiles: Tile[]): Map<string, Tile[]> {
  const groups = new Map<string, Tile[]>();
  for (const tile of tiles) {
    const key = tileKey(tile);
    const group = groups.get(key);
    if (group) {
      group.push(tile);
    } else {
      groups.set(key, [tile]);
    }
  }
  return groups;
}

/**
 * Remove the first tile from an array that matches the predicate.
 * Returns the removed tile or undefined. Mutates the array in place.
 */
function removeFirst(tiles: Tile[], predicate: (t: Tile) => boolean): Tile | undefined {
  const idx = tiles.findIndex(predicate);
  if (idx === -1) return undefined;
  return tiles.splice(idx, 1)[0];
}

/**
 * Deep-clone a tile (so the discard tile doesn't share identity with meld tiles).
 */
function cloneTile(tile: Tile): Tile {
  return { ...tile };
}

// ---------------------------------------------------------------------------
// Query functions (pure — do not mutate)
// ---------------------------------------------------------------------------

/**
 * Check if a player can pong a discarded tile.
 * The player must have at least 2 tiles in hand matching the discard suit+rank.
 */
export function canPong(player: Player, discardTile: Tile): boolean {
  return countMatching(player.hand, discardTile) >= 2;
}

/**
 * Check if a player can ming-kong a discarded tile.
 * The player must have at least 3 tiles in hand matching the discard suit+rank.
 */
export function canMingKong(player: Player, discardTile: Tile): boolean {
  return countMatching(player.hand, discardTile) >= 3;
}

/**
 * Find any 4-of-a-kind in the player's hand for an-kong.
 * Returns the 4 matching tiles if found, or an empty array.
 */
export function canAnKong(player: Player): Tile[] {
  const groups = groupBySuitRank(player.hand);
  for (const [, tiles] of groups) {
    if (tiles.length >= 4) {
      return tiles.slice(0, 4);
    }
  }
  return [];
}

/**
 * Check if a player can promote a pong meld to a bu-kong.
 * Returns the pong meld index and matching tile from hand, or null.
 */
export function canBuKong(player: Player): { pongMeldIndex: number; tile: Tile } | null {
  for (const [meldIndex, meld] of player.melds.entries()) {
    if (meld.type !== 'pong') continue;
    // The pong's tile type is determined by its first tile
    const meldType = meld.tiles[0];
    const matchingTile = player.hand.find((t) => tilesMatch(t, meldType));
    if (matchingTile) {
      return { pongMeldIndex: meldIndex, tile: matchingTile };
    }
  }
  return null;
}

/**
 * Check if a player has 4 hun tiles in hand for jin-kong (金杠).
 * Returns the 4 hun tiles if available, or an empty array.
 */
export function canJinKong(player: Player): Tile[] {
  const hunInHand = player.hand.filter((t) => t.isHun);
  if (hunInHand.length >= 4) {
    return hunInHand.slice(0, 4);
  }
  return [];
}

/**
 * Get tiles that can be legally discarded.
 * Excludes all tiles with isHun=true (混儿 cannot be discarded).
 */
export function getLegalDiscards(player: Player): Tile[] {
  return player.hand.filter((t) => !t.isHun);
}

// ---------------------------------------------------------------------------
// Perform functions (mutate player in place)
// ---------------------------------------------------------------------------

/**
 * Execute a pong: remove 2 matching tiles from hand, create a pong meld
 * with 3 tiles (2 from hand + the discard). Mutates the player in place.
 */
export function performPong(player: Player, discardTile: Tile): void {
  // Remove 2 matching tiles from hand
  const removed: Tile[] = [];
  for (let i = 0; i < 2; i++) {
    const tile = removeFirst(player.hand, (t) => tilesMatch(t, discardTile));
    if (tile) removed.push(tile);
  }

  // Create pong meld: 2 from hand + the discard tile (cloned)
  player.melds.push({
    type: 'pong',
    tiles: [...removed, cloneTile(discardTile)],
  });
}

/**
 * Execute a ming-kong: remove 3 matching tiles from hand, create a ming-kong
 * meld with 4 tiles (3 from hand + the discard). Mutates the player in place.
 */
export function performMingKong(player: Player, discardTile: Tile): void {
  // Remove 3 matching tiles from hand
  const removed: Tile[] = [];
  for (let i = 0; i < 3; i++) {
    const tile = removeFirst(player.hand, (t) => tilesMatch(t, discardTile));
    if (tile) removed.push(tile);
  }

  // Create ming-kong meld: 3 from hand + the discard tile (cloned)
  player.melds.push({
    type: 'ming-kong',
    tiles: [...removed, cloneTile(discardTile)],
  });
}

/**
 * Execute an an-kong: remove the given 4 tiles from hand, create an an-kong
 * meld. Mutates the player in place.
 */
export function performAnKong(player: Player, tiles: Tile[]): void {
  // Remove each of the 4 tiles from hand (by identity match — exact Tile objects)
  const removed: Tile[] = [];
  for (const targetTile of tiles) {
    const tile = removeFirst(player.hand, (t) => t.id === targetTile.id);
    if (tile) removed.push(tile);
  }

  player.melds.push({
    type: 'an-kong',
    tiles: removed,
  });
}

/**
 * Execute a bu-kong: remove the matching tile from hand, add it to the pong
 * meld, and change the meld type to 'bu-kong'. Mutates the player in place.
 */
export function performBuKong(player: Player, meldIndex: number, tile: Tile): void {
  // Remove the tile from hand
  const removed = removeFirst(player.hand, (t) => t.id === tile.id);

  if (removed) {
    // Add to the existing pong meld and change type
    const meld = player.melds[meldIndex];
    meld.tiles.push(removed);
    meld.type = 'bu-kong';
  }
}
