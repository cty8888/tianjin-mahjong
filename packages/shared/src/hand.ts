// ---------------------------------------------------------------------------
// Hand evaluation for Tianjin Mahjong (天津麻将)
// Checks if a player can win (自摸) and detects 听牌 (one tile away).
// ---------------------------------------------------------------------------

import type { Tile, PatternResult } from './types';
import type { PatternRegistry } from './patterns/registry';
import { createTiles } from './tile';

// ---------------------------------------------------------------------------
// checkWin
// ---------------------------------------------------------------------------

/**
 * Check if a 14-tile hand is a winning hand.
 * Iterates through all registered pattern checkers and returns the first
 * matching PatternResult, or null if no pattern matches.
 */
export function checkWin(
  hand: Tile[],
  hunTiles: Tile[],
  registry: PatternRegistry,
): PatternResult | null {
  if (hand.length !== 14) {
    return null;
  }

  const context = { hunTiles };

  for (const checker of registry.list()) {
    const result = checker.check(hand, context);
    if (result !== null) {
      return result;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// isTing
// ---------------------------------------------------------------------------

/**
 * Check if a 13-tile hand is one tile away from winning (听牌).
 * Tries adding every possible tile type (34 distinct types) to form a
 * 14-tile hand and checks if any of those combinations is a win.
 *
 * Brute-force approach: 34 tile types is fast enough for v1.
 * Hun wildcard logic is not yet implemented (v2).
 */
export function isTing(
  hand: Tile[],
  hunTiles: Tile[],
  registry: PatternRegistry,
): boolean {
  if (hand.length !== 13) {
    return false;
  }

  // Build a set of 34 unique tile types (one representative per suit+rank).
  const allTiles = createTiles();
  const tileTypes: { suit: Tile['suit']; rank: number }[] = [];
  const seen = new Set<string>();

  for (const tile of allTiles) {
    const key = `${tile.suit}:${tile.rank}`;
    if (!seen.has(key)) {
      seen.add(key);
      tileTypes.push({ suit: tile.suit, rank: tile.rank });
    }
  }

  const context = { hunTiles };

  // Try adding each tile type and checking for a win.
  for (const tileType of tileTypes) {
    const candidate: Tile = {
      suit: tileType.suit,
      rank: tileType.rank,
      id: -1,
      isHun: false,
    };
    const trialHand = [...hand, candidate];

    for (const checker of registry.list()) {
      if (checker.check(trialHand, context) !== null) {
        return true;
      }
    }
  }

  return false;
}
