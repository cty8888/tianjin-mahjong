// ---------------------------------------------------------------------------
// Game state management for Tianjin Mahjong (天津麻将)
// Game creation, dealing, hun determination, and state helpers.
// ---------------------------------------------------------------------------

import type { Tile, Player, GameState, Suit } from './types';
import { createTiles, getNextTileInSequence } from './tile';
import { shuffleWall, flipHunIndicator } from './deck';

// ---------------------------------------------------------------------------
// Suit sort order: wan < tiao < tong < feng < jian
// ---------------------------------------------------------------------------

const SUIT_ORDER: Record<Suit, number> = {
  wan: 0,
  tiao: 1,
  tong: 2,
  feng: 3,
  jian: 4,
};

// ---------------------------------------------------------------------------
// sortHand
// ---------------------------------------------------------------------------

/**
 * Sort a hand of tiles: wan < tiao < tong < feng < jian, then ascending rank
 * within each suit. Returns a new array; does not mutate the input.
 */
export function sortHand(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    // 混儿 always first
    if (a.isHun && !b.isHun) return -1;
    if (!a.isHun && b.isHun) return 1;
    // Both hun or both non-hun: sort by suit then rank
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return a.rank - b.rank;
  });
}

// ---------------------------------------------------------------------------
// getNextSeat
// ---------------------------------------------------------------------------

/**
 * Return the next seat counter-clockwise. Wraps around from
 * playerCount-1 back to 0.
 */
export function getNextSeat(current: number, playerCount: number): number {
  return (current + 1) % playerCount;
}

// ---------------------------------------------------------------------------
// determineHunTilesFromIndicator
// ---------------------------------------------------------------------------

/**
 * Determine the 7 hun (混儿) tiles from the indicator tile.
 *
 * Rules:
 *   - 3 copies of the indicator tile (the same suit+rank)
 *   - 4 copies of the next tile in the cyclic sequence
 *   - The indicator itself (the flipped tile) is NOT included
 *
 * Returns exactly 7 tiles selected from `allTiles`.
 */
export function determineHunTilesFromIndicator(
  indicator: Tile,
  allTiles: Tile[],
): Tile[] {
  const nextType = getNextTileInSequence(indicator);

  // Find 3 copies of the indicator type (excluding the flipped indicator itself)
  const indicatorCopies = allTiles.filter(
    (t) => t.suit === indicator.suit && t.rank === indicator.rank && t.id !== indicator.id,
  );

  // Find 4 copies of the next sequence type
  const nextCopies = allTiles.filter(
    (t) => t.suit === nextType.suit && t.rank === nextType.rank,
  );

  return [...indicatorCopies.slice(0, 3), ...nextCopies.slice(0, 4)];
}

// ---------------------------------------------------------------------------
// markHunTiles
// ---------------------------------------------------------------------------

/**
 * Mark tiles as 混儿 (isHun = true) in place by matching suit+rank.
 * Mutates the input array.
 */
export function markHunTiles(tiles: Tile[], hunTiles: Tile[]): void {
  for (const tile of tiles) {
    if (hunTiles.some((h) => h.suit === tile.suit && h.rank === tile.rank && h.id === tile.id)) {
      tile.isHun = true;
    }
  }
}

// ---------------------------------------------------------------------------
// dealTiles
// ---------------------------------------------------------------------------

/**
 * Deal tiles to all players from the wall.
 *
 * 13 rounds: each player gets 1 tile per round.
 * Then the dealer gets 1 extra tile (total 14).
 *
 * Returns the updated game state with hands populated and wall reduced.
 * Mutates the game state in place (hands and wall).
 */
export function dealTiles(game: GameState): GameState {
  const { players, wall } = game;
  const playerCount = players.length;

  // 13 rounds: each player gets 1 tile per round
  for (let round = 0; round < 13; round++) {
    for (let p = 0; p < playerCount; p++) {
      const tile = wall.shift()!;
      players[p].hand.push(tile);
    }
  }

  // Dealer gets 1 extra tile
  const dealerTile = wall.shift()!;
  players[game.dealerSeat].hand.push(dealerTile);

  return game;
}

// ---------------------------------------------------------------------------
// createGame
// ---------------------------------------------------------------------------

let gameIdCounter = 0;

/**
 * Create and initialize a complete Tianjin Mahjong game.
 *
 * Pipeline:
 *   1. Create 136 tiles, shuffle
 *   2. Flip last tile as hun indicator
 *   3. Determine 7 hun tiles
 *   4. Mark hun tiles in wall
 *   5. Random dealer seat
 *   6. Create players (seat 0 = human, rest = AI)
 *   7. Deal tiles (dealer gets 14, others 13)
 *   8. Sort all hands
 *   9. Set phase to 'playing'
 *  10. Generate unique ID
 *
 * Throws if playerCount is not 2-4.
 */
export function createGame(playerCount: number): GameState {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`playerCount must be 2-4, got ${playerCount}`);
  }

  // 1. Create 136 tiles, shuffle, then flip indicator
  const allTiles = createTiles();
  const shuffled = shuffleWall(allTiles);
  const { indicator, remaining } = flipHunIndicator(shuffled);

  // The indicator should never be null (we just shuffled 136 tiles)
  const hunIndicator = indicator!;

  // 2. Determine 7 hun tiles from the full tile set
  const hunTiles = determineHunTilesFromIndicator(hunIndicator, allTiles);

  // 3. Mark hun tiles in the wall (only those still in the wall)
  markHunTiles(remaining, hunTiles);

  // 4. Random dealer seat
  const dealerSeat = Math.floor(Math.random() * playerCount);

  // 5. Create players (seat 0 = human, rest = AI)
  const players: Player[] = [];
  for (let seat = 0; seat < playerCount; seat++) {
    players.push({
      seat,
      hand: [],
      discards: [],
      melds: [],
      isHuman: seat === 0,
    });
  }

  // 6. Assemble initial game state
  const gameId = `game-${Date.now()}-${++gameIdCounter}`;

  const game: GameState = {
    id: gameId,
    players,
    wall: remaining,
    hunIndicator,
    hunTiles: hunTiles.map((t) => ({
      suit: t.suit,
      rank: t.rank,
      id: t.id,
      isHun: true,
    })),
    currentSeat: dealerSeat,
    phase: 'playing',
    lastDiscard: null,
    lastDiscardSeat: null,
    winner: null,
    winPattern: null,
    dealerSeat,
  };

  // 7. Deal tiles
  dealTiles(game);

  // 8. Sort all hands
  for (const player of game.players) {
    player.hand = sortHand(player.hand);
  }

  return game;
}
