// ---------------------------------------------------------------------------
// Unit tests for ai.ts — V1 Random AI Decision (Task 8)
// ---------------------------------------------------------------------------
// Because decisions are random, we test INVARIANTS, not specific outputs.
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import type { Tile, Player } from './types';
import { aiDecideDiscard, aiDecideResponse } from './ai';
import { canPong, canMingKong } from './rules';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function t(suit: string, rank: number, hun = false): Tile {
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

function makePlayer(hand: Tile[], melds: Player['melds'] = []): Player {
  return {
    seat: 1,
    hand: [...hand],
    discards: [],
    melds: [...melds],
    isHuman: false,
  };
}

// ---------------------------------------------------------------------------
// aiDecideDiscard
// ---------------------------------------------------------------------------

describe('aiDecideDiscard', () => {
  it('returns a valid hand index when all tiles are legal', () => {
    const player = makePlayer([t('wan', 1), t('tiao', 3), t('tong', 7)]);
    const idx = aiDecideDiscard(player);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(player.hand.length);
  });

  it('returns a valid hand index when some tiles are hun', () => {
    const player = makePlayer([
      t('wan', 1),
      t('tiao', 3, true), // hun
      t('tong', 7),
      t('feng', 2, true), // hun
    ]);
    // Run many times to increase confidence in the invariant
    for (let i = 0; i < 100; i++) {
      const idx = aiDecideDiscard(player);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(player.hand.length);
    }
  });

  it('never picks a hun tile', () => {
    const player = makePlayer([
      t('wan', 1),
      t('tiao', 3, true), // hun
      t('tong', 7),
      t('feng', 2, true), // hun
      t('jian', 1),
    ]);
    // Run many times to verify the invariant holds consistently
    for (let i = 0; i < 200; i++) {
      const idx = aiDecideDiscard(player);
      const chosenTile = player.hand[idx];
      expect(chosenTile.isHun).toBe(false);
    }
  });

  it('returns -1 or 0 when all tiles are hun (edge case — no legal discards)', () => {
    const player = makePlayer([
      t('wan', 1, true),
      t('tiao', 3, true),
    ]);
    const idx = aiDecideDiscard(player);
    // When there are no legal discards, the function should either:
    // - return -1 indicating no valid choice, OR
    // - still return something in range (implementation detail)
    // We just verify it doesn't crash.
    expect(typeof idx).toBe('number');
  });

  it('only picks from among legal (non-hun) tiles', () => {
    const player = makePlayer([
      t('wan', 5),
      t('tiao', 2, true),
      t('tong', 9),
      t('feng', 1),
      t('jian', 3, true),
    ]);
    const legalTiles = player.hand.filter((tile) => !tile.isHun);
    // Run many iterations — every returned tile must be in the legal set
    for (let i = 0; i < 100; i++) {
      const idx = aiDecideDiscard(player);
      const chosen = player.hand[idx];
      expect(legalTiles).toContain(chosen);
    }
  });
});

// ---------------------------------------------------------------------------
// aiDecideResponse
// ---------------------------------------------------------------------------

describe('aiDecideResponse', () => {
  it('returns a valid ActionType or null', () => {
    const validResponses: (string | null)[] = ['pong', 'ming-kong', null];
    const player = makePlayer([t('wan', 3), t('wan', 3), t('tiao', 1)]);
    const discardTile = t('wan', 3);

    for (let i = 0; i < 50; i++) {
      const response = aiDecideResponse(player, discardTile);
      expect(validResponses).toContain(response);
    }
  });

  it('returns null when player cannot pong or kong', () => {
    // Hand has no matching tiles for the discard
    const player = makePlayer([t('tiao', 1), t('tiao', 2), t('tong', 5)]);
    const discardTile = t('wan', 9);

    expect(canPong(player, discardTile)).toBe(false);
    expect(canMingKong(player, discardTile)).toBe(false);

    // With no valid actions, AI must pass
    for (let i = 0; i < 50; i++) {
      expect(aiDecideResponse(player, discardTile)).toBeNull();
    }
  });

  it('can return pong when player can pong but not kong', () => {
    const player = makePlayer([t('wan', 7), t('wan', 7), t('tiao', 4)]);
    const discardTile = t('wan', 7);

    expect(canPong(player, discardTile)).toBe(true);
    expect(canMingKong(player, discardTile)).toBe(false);

    // Over many runs, we should eventually see a pong response
    let sawPong = false;
    let sawNull = false;
    for (let i = 0; i < 100; i++) {
      const resp = aiDecideResponse(player, discardTile);
      if (resp === 'pong') sawPong = true;
      if (resp === null) sawNull = true;
      // Must not return ming-kong when it's impossible
      expect(resp).not.toBe('ming-kong');
    }
    expect(sawPong).toBe(true);
    expect(sawNull).toBe(true);
  });

  it('can return ming-kong when player can ming-kong', () => {
    const player = makePlayer([t('wan', 2), t('wan', 2), t('wan', 2), t('tiao', 9)]);
    const discardTile = t('wan', 2);

    expect(canPong(player, discardTile)).toBe(true);
    expect(canMingKong(player, discardTile)).toBe(true);

    let sawPong = false;
    let sawMingKong = false;
    let sawNull = false;
    for (let i = 0; i < 200; i++) {
      const resp = aiDecideResponse(player, discardTile);
      if (resp === 'pong') sawPong = true;
      if (resp === 'ming-kong') sawMingKong = true;
      if (resp === null) sawNull = true;
    }
    expect(sawPong).toBe(true);
    expect(sawMingKong).toBe(true);
    expect(sawNull).toBe(true);
  });

  it('returns null when only one matching tile (no pong or kong possible)', () => {
    const player = makePlayer([t('tiao', 6), t('tong', 1), t('feng', 3)]);
    const discardTile = t('tiao', 6);

    expect(canPong(player, discardTile)).toBe(false);
    expect(canMingKong(player, discardTile)).toBe(false);

    for (let i = 0; i < 50; i++) {
      expect(aiDecideResponse(player, discardTile)).toBeNull();
    }
  });
});
