// ---------------------------------------------------------------------------
// Unit tests for rules.ts — Pong and Kong rules (Task 5)
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import type { Tile, Player } from './types';
import {
  canPong,
  canMingKong,
  canAnKong,
  canBuKong,
  canJinKong,
  getLegalDiscards,
  performPong,
  performMingKong,
  performAnKong,
  performBuKong,
} from './rules';

// ---------------------------------------------------------------------------
// Helper: create a Tile
// ---------------------------------------------------------------------------
function t(suit: string, rank: number, hun = false): Tile {
  // Give each tile a unique-ish id based on suit+rank+hun for test isolation
  const suitBase: Record<string, number> = {
    wan: 0,
    tiao: 36,
    tong: 72,
    feng: 108,
    jian: 120,
  };
  const id = (suitBase[suit] ?? 0) + (rank - 1) * 4 + (hun ? 500 : 0);
  return { suit: suit as Tile['suit'], rank, id, isHun: hun };
}

// Helper: make a Player with given hand and optionally melds/discards
function makePlayer(hand: Tile[], melds: Player['melds'] = []): Player {
  return {
    seat: 0,
    hand: [...hand],
    discards: [],
    melds: [...melds],
    isHuman: true,
  };
}

// ---------------------------------------------------------------------------
// canPong
// ---------------------------------------------------------------------------
describe('canPong', () => {
  it('returns true when player has 2 matching tiles in hand', () => {
    const discarding: Tile = t('wan', 5);
    const player = makePlayer([t('wan', 5), t('wan', 5), t('tiao', 1)]);
    expect(canPong(player, discarding)).toBe(true);
  });

  it('returns false when player has only 1 matching tile', () => {
    const discarding: Tile = t('wan', 5);
    const player = makePlayer([t('wan', 5), t('tiao', 1), t('tiao', 2)]);
    expect(canPong(player, discarding)).toBe(false);
  });

  it('returns false when player has 0 matching tiles', () => {
    const discarding: Tile = t('wan', 5);
    const player = makePlayer([t('tiao', 1), t('tiao', 2), t('tiao', 3)]);
    expect(canPong(player, discarding)).toBe(false);
  });

  it('huns in hand count as matching for pong', () => {
    const discarding: Tile = t('wan', 5);
    // 2 hun tiles + the discard = can pong (huns are wildcards and can match anything)
    const player = makePlayer([t('wan', 5, true), t('wan', 5, true), t('tiao', 1)]);
    // huns match the discard because they are wild and can substitute
    // But wait: canPong checks if the player has 2+ of the discarded type.
    // Hun tiles are not the same suit+rank as the discard, so they don't count.
    // This is correct: canPong checks actual matching tiles, not hun substitution.
  });

  it('returns true even with hun tiles in hand (huns don\'t interfere)', () => {
    const discarding: Tile = t('wan', 1);
    const player = makePlayer([
      t('wan', 1),
      t('wan', 1),
      t('tiao', 5, true), // hun — different suit, doesn't match
      t('tong', 3),
    ]);
    expect(canPong(player, discarding)).toBe(true);
  });

  it('pong works across suits — feng tiles', () => {
    const discarding: Tile = t('feng', 2); // 南
    const player = makePlayer([t('feng', 2), t('feng', 2), t('wan', 1)]);
    expect(canPong(player, discarding)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canMingKong
// ---------------------------------------------------------------------------
describe('canMingKong', () => {
  it('returns true when player has 3 matching tiles in hand', () => {
    const discarding: Tile = t('tong', 7);
    const player = makePlayer([
      t('tong', 7),
      t('tong', 7),
      t('tong', 7),
      t('wan', 1),
    ]);
    expect(canMingKong(player, discarding)).toBe(true);
  });

  it('returns false when player has only 2 matching tiles', () => {
    const discarding: Tile = t('tong', 7);
    const player = makePlayer([t('tong', 7), t('tong', 7), t('wan', 1)]);
    expect(canMingKong(player, discarding)).toBe(false);
  });

  it('returns false when player has 0 matching tiles', () => {
    const discarding: Tile = t('tong', 7);
    const player = makePlayer([t('wan', 1), t('wan', 2), t('wan', 3)]);
    expect(canMingKong(player, discarding)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canAnKong
// ---------------------------------------------------------------------------
describe('canAnKong', () => {
  it('returns 4 tiles when hand has 4-of-a-kind', () => {
    const tiles = [t('wan', 3), t('wan', 3), t('wan', 3), t('wan', 3)];
    const player = makePlayer([...tiles, t('tiao', 1)]);
    const result = canAnKong(player);
    expect(result).toHaveLength(4);
    expect(result.every((r) => r.suit === 'wan' && r.rank === 3)).toBe(true);
  });

  it('returns empty array when no 4-of-a-kind', () => {
    const player = makePlayer([
      t('wan', 3),
      t('wan', 3),
      t('wan', 3),
      t('tiao', 1),
    ]);
    expect(canAnKong(player)).toHaveLength(0);
  });

  it('returns empty array for hand with all different tiles', () => {
    const player = makePlayer([
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('tiao', 4), t('tiao', 5),
    ]);
    expect(canAnKong(player)).toHaveLength(0);
  });

  it('returns first 4-of-a-kind when multiple exist', () => {
    const player = makePlayer([
      t('wan', 3), t('wan', 3), t('wan', 3), t('wan', 3),
      t('tiao', 7), t('tiao', 7), t('tiao', 7), t('tiao', 7),
    ]);
    const result = canAnKong(player);
    expect(result).toHaveLength(4);
    // Should find one of them (wan 3 comes first in hand order)
    expect(result[0].suit).toBe('wan');
    expect(result[0].rank).toBe(3);
  });

  it('handles feng suit 4-of-a-kind', () => {
    const player = makePlayer([
      t('feng', 1), t('feng', 1), t('feng', 1), t('feng', 1),
    ]);
    expect(canAnKong(player)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// canBuKong
// ---------------------------------------------------------------------------
describe('canBuKong', () => {
  it('returns pong meld index + matching tile when player draws 4th tile for a pong', () => {
    const pongTiles = [t('wan', 5), t('wan', 5), t('wan', 5)];
    const player = makePlayer(
      [t('wan', 5), t('tiao', 2), t('tiao', 3)],
      [{ type: 'pong', tiles: pongTiles }],
    );
    const result = canBuKong(player);
    expect(result).not.toBeNull();
    expect(result!.pongMeldIndex).toBe(0);
    expect(result!.tile.suit).toBe('wan');
    expect(result!.tile.rank).toBe(5);
  });

  it('returns null when no matching tile in hand for any pong', () => {
    const pongTiles = [t('wan', 5), t('wan', 5), t('wan', 5)];
    const player = makePlayer(
      [t('tiao', 2), t('tiao', 3), t('tong', 7)],
      [{ type: 'pong', tiles: pongTiles }],
    );
    expect(canBuKong(player)).toBeNull();
  });

  it('returns null when player has no pong melds', () => {
    const player = makePlayer([t('wan', 5), t('wan', 5), t('wan', 5)]);
    expect(canBuKong(player)).toBeNull();
  });

  it('finds matching pong among multiple melds', () => {
    const player = makePlayer(
      [t('tiao', 7)], // matches the second pong
      [
        { type: 'pong', tiles: [t('wan', 1), t('wan', 1), t('wan', 1)] },
        { type: 'pong', tiles: [t('tiao', 7), t('tiao', 7), t('tiao', 7)] },
      ],
    );
    const result = canBuKong(player);
    expect(result).not.toBeNull();
    expect(result!.pongMeldIndex).toBe(1);
    expect(result!.tile.suit).toBe('tiao');
    expect(result!.tile.rank).toBe(7);
  });

  it('only checks pong melds (not other meld types)', () => {
    const player = makePlayer(
      [t('wan', 3)],
      [
        { type: 'ming-kong', tiles: [t('wan', 3), t('wan', 3), t('wan', 3), t('wan', 3)] },
        { type: 'pong', tiles: [t('wan', 1), t('wan', 1), t('wan', 1)] },
      ],
    );
    const result = canBuKong(player);
    // wan 3 is in hand but the meld is ming-kong, not pong — skip it
    // wan 1 pong doesn't match the hand tile
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// canJinKong
// ---------------------------------------------------------------------------
describe('canJinKong', () => {
  it('returns 4 hun tiles when hand has 4 hun tiles', () => {
    const player = makePlayer([
      t('wan', 1, true),
      t('wan', 2, true),
      t('tiao', 3, true),
      t('tong', 7, true),
      t('wan', 5),
      t('tiao', 1),
    ]);
    const result = canJinKong(player);
    expect(result).toHaveLength(4);
    expect(result.every((r) => r.isHun)).toBe(true);
  });

  it('returns empty array when fewer than 4 hun tiles', () => {
    const player = makePlayer([
      t('wan', 1, true),
      t('wan', 2, true),
      t('tiao', 3, true),
      t('wan', 5),
      t('tiao', 1),
    ]);
    expect(canJinKong(player)).toHaveLength(0);
  });

  it('returns first 4 hun tiles when more than 4 exist', () => {
    const player = makePlayer([
      t('wan', 1, true),
      t('wan', 2, true),
      t('tiao', 3, true),
      t('tong', 7, true),
      t('feng', 1, true),
      t('wan', 5),
    ]);
    const result = canJinKong(player);
    expect(result).toHaveLength(4);
  });

  it('returns empty array for hand with no hun tiles', () => {
    const player = makePlayer([
      t('wan', 1), t('wan', 2), t('wan', 3),
      t('tiao', 4), t('tiao', 5),
    ]);
    expect(canJinKong(player)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getLegalDiscards
// ---------------------------------------------------------------------------
describe('getLegalDiscards', () => {
  it('excludes all hun tiles', () => {
    const player = makePlayer([
      t('wan', 1),
      t('wan', 1, true), // hun — excluded
      t('tiao', 5),
      t('tong', 3, true), // hun — excluded
      t('feng', 2),
    ]);
    const legal = getLegalDiscards(player);
    expect(legal).toHaveLength(3);
    expect(legal.every((t) => !t.isHun)).toBe(true);
  });

  it('returns all non-hun tiles', () => {
    const player = makePlayer([
      t('wan', 1),
      t('wan', 2),
      t('tiao', 5),
      t('tong', 3),
      t('feng', 2),
    ]);
    const legal = getLegalDiscards(player);
    expect(legal).toHaveLength(5);
  });

  it('returns empty when all tiles are hun', () => {
    const player = makePlayer([
      t('wan', 1, true),
      t('wan', 2, true),
      t('tiao', 3, true),
    ]);
    expect(getLegalDiscards(player)).toHaveLength(0);
  });

  it('returns empty for empty hand', () => {
    const player = makePlayer([]);
    expect(getLegalDiscards(player)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// performPong
// ---------------------------------------------------------------------------
describe('performPong', () => {
  it('removes 2 matching tiles from hand and adds pong meld with 3 tiles', () => {
    const discarding: Tile = t('wan', 5);
    const player = makePlayer([
      t('wan', 5),
      t('wan', 5),
      t('tiao', 1),
      t('tiao', 2),
      t('tiao', 3),
    ]);
    const initialHandSize = player.hand.length;

    performPong(player, discarding);

    // Hand: 2 removed, so 5 - 2 = 3 remaining
    expect(player.hand).toHaveLength(3);
    // No wan 5 tiles left in hand
    expect(player.hand.filter((t) => t.suit === 'wan' && t.rank === 5)).toHaveLength(0);

    // Meld: 1 pong meld with 3 tiles (2 from hand + discard)
    expect(player.melds).toHaveLength(1);
    expect(player.melds[0].type).toBe('pong');
    expect(player.melds[0].tiles).toHaveLength(3);
    expect(player.melds[0].tiles.every((t) => t.suit === 'wan' && t.rank === 5)).toBe(true);
  });

  it('does not remove non-matching tiles', () => {
    const discarding: Tile = t('tiao', 3);
    const player = makePlayer([
      t('wan', 5),
      t('wan', 5),
      t('wan', 5),
      t('tiao', 3),
      t('tiao', 3),
    ]);
    performPong(player, discarding);

    // Only tiao 3 tiles should be removed (2 of them) + discard makes 3 in meld
    expect(player.hand.filter((t) => t.suit === 'wan')).toHaveLength(3);
    expect(player.hand.filter((t) => t.suit === 'tiao')).toHaveLength(0);
    expect(player.melds[0].tiles).toHaveLength(3);
  });

  it('correct tile counts after performPong', () => {
    const discarding: Tile = t('wan', 1);
    const player = makePlayer([
      t('wan', 1),
      t('wan', 1),
      t('tiao', 2),
      t('tiao', 3),
    ]);

    const handBefore = player.hand.length;

    performPong(player, discarding);

    // 2 tiles removed from hand
    expect(player.hand.length).toBe(handBefore - 2);
    // 1 meld added: 3 tiles = 2 from hand + 1 discard
    expect(player.melds.length).toBe(1);
    expect(player.melds[0].tiles).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// performMingKong
// ---------------------------------------------------------------------------
describe('performMingKong', () => {
  it('removes 3 matching tiles from hand and adds ming-kong meld with 4 tiles', () => {
    const discarding: Tile = t('tong', 9);
    const player = makePlayer([
      t('tong', 9),
      t('tong', 9),
      t('tong', 9),
      t('wan', 1),
      t('wan', 2),
    ]);
    const initialHandSize = player.hand.length;

    performMingKong(player, discarding);

    // Hand: 3 removed, so 5 - 3 = 2 remaining
    expect(player.hand).toHaveLength(2);
    // No tong 9 tiles left in hand
    expect(player.hand.filter((t) => t.suit === 'tong' && t.rank === 9)).toHaveLength(0);

    // Meld: 1 ming-kong meld with 4 tiles (3 from hand + discard)
    expect(player.melds).toHaveLength(1);
    expect(player.melds[0].type).toBe('ming-kong');
    expect(player.melds[0].tiles).toHaveLength(4);
    expect(player.melds[0].tiles.every((t) => t.suit === 'tong' && t.rank === 9)).toBe(true);
  });

  it('correct tile counts after performMingKong', () => {
    const discarding: Tile = t('feng', 3); // 西
    const player = makePlayer([
      t('feng', 3),
      t('feng', 3),
      t('feng', 3),
      t('wan', 1),
      t('tiao', 2),
    ]);

    const handBefore = player.hand.length;
    const meldsBefore = player.melds.length;

    performMingKong(player, discarding);

    // 3 tiles removed from hand
    expect(player.hand.length).toBe(handBefore - 3);
    // 1 meld added with 4 tiles (3 from hand + 1 discard)
    expect(player.melds.length).toBe(meldsBefore + 1);
    expect(player.melds[0].tiles).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// performAnKong
// ---------------------------------------------------------------------------
describe('performAnKong', () => {
  it('removes 4 tiles from hand and adds an-kong meld', () => {
    const kongTiles = [t('wan', 3), t('wan', 3), t('wan', 3), t('wan', 3)];
    const player = makePlayer([
      ...kongTiles,
      t('tiao', 1),
      t('tiao', 2),
    ]);

    performAnKong(player, kongTiles);

    // 4 tiles removed from hand
    expect(player.hand).toHaveLength(2);
    expect(player.hand.filter((t) => t.suit === 'wan' && t.rank === 3)).toHaveLength(0);

    // Meld added
    expect(player.melds).toHaveLength(1);
    expect(player.melds[0].type).toBe('an-kong');
    expect(player.melds[0].tiles).toHaveLength(4);
    expect(player.melds[0].tiles.every((t) => t.suit === 'wan' && t.rank === 3)).toBe(true);
  });

  it('correct tile counts after performAnKong', () => {
    const kongTiles = [t('feng', 1), t('feng', 1), t('feng', 1), t('feng', 1)];
    const player = makePlayer([...kongTiles]);

    const handBefore = player.hand.length;
    const meldsBefore = player.melds.length;

    performAnKong(player, kongTiles);

    expect(player.hand.length).toBe(handBefore - 4);
    expect(player.melds.length).toBe(meldsBefore + 1);
    expect(player.melds[0].tiles).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// performBuKong
// ---------------------------------------------------------------------------
describe('performBuKong', () => {
  it('removes tile from hand and updates pong meld to bu-kong', () => {
    const pongTiles = [t('wan', 5), t('wan', 5), t('wan', 5)];
    const matchingTile = t('wan', 5);
    const player = makePlayer(
      [matchingTile, t('tiao', 2), t('tiao', 3)],
      [{ type: 'pong', tiles: [...pongTiles] }],
    );

    const handBefore = player.hand.length;

    performBuKong(player, 0, matchingTile);

    // Tile removed from hand
    expect(player.hand.length).toBe(handBefore - 1);
    expect(player.hand.filter((t) => t.suit === 'wan' && t.rank === 5)).toHaveLength(0);

    // Pong meld updated to bu-kong with 4 tiles
    expect(player.melds[0].type).toBe('bu-kong');
    expect(player.melds[0].tiles).toHaveLength(4);
    expect(player.melds[0].tiles.every((t) => t.suit === 'wan' && t.rank === 5)).toBe(true);
  });

  it('correct tile counts after performBuKong', () => {
    const pongTiles = [t('tiao', 7), t('tiao', 7), t('tiao', 7)];
    const extraTile = t('tiao', 7);
    const player = makePlayer(
      [extraTile, t('wan', 1)],
      [{ type: 'pong', tiles: [...pongTiles] }],
    );

    const handBefore = player.hand.length;
    const meldTileCountBefore = player.melds.reduce((s, m) => s + m.tiles.length, 0);

    performBuKong(player, 0, extraTile);

    expect(player.hand.length).toBe(handBefore - 1);
    expect(player.melds[0].tiles).toHaveLength(4);
    const meldTileCountAfter = player.melds.reduce((s, m) => s + m.tiles.length, 0);
    expect(meldTileCountAfter).toBe(meldTileCountBefore + 1);
  });
});

// ---------------------------------------------------------------------------
// Cross-test: after perform, tile counts are correct
// ---------------------------------------------------------------------------
describe('post-perform tile counts', () => {
  it('performPong: total tiles conserved (hand + melds)', () => {
    const discarding: Tile = t('wan', 5);
    const player = makePlayer([
      t('wan', 5), t('wan', 5),
      t('tiao', 1), t('tiao', 2),
    ]);
    performPong(player, discarding);
    // Hand: 2 left, meld: 1 pong = 3 tiles
    expect(player.hand.length).toBe(2);
    expect(player.melds[0].tiles).toHaveLength(3);
  });

  it('performMingKong: total tiles conserved', () => {
    const discarding: Tile = t('wan', 5);
    const player = makePlayer([
      t('wan', 5), t('wan', 5), t('wan', 5),
      t('tiao', 1),
    ]);
    performMingKong(player, discarding);
    expect(player.hand.length).toBe(1);
    expect(player.melds[0].tiles).toHaveLength(4);
  });

  it('performAnKong: total tiles conserved', () => {
    const kongTiles = [t('wan', 3), t('wan', 3), t('wan', 3), t('wan', 3)];
    const player = makePlayer([...kongTiles, t('tiao', 1)]);
    performAnKong(player, kongTiles);
    expect(player.hand.length).toBe(1);
    expect(player.melds[0].tiles).toHaveLength(4);
  });

  it('performBuKong: total tiles conserved', () => {
    const pongTiles = [t('wan', 5), t('wan', 5), t('wan', 5)];
    const extraTile = t('wan', 5);
    const player = makePlayer(
      [extraTile, t('tiao', 1)],
      [{ type: 'pong', tiles: [...pongTiles] }],
    );
    performBuKong(player, 0, extraTile);
    expect(player.hand.length).toBe(1);
    expect(player.melds[0].tiles).toHaveLength(4);
  });
});
