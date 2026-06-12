import { describe, it, expect } from 'vitest';
import type {
  Suit,
  Tile,
  Player,
  MeldType,
  Meld,
  GamePhase,
  GameState,
  ActionType,
  PlayerAction,
  PatternResult,
  PatternChecker,
} from './types';

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------
describe('Tile', () => {
  it('is structurally correct', () => {
    const tile: Tile = {
      suit: 'wan',
      rank: 1,
      id: 0,
      isHun: false,
    };
    expect(tile.suit).toBe('wan');
    expect(tile.rank).toBe(1);
    expect(tile.id).toBe(0);
    expect(tile.isHun).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suit union
// ---------------------------------------------------------------------------
describe('Suit', () => {
  it('accepts all 5 valid values', () => {
    const validSuits: Suit[] = ['wan', 'tiao', 'tong', 'feng', 'jian'];
    expect(validSuits).toHaveLength(5);

    for (const suit of validSuits) {
      const tile: Tile = { suit, rank: 1, id: 0, isHun: false };
      expect(tile.suit).toBe(suit);
    }
  });
});

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
describe('Player', () => {
  it('is structurally correct', () => {
    const player: Player = {
      seat: 0,
      hand: [],
      discards: [],
      melds: [],
      isHuman: true,
    };
    expect(player.seat).toBe(0);
    expect(player.hand).toEqual([]);
    expect(player.discards).toEqual([]);
    expect(player.melds).toEqual([]);
    expect(player.isHuman).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MeldType union
// ---------------------------------------------------------------------------
describe('MeldType', () => {
  it('accepts all valid values', () => {
    const validTypes: MeldType[] = [
      'pong',
      'ming-kong',
      'an-kong',
      'bu-kong',
      'jin-kong',
    ];
    expect(validTypes).toHaveLength(5);
    expect(new Set(validTypes).size).toBe(5); // no duplicates
  });
});

// ---------------------------------------------------------------------------
// Meld
// ---------------------------------------------------------------------------
describe('Meld', () => {
  it('is structurally correct with sourceSeat', () => {
    const meld: Meld = {
      type: 'pong',
      tiles: [],
      sourceSeat: 1,
    };
    expect(meld.type).toBe('pong');
    expect(meld.sourceSeat).toBe(1);
  });

  it('allows sourceSeat to be undefined (an-kong)', () => {
    const meld: Meld = {
      type: 'an-kong',
      tiles: [],
    };
    expect(meld.type).toBe('an-kong');
    expect(meld.sourceSeat).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// GamePhase union
// ---------------------------------------------------------------------------
describe('GamePhase', () => {
  it('accepts all valid values', () => {
    const validPhases: GamePhase[] = ['setup', 'playing', 'finished'];
    expect(validPhases).toHaveLength(3);

    for (const phase of validPhases) {
      expect(phase).toBe(phase);
    }
  });
});

// ---------------------------------------------------------------------------
// GameState
// ---------------------------------------------------------------------------
describe('GameState', () => {
  it('is structurally correct', () => {
    const state: GameState = {
      id: 'game-1',
      players: [],
      wall: [],
      hunIndicator: null,
      hunTiles: [],
      currentSeat: 0,
      phase: 'setup',
      lastDiscard: null,
      lastDiscardSeat: null,
      winner: null,
      winPattern: null,
      dealerSeat: 0,
    };
    expect(state.id).toBe('game-1');
    expect(state.phase).toBe('setup');
    expect(state.hunIndicator).toBeNull();
    expect(state.winner).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ActionType union
// ---------------------------------------------------------------------------
describe('ActionType', () => {
  it('accepts all valid values', () => {
    const validActions: ActionType[] = [
      'discard',
      'pong',
      'ming-kong',
      'an-kong',
      'bu-kong',
      'jin-kong',
      'win',
    ];
    expect(validActions).toHaveLength(7);
    expect(new Set(validActions).size).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// PlayerAction
// ---------------------------------------------------------------------------
describe('PlayerAction', () => {
  it('is structurally correct for discard', () => {
    const action: PlayerAction = {
      type: 'discard',
      tileIndex: 3,
    };
    expect(action.type).toBe('discard');
    expect(action.tileIndex).toBe(3);
  });

  it('allows tileIndex to be undefined for non-discard actions', () => {
    const action: PlayerAction = { type: 'win' };
    expect(action.type).toBe('win');
    expect(action.tileIndex).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PatternResult
// ---------------------------------------------------------------------------
describe('PatternResult', () => {
  it('is structurally correct', () => {
    const result: PatternResult = {
      patternName: '十三幺',
      description: 'Thirteen orphans',
    };
    expect(result.patternName).toBe('十三幺');
    expect(result.description).toBe('Thirteen orphans');
  });
});

// ---------------------------------------------------------------------------
// PatternChecker
// ---------------------------------------------------------------------------
describe('PatternChecker', () => {
  it('is structurally correct and callable', () => {
    const alwaysWin: PatternChecker = {
      name: 'always-win',
      check: (_hand, _context) => ({
        patternName: 'always-win',
        description: 'Always wins for testing',
      }),
    };

    expect(alwaysWin.name).toBe('always-win');

    const result = alwaysWin.check([], { hunTiles: [] });
    expect(result).not.toBeNull();
    expect(result!.patternName).toBe('always-win');
  });

  it('returns null for no match', () => {
    const neverWin: PatternChecker = {
      name: 'never-win',
      check: (_hand, _context) => null,
    };

    const result = neverWin.check([], { hunTiles: [] });
    expect(result).toBeNull();
  });
});
