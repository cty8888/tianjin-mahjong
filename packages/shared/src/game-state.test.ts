// ---------------------------------------------------------------------------
// Unit tests for game-state.ts
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import type { Tile, Player, GameState } from './types';
import { createTiles } from './tile';
import { getNextTileInSequence } from './tile';
import {
  createGame,
  dealTiles,
  determineHunTilesFromIndicator,
  markHunTiles,
  getNextSeat,
  sortHand,
} from './game-state';

// ---------------------------------------------------------------------------
// sortHand
// ---------------------------------------------------------------------------
describe('sortHand', () => {
  it('sorts wan before tiao before tong before feng before jian', () => {
    const tiles: Tile[] = [
      { suit: 'jian', rank: 1, id: 100, isHun: false },
      { suit: 'wan', rank: 5, id: 0, isHun: false },
      { suit: 'tiao', rank: 1, id: 40, isHun: false },
      { suit: 'feng', rank: 1, id: 80, isHun: false },
      { suit: 'tong', rank: 9, id: 70, isHun: false },
    ];
    const sorted = sortHand([...tiles]);
    expect(sorted[0].suit).toBe('wan');
    expect(sorted[1].suit).toBe('tiao');
    expect(sorted[2].suit).toBe('tong');
    expect(sorted[3].suit).toBe('feng');
    expect(sorted[4].suit).toBe('jian');
  });

  it('sorts by ascending rank within same suit', () => {
    const tiles: Tile[] = [
      { suit: 'wan', rank: 9, id: 32, isHun: false },
      { suit: 'wan', rank: 1, id: 0, isHun: false },
      { suit: 'wan', rank: 5, id: 16, isHun: false },
    ];
    const sorted = sortHand([...tiles]);
    expect(sorted[0].rank).toBe(1);
    expect(sorted[1].rank).toBe(5);
    expect(sorted[2].rank).toBe(9);
  });

  it('does not mutate the input array', () => {
    const tiles: Tile[] = [
      { suit: 'wan', rank: 9, id: 32, isHun: false },
      { suit: 'wan', rank: 1, id: 0, isHun: false },
    ];
    const copy = [...tiles];
    sortHand(tiles);
    expect(tiles).toEqual(copy);
  });

  it('returns empty array for empty input', () => {
    expect(sortHand([])).toEqual([]);
  });

  it('puts hun tiles at the leftmost position', () => {
    const tiles: Tile[] = [
      { suit: 'wan', rank: 1, id: 0, isHun: false },
      { suit: 'tiao', rank: 2, id: 40, isHun: true },
      { suit: 'tong', rank: 3, id: 70, isHun: false },
    ];
    const sorted = sortHand([...tiles]);
    expect(sorted[0].isHun).toBe(true);
    expect(sorted[0].suit).toBe('tiao');
  });

  it('sorts hun tiles among themselves by suit then rank', () => {
    const tiles: Tile[] = [
      { suit: 'wan', rank: 9, id: 32, isHun: true },
      { suit: 'wan', rank: 1, id: 0, isHun: true },
      { suit: 'tiao', rank: 1, id: 36, isHun: true },
    ];
    const sorted = sortHand([...tiles]);
    // hun tiles: wan1, wan9, tiao1
    expect(sorted[0].suit).toBe('wan');
    expect(sorted[0].rank).toBe(1);
    expect(sorted[1].suit).toBe('wan');
    expect(sorted[1].rank).toBe(9);
    expect(sorted[2].suit).toBe('tiao');
    expect(sorted[2].rank).toBe(1);
  });

  it('sorts non-hun tiles after all hun tiles', () => {
    const tiles: Tile[] = [
      { suit: 'jian', rank: 1, id: 132, isHun: false },
      { suit: 'wan', rank: 1, id: 0, isHun: false },
      { suit: 'tiao', rank: 1, id: 40, isHun: true },
      { suit: 'wan', rank: 5, id: 16, isHun: false },
    ];
    const sorted = sortHand([...tiles]);
    // hun first
    expect(sorted[0].isHun).toBe(true);
    // then non-hun: wan1, wan5, jian1
    expect(sorted[1].isHun).toBe(false);
    expect(sorted[1].suit).toBe('wan');
    expect(sorted[1].rank).toBe(1);
    expect(sorted[2].suit).toBe('wan');
    expect(sorted[2].rank).toBe(5);
    expect(sorted[3].suit).toBe('jian');
    expect(sorted[3].rank).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getNextSeat
// ---------------------------------------------------------------------------
describe('getNextSeat', () => {
  it('advances 0 → 1 in a 4-player game', () => {
    expect(getNextSeat(0, 4)).toBe(1);
  });

  it('advances 1 → 2 in a 4-player game', () => {
    expect(getNextSeat(1, 4)).toBe(2);
  });

  it('advances 2 → 3 in a 4-player game', () => {
    expect(getNextSeat(2, 4)).toBe(3);
  });

  it('wraps 3 → 0 in a 4-player game', () => {
    expect(getNextSeat(3, 4)).toBe(0);
  });

  it('wraps 1 → 2 in a 3-player game', () => {
    expect(getNextSeat(1, 3)).toBe(2);
  });

  it('wraps 2 → 0 in a 3-player game', () => {
    expect(getNextSeat(2, 3)).toBe(0);
  });

  it('wraps 1 → 0 in a 2-player game', () => {
    expect(getNextSeat(1, 2)).toBe(0);
  });

  it('advances 0 → 1 in a 2-player game', () => {
    expect(getNextSeat(0, 2)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// determineHunTilesFromIndicator
// ---------------------------------------------------------------------------
describe('determineHunTilesFromIndicator', () => {
  it('五万 indicator → 3x五万 + 4x六万 = 7 hun tiles', () => {
    const allTiles = createTiles();
    const indicator: Tile = { suit: 'wan', rank: 5, id: 999, isHun: false };
    const hunTiles = determineHunTilesFromIndicator(indicator, allTiles);

    expect(hunTiles).toHaveLength(7);

    // 3 copies of 五万 (indicator type)
    const indicatorType = hunTiles.filter(
      (t) => t.suit === 'wan' && t.rank === 5,
    );
    expect(indicatorType).toHaveLength(3);

    // 4 copies of 六万 (next type)
    const nextType = hunTiles.filter(
      (t) => t.suit === 'wan' && t.rank === 6,
    );
    expect(nextType).toHaveLength(4);
  });

  it('indicator itself is NOT in hunTiles', () => {
    const allTiles = createTiles();
    const indicator: Tile = { suit: 'wan', rank: 3, id: 999, isHun: false };
    const hunTiles = determineHunTilesFromIndicator(indicator, allTiles);

    // None of the hun tiles should be the exact indicator (which has a dummy id)
    for (const hun of hunTiles) {
      // hun tiles must be actual tiles from the deck, not the indicator copy
      expect(hun.id).not.toBe(indicator.id);
    }
  });

  it('wraps to rank 1 for sequence end (九万 → 一萬)', () => {
    const allTiles = createTiles();
    const indicator: Tile = { suit: 'wan', rank: 9, id: 999, isHun: false };
    const hunTiles = determineHunTilesFromIndicator(indicator, allTiles);

    expect(hunTiles).toHaveLength(7);

    // 3 copies of 九万
    const indicatorType = hunTiles.filter(
      (t) => t.suit === 'wan' && t.rank === 9,
    );
    expect(indicatorType).toHaveLength(3);

    // 4 copies of 一万 (next after 9)
    const nextType = hunTiles.filter(
      (t) => t.suit === 'wan' && t.rank === 1,
    );
    expect(nextType).toHaveLength(4);
  });

  it('wraps for feng suit (北 → 东)', () => {
    const allTiles = createTiles();
    const indicator: Tile = { suit: 'feng', rank: 4, id: 999, isHun: false };
    const hunTiles = determineHunTilesFromIndicator(indicator, allTiles);

    expect(hunTiles).toHaveLength(7);

    const indicatorType = hunTiles.filter(
      (t) => t.suit === 'feng' && t.rank === 4,
    );
    expect(indicatorType).toHaveLength(3);

    const nextType = hunTiles.filter(
      (t) => t.suit === 'feng' && t.rank === 1,
    );
    expect(nextType).toHaveLength(4);
  });

  it('wraps for jian suit (白 → 中)', () => {
    const allTiles = createTiles();
    const indicator: Tile = { suit: 'jian', rank: 3, id: 999, isHun: false };
    const hunTiles = determineHunTilesFromIndicator(indicator, allTiles);

    expect(hunTiles).toHaveLength(7);

    const indicatorType = hunTiles.filter(
      (t) => t.suit === 'jian' && t.rank === 3,
    );
    expect(indicatorType).toHaveLength(3);

    const nextType = hunTiles.filter(
      (t) => t.suit === 'jian' && t.rank === 1,
    );
    expect(nextType).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// markHunTiles
// ---------------------------------------------------------------------------
describe('markHunTiles', () => {
  it('sets isHun=true on tiles matching hunTiles by suit and rank', () => {
    const tiles: Tile[] = [
      { suit: 'wan', rank: 1, id: 0, isHun: false },
      { suit: 'wan', rank: 2, id: 4, isHun: false },
      { suit: 'wan', rank: 3, id: 8, isHun: false },
      { suit: 'tiao', rank: 1, id: 36, isHun: false },
      { suit: 'tiao', rank: 2, id: 40, isHun: false },
    ];
    const hunTiles: Tile[] = [
      { suit: 'wan', rank: 2, id: 4, isHun: true },
      { suit: 'wan', rank: 2, id: 5, isHun: true },
    ];

    markHunTiles(tiles, hunTiles);

    // The tile matching suit+rank of a hun tile should be marked
    expect(tiles[1].isHun).toBe(true); // wan rank 2
    // The hun tile with id 5 doesn't exist in tiles, so no effect
    expect(tiles[0].isHun).toBe(false); // wan rank 1 — not hun
    expect(tiles[2].isHun).toBe(false); // wan rank 3 — not hun
    expect(tiles[3].isHun).toBe(false); // tiao rank 1 — not hun
    expect(tiles[4].isHun).toBe(false); // tiao rank 2 — not hun
  });

  it('marks all matching tiles in the wall', () => {
    const allTiles = createTiles();
    // Mark hun tiles as 4x 五万
    const hunTiles = allTiles.filter(
      (t) => t.suit === 'wan' && t.rank === 5,
    );
    markHunTiles(allTiles, hunTiles);

    const hunCount = allTiles.filter((t) => t.isHun).length;
    expect(hunCount).toBe(4); // all 4 copies of 五万
  });
});

// ---------------------------------------------------------------------------
// dealTiles
// ---------------------------------------------------------------------------
describe('dealTiles', () => {
  it('deals 13 tiles to each non-dealer and 14 to dealer', () => {
    const game = createGame(4);
    // After createGame, dealer should have 14, others 13
    const dealer = game.players[game.dealerSeat];
    expect(dealer.hand).toHaveLength(14);

    for (let i = 0; i < 4; i++) {
      if (i !== game.dealerSeat) {
        expect(game.players[i].hand).toHaveLength(13);
      }
    }
  });

  it('deals 13 tiles to each non-dealer and 14 to dealer for 2 players', () => {
    const game = createGame(2);
    const dealer = game.players[game.dealerSeat];
    expect(dealer.hand).toHaveLength(14);

    for (let i = 0; i < 2; i++) {
      if (i !== game.dealerSeat) {
        expect(game.players[i].hand).toHaveLength(13);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// createGame
// ---------------------------------------------------------------------------
describe('createGame', () => {
  it('creates a 4-player game with phase=playing', () => {
    const game = createGame(4);
    expect(game.phase).toBe('playing');
    expect(game.players).toHaveLength(4);
  });

  it('creates a 2-player game', () => {
    const game = createGame(2);
    expect(game.players).toHaveLength(2);
    expect(game.phase).toBe('playing');
  });

  it('creates a 3-player game', () => {
    const game = createGame(3);
    expect(game.players).toHaveLength(3);
  });

  it('throws for playerCount < 2', () => {
    expect(() => createGame(1)).toThrow();
    expect(() => createGame(0)).toThrow();
  });

  it('throws for playerCount > 4', () => {
    expect(() => createGame(5)).toThrow();
    expect(() => createGame(10)).toThrow();
  });

  it('has a wall with tiles after dealing', () => {
    const game = createGame(4);
    // 4 players: dealer gets 14, others 3*13=39, total dealt = 53
    // Plus 1 indicator, total removed from 136 = 54
    // Wall should have 136 - 54 = 82 tiles
    expect(game.wall.length).toBeGreaterThan(0);
    expect(game.wall.length).toBe(82);
  });

  it('has hunIndicator not null', () => {
    const game = createGame(4);
    expect(game.hunIndicator).not.toBeNull();
  });

  it('has exactly 7 hun tiles', () => {
    const game = createGame(4);
    expect(game.hunTiles).toHaveLength(7);
  });

  it('player 0 is human, others are AI', () => {
    const game = createGame(4);
    expect(game.players[0].isHuman).toBe(true);
    for (let i = 1; i < 4; i++) {
      expect(game.players[i].isHuman).toBe(false);
    }
  });

  it('dealerSeat is in range [0, playerCount)', () => {
    const game = createGame(4);
    expect(game.dealerSeat).toBeGreaterThanOrEqual(0);
    expect(game.dealerSeat).toBeLessThan(4);
  });

  it('currentSeat equals dealerSeat', () => {
    const game = createGame(4);
    expect(game.currentSeat).toBe(game.dealerSeat);
  });

  it('dealer has 14 tiles, others have 13', () => {
    const game = createGame(4);
    for (let i = 0; i < 4; i++) {
      if (i === game.dealerSeat) {
        expect(game.players[i].hand).toHaveLength(14);
      } else {
        expect(game.players[i].hand).toHaveLength(13);
      }
    }
  });

  it('all hands are sorted (except dealer 14th tile is separated)', () => {
    const game = createGame(4);
    for (const player of game.players) {
      if (player.seat === game.dealerSeat) {
        // Dealer: first 13 sorted, 14th appended as "drawn"
        const first13 = player.hand.slice(0, 13);
        const sorted13 = sortHand(first13);
        expect(first13).toEqual(sorted13);
        expect(player.hand.length).toBe(14);
      } else {
        const sorted = sortHand([...player.hand]);
        expect(player.hand).toEqual(sorted);
        expect(player.hand.length).toBe(13);
      }
    }
  });

  it('hunIndicator is NOT in hunTiles', () => {
    const game = createGame(4);
    const indicator = game.hunIndicator!;
    for (const hun of game.hunTiles) {
      // hun tile should not be the same tile object as the indicator
      expect(hun.id).not.toBe(indicator.id);
    }
  });

  it('generates unique game IDs on each call', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(createGame(4).id);
    }
    expect(ids.size).toBe(50);
  });

  it('huns are marked in the wall', () => {
    const game = createGame(4);
    // All 7 hun tiles should be marked in the wall (they could be dealt out too)
    const hunInWall = game.wall.filter((t) => t.isHun);
    const hunInHands = game.players.flatMap((p) => p.hand.filter((t) => t.isHun));
    const totalHunMarked = hunInWall.length + hunInHands.length;
    // Some hun tiles may be dealt to players, some stay in wall
    // Total marked should be exactly 7
    expect(totalHunMarked).toBe(7);
  });

  it('lastDiscard and related fields start null', () => {
    const game = createGame(4);
    expect(game.lastDiscard).toBeNull();
    expect(game.lastDiscardSeat).toBeNull();
    expect(game.winner).toBeNull();
    expect(game.winPattern).toBeNull();
  });

  it('players have correct seats 0..playerCount-1', () => {
    const game = createGame(4);
    const seats = game.players.map((p) => p.seat);
    seats.sort((a, b) => a - b);
    expect(seats).toEqual([0, 1, 2, 3]);
  });
});
