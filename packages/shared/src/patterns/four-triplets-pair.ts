import type { Tile, PatternChecker, PatternResult } from '../types';

/**
 * Checks whether a hand forms "四刻一对" (Four Triplets + One Pair).
 *
 * The hand must have exactly 14 tiles.
 * Tiles are grouped by suit + rank.
 * There must be exactly 4 groups of size >= 3 (triplets, including quads)
 * and exactly 1 group of size == 2 (the pair).
 * A group of 4 identical tiles counts as one triplet.
 */
export const fourTripletsPairChecker: PatternChecker = {
  name: '四刻一对',

  check(hand: Tile[], _context: { hunTiles: Tile[] }): PatternResult | null {
    // Must be exactly 14 tiles (v1: no hun-儿 wildcard substitution yet).
    if (hand.length !== 14) {
      return null;
    }

    // Group tiles by suit + rank.
    const groups = new Map<string, number>();
    for (const tile of hand) {
      const key = `${tile.suit}:${tile.rank}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }

    let tripletCount = 0;
    let pairCount = 0;

    for (const count of groups.values()) {
      if (count === 2) {
        pairCount++;
      } else if (count >= 3 && count <= 4) {
        // 3 identical tiles = one triplet; 4 identical tiles = one triplet (potential kong).
        tripletCount++;
      } else {
        // A single tile cannot be part of a triplet or pair in this pattern.
        return null;
      }
    }

    if (tripletCount === 4 && pairCount === 1) {
      return {
        patternName: '四刻一对',
        description: '四刻一对（碰碰胡）',
      };
    }

    return null;
  },
};
