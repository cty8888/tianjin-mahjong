import { describe, it, expect, beforeEach } from 'vitest';
import type { Tile } from './types';
import { PatternRegistry } from './patterns/registry';
import { fourTripletsPairChecker } from './patterns/four-triplets-pair';
import { createTiles } from './tile';
import { checkWin, isTing } from './hand';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function makeTile(suit: string, rank: number, isHun = false): Tile {
  return { suit: suit as Tile['suit'], rank, id: 0, isHun };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
function createRegistry(): PatternRegistry {
  const registry = new PatternRegistry();
  registry.register(fourTripletsPairChecker);
  return registry;
}

// ---------------------------------------------------------------------------
// checkWin
// ---------------------------------------------------------------------------
describe('checkWin', () => {
  let registry: PatternRegistry;

  beforeEach(() => {
    registry = createRegistry();
  });

  it('returns pattern for valid winning hand (four triplets + one pair)', () => {
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2),
      makeTile('tong', 3), makeTile('tong', 3), makeTile('tong', 3),
      makeTile('wan', 4), makeTile('wan', 4), makeTile('wan', 4),
      makeTile('tiao', 5), makeTile('tiao', 5),
    ];

    const result = checkWin(hand, [], registry);
    expect(result).not.toBeNull();
    expect(result!.patternName).toBe('四刻一对');
  });

  it('returns null for non-winning hand', () => {
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 2), makeTile('wan', 3),
      makeTile('tiao', 4), makeTile('tiao', 5), makeTile('tiao', 6),
      makeTile('tong', 7), makeTile('tong', 8), makeTile('tong', 9),
      makeTile('wan', 4), makeTile('wan', 5), makeTile('wan', 6),
      makeTile('feng', 1), makeTile('feng', 1),
    ];

    const result = checkWin(hand, [], registry);
    expect(result).toBeNull();
  });

  it('returns null for wrong tile count (not 14)', () => {
    // 13 tiles - too few
    const tooFew: Tile[] = Array.from({ length: 13 }, () => makeTile('wan', 1));
    // 15 tiles - too many
    const tooMany: Tile[] = Array.from({ length: 15 }, () => makeTile('wan', 1));

    expect(checkWin(tooFew, [], registry)).toBeNull();
    expect(checkWin(tooMany, [], registry)).toBeNull();
  });

  it('returns null when registry is empty (no patterns registered)', () => {
    const emptyRegistry = new PatternRegistry();
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2),
      makeTile('tong', 3), makeTile('tong', 3), makeTile('tong', 3),
      makeTile('wan', 4), makeTile('wan', 4), makeTile('wan', 4),
      makeTile('tiao', 5), makeTile('tiao', 5),
    ];

    const result = checkWin(hand, [], emptyRegistry);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isTing
// ---------------------------------------------------------------------------
describe('isTing', () => {
  let registry: PatternRegistry;

  beforeEach(() => {
    registry = createRegistry();
  });

  it('returns true when one tile away from winning (12 triplets + 1 pair layout with one missing)', () => {
    // This hand has 4 triplets + 1 pair BUT one tile is missing from a triplet.
    // wa n 1,1,1 | tiao 2,2,2 | tong 3,3,3 | wan 4,4 | tiao 5,5 = 13 tiles
    // Missing one wan-4 to complete the fourth triplet.
    // With one more wan-4 it becomes 4 triplets + 1 pair -> win.
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2),
      makeTile('tong', 3), makeTile('tong', 3), makeTile('tong', 3),
      makeTile('wan', 4), makeTile('wan', 4),                           // only 2 wan-4 (need 3)
      makeTile('tiao', 5), makeTile('tiao', 5),
    ];

    const result = isTing(hand, [], registry);
    expect(result).toBe(true);
  });

  it('returns false when more than one tile away from winning', () => {
    // A hand with all different tiles -- nowhere near winning, many tiles needed.
    const hand: Tile[] = [
      makeTile('wan', 1),
      makeTile('tiao', 2),
      makeTile('tong', 3),
      makeTile('wan', 4),
      makeTile('tiao', 5),
      makeTile('tong', 6),
      makeTile('wan', 7),
      makeTile('tiao', 8),
      makeTile('tong', 9),
      makeTile('feng', 1),
      makeTile('feng', 2),
      makeTile('jian', 1),
      makeTile('jian', 2),
    ];

    const result = isTing(hand, [], registry);
    expect(result).toBe(false);
  });

  it('returns false when no patterns are registered', () => {
    const emptyRegistry = new PatternRegistry();
    // This hand is one tile away from 4 triplets + 1 pair,
    // but with an empty registry there's nothing to match.
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2),
      makeTile('tong', 3), makeTile('tong', 3), makeTile('tong', 3),
      makeTile('wan', 4), makeTile('wan', 4),
      makeTile('tiao', 5), makeTile('tiao', 5),
    ];

    const result = isTing(hand, [], emptyRegistry);
    expect(result).toBe(false);
  });
});
