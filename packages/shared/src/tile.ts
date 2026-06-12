// ---------------------------------------------------------------------------
// Tile system for Tianjin Mahjong (天津麻将)
// Creates, identifies, and sequences all 136 mahjong tiles.
// ---------------------------------------------------------------------------

import type { Tile, Suit } from './types';

// ---------------------------------------------------------------------------
// Name mappings
// ---------------------------------------------------------------------------

const NUM_NAMES = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
const SUIT_NAMES: Record<Suit, string> = {
  wan: '万',
  tiao: '条',
  tong: '筒',
  feng: '',
  jian: '',
};
const FENG_NAMES: Record<number, string> = { 1: '东', 2: '南', 3: '西', 4: '北' };
const JIAN_NAMES: Record<number, string> = { 1: '中', 2: '发', 3: '白' };

// ---------------------------------------------------------------------------
// Tile type definitions
// ---------------------------------------------------------------------------

/** Max rank (sequence length) for each suit. */
const MAX_RANK: Record<Suit, number> = {
  wan: 9,
  tiao: 9,
  tong: 9,
  feng: 4,
  jian: 3,
};

/** Suit + max rank pairs for iteration in tile creation order. */
const SUIT_RANKS: { suit: Suit; maxRank: number }[] = (Object.keys(MAX_RANK) as Suit[]).map(
  (suit) => ({ suit, maxRank: MAX_RANK[suit] }),
);

// ---------------------------------------------------------------------------
// createTiles
// ---------------------------------------------------------------------------

/**
 * Create all 136 mahjong tiles with unique IDs 0-135.
 * 34 distinct tile types (suit+rank), 4 copies each = 136 tiles.
 * Tiles are ordered by suit then rank then copy.
 */
export function createTiles(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  for (const { suit, maxRank } of SUIT_RANKS) {
    for (let rank = 1; rank <= maxRank; rank++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ suit, rank, id, isHun: false });
        id++;
      }
    }
  }

  return tiles;
}

// ---------------------------------------------------------------------------
// getTileName
// ---------------------------------------------------------------------------

/**
 * Return the Chinese name of a tile.
 * Examples: "五万", "东", "中", "一筒"
 */
export function getTileName(tile: Tile): string {
  switch (tile.suit) {
    case 'wan':
    case 'tiao':
    case 'tong':
      return `${NUM_NAMES[tile.rank - 1]}${SUIT_NAMES[tile.suit]}`;
    case 'feng':
      return FENG_NAMES[tile.rank];
    case 'jian':
      return JIAN_NAMES[tile.rank];
  }
}

// ---------------------------------------------------------------------------
// getNextTileInSequence
// ---------------------------------------------------------------------------

/**
 * Return the next tile in the cyclic sequence for 混儿 calculation.
 * Each suit cycles independently:
 *   - 万/条/筒: 1→2→...→9→1
 *   - 风: 东(1)→南(2)→西(3)→北(4)→东(1)
 *   - 箭: 中(1)→发(2)→白(3)→中(1)
 */
export function getNextTileInSequence(tile: Tile): { suit: Suit; rank: number } {
  const maxRank = MAX_RANK[tile.suit];
  const nextRank = tile.rank >= maxRank ? 1 : tile.rank + 1;

  return { suit: tile.suit, rank: nextRank };
}

// ---------------------------------------------------------------------------
// isHunTile
// ---------------------------------------------------------------------------

/**
 * Check whether a tile is marked as 混儿 (wildcard).
 */
export function isHunTile(tile: Tile): boolean {
  return tile.isHun;
}

// ---------------------------------------------------------------------------
// tilesMatch
// ---------------------------------------------------------------------------

/**
 * Compare two tiles by suit and rank (ignoring id and isHun).
 * Returns true if they represent the same tile type.
 */
export function tilesMatch(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}
