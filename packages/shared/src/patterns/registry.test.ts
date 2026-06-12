import { describe, it, expect, beforeEach } from 'vitest';
import type { Tile, PatternChecker } from '../types';
import { PatternRegistry } from './registry';
import { fourTripletsPairChecker } from './four-triplets-pair';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function makeTile(suit: string, rank: number, isHun = false): Tile {
  return { suit: suit as Tile['suit'], rank, id: 0, isHun };
}

// ---------------------------------------------------------------------------
// Four Triplets + One Pair checker
// ---------------------------------------------------------------------------
describe('fourTripletsPairChecker', () => {
  it('returns pattern for 4 triplets + 1 pair (pong-style hand)', () => {
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),      // 111 wan
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2),    // 222 tiao
      makeTile('tong', 3), makeTile('tong', 3), makeTile('tong', 3),    // 333 tong
      makeTile('wan', 4), makeTile('wan', 4), makeTile('wan', 4),       // 444 wan
      makeTile('tiao', 5), makeTile('tiao', 5),                         // 55 tiao (pair)
    ];

    const result = fourTripletsPairChecker.check(hand, { hunTiles: [] });
    expect(result).not.toBeNull();
    expect(result!.patternName).toBe('四刻一对');
    expect(result!.description).toBeTruthy();
  });

  it('rejects hand with a 4-of-a-kind group but insufficient triplets (4+3+3+2+2=14)', () => {
    // One rank has 4 tiles (counts as 1 triplet), two ranks have 3 (2 triplets),
    // and two ranks have 2 (2 pairs) -- only 3 triplets + 2 pairs, should fail.
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1), // 4 (one triplet)
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2),                   // 3 (triplet)
      makeTile('tong', 3), makeTile('tong', 3), makeTile('tong', 3),                   // 3 (triplet)
      makeTile('wan', 5), makeTile('wan', 5),                                          // 2 (pair)
      makeTile('tiao', 4), makeTile('tiao', 4),                                        // 2 (pair)
    ];

    const result = fourTripletsPairChecker.check(hand, { hunTiles: [] });
    expect(result).toBeNull();
  });

  it('returns null for all-sequences hand (not pong-style)', () => {
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 2), makeTile('wan', 3),
      makeTile('tiao', 4), makeTile('tiao', 5), makeTile('tiao', 6),
      makeTile('tong', 7), makeTile('tong', 8), makeTile('tong', 9),
      makeTile('wan', 4), makeTile('wan', 5), makeTile('wan', 6),
      makeTile('feng', 1), makeTile('feng', 1),
    ];

    const result = fourTripletsPairChecker.check(hand, { hunTiles: [] });
    expect(result).toBeNull();
  });

  it('returns null for hand with wrong tile count (not 14)', () => {
    const tooFew: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2),
    ];
    const tooMany: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),
      makeTile('wan', 2), makeTile('wan', 2), makeTile('wan', 2),
      makeTile('wan', 3), makeTile('wan', 3), makeTile('wan', 3),
      makeTile('wan', 4), makeTile('wan', 4), makeTile('wan', 4),
      makeTile('wan', 5), makeTile('wan', 5), makeTile('wan', 5),
      makeTile('wan', 6), makeTile('wan', 6), makeTile('wan', 6),
    ];

    expect(fourTripletsPairChecker.check(tooFew, { hunTiles: [] })).toBeNull();
    expect(fourTripletsPairChecker.check(tooMany, { hunTiles: [] })).toBeNull();
  });

  it('returns null for hand with valid count but wrong structure (all pairs)', () => {
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1),
      makeTile('wan', 2), makeTile('wan', 2),
      makeTile('wan', 3), makeTile('wan', 3),
      makeTile('wan', 4), makeTile('wan', 4),
      makeTile('wan', 5), makeTile('wan', 5),
      makeTile('wan', 6), makeTile('wan', 6),
      makeTile('wan', 7), makeTile('wan', 7),
    ];

    const result = fourTripletsPairChecker.check(hand, { hunTiles: [] });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PatternRegistry
// ---------------------------------------------------------------------------
describe('PatternRegistry', () => {
  let registry: PatternRegistry;

  beforeEach(() => {
    registry = new PatternRegistry();
  });

  it('registers and lists checkers', () => {
    registry.register(fourTripletsPairChecker);
    const checkers = registry.list();
    expect(checkers).toHaveLength(1);
    expect(checkers[0].name).toBe('四刻一对');
  });

  it('unregisters by name', () => {
    registry.register(fourTripletsPairChecker);
    registry.unregister('四刻一对');
    expect(registry.list()).toHaveLength(0);
  });

  it('unregister non-existent name does not throw', () => {
    expect(() => registry.unregister('nonexistent')).not.toThrow();
    expect(registry.list()).toHaveLength(0);
  });

  it('clear() removes all checkers', () => {
    registry.register(fourTripletsPairChecker);

    const mockChecker: PatternChecker = {
      name: 'mock',
      check: () => null,
    };
    registry.register(mockChecker);

    expect(registry.list()).toHaveLength(2);

    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });

  it('registering duplicate name replaces the existing checker', () => {
    const v1: PatternChecker = {
      name: 'test',
      check: () => ({ patternName: 'test', description: 'v1' }),
    };
    const v2: PatternChecker = {
      name: 'test',
      check: () => ({ patternName: 'test', description: 'v2' }),
    };

    registry.register(v1);
    registry.register(v2);

    const checkers = registry.list();
    expect(checkers).toHaveLength(1);
    expect(checkers[0].check([], { hunTiles: [] })!.description).toBe('v2');
  });
});
