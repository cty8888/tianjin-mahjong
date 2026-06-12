// ---------------------------------------------------------------------------
// Game orchestration service for Tianjin Mahjong (天津麻将)
// Task 9 — Core game logic: creation, state retrieval, action handling,
// and AI turn processing.
// ---------------------------------------------------------------------------

import {
  createGame,
  sortHand,
  getNextSeat,
  drawTile,
  drawReplacementTile,
  checkWin,
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
  aiDecideDiscard,
  aiDecideResponse,
  PatternRegistry,
  fourTripletsPairChecker,
  type GameState,
  type Player,
  type PlayerAction,
  type Tile,
  type PatternResult,
} from '@tj-mahjong/shared';

// ---------------------------------------------------------------------------
// In-memory game store & pattern registry
// ---------------------------------------------------------------------------

const games = new Map<string, GameState>();

const patternRegistry = new PatternRegistry();
patternRegistry.register(fourTripletsPairChecker);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function createNewGame(playerCount: number): GameState {
  const game = createGame(playerCount);
  games.set(game.id, game);

  // If the dealer is AI, process their turn immediately
  if (!game.players[game.currentSeat].isHuman) {
    processAITurns(game);
  }

  return game;
}

export function getGame(id: string): GameState | undefined {
  return games.get(id);
}

export function getActions(
  game: GameState,
): {
  canPong: boolean;
  canMingKong: boolean;
  canAnKong: boolean;
  canBuKong: boolean;
  canJinKong: boolean;
  canWin: boolean;
  legalDiscardIndices: number[];
} | null {
  const player = game.players[game.currentSeat];

  // Check if it's the player's turn and the game is still playing
  if (game.phase !== 'playing') return null;

  const result = {
    canPong: false,
    canMingKong: false,
    canAnKong: false,
    canBuKong: false,
    canJinKong: false,
    canWin: false,
    legalDiscardIndices: [] as number[],
  };

  const lastDiscard = game.lastDiscard;
  const isOwnDiscard = lastDiscard !== null && game.lastDiscardSeat === game.currentSeat;

  if (lastDiscard !== null && !isOwnDiscard) {
    // Someone else discarded: check response options (pong, ming-kong, win not allowed on discard in Tianjin)
    result.canPong = canPong(player, lastDiscard);
    result.canMingKong = canMingKong(player, lastDiscard);
    // Tianjin Mahjong: only self-draw win, no win on discard
    result.canWin = false;
  } else {
    // Own turn (self-draw win, an-kong, bu-kong, jin-kong, discard)
    // Check self-draw win (player has 14 cards on their own turn)
    const winResult = checkWin(player.hand, game.hunTiles, patternRegistry);
    result.canWin = winResult !== null;

    // An-kong: 4 of a kind in hand
    result.canAnKong = canAnKong(player).length > 0;

    // Bu-kong: promote existing pong
    result.canBuKong = canBuKong(player) !== null;

    // Jin-kong: 4 hun tiles
    result.canJinKong = canJinKong(player).length > 0;

    // Legal discards (non-hun tiles)
    result.legalDiscardIndices = getLegalDiscards(player).map((tile) =>
      player.hand.findIndex(
        (h) =>
          h.suit === tile.suit &&
          h.rank === tile.rank &&
          h.id === tile.id,
      ),
    ).filter((idx) => idx >= 0);
  }

  return result;
}

export function applyAction(game: GameState, action: PlayerAction): { error?: string; message?: string } {
  const player = game.players[game.currentSeat];

  // Validate the action
  const validation = validateAction(game, action);
  if (validation !== null) {
    return validation;
  }

  switch (action.type) {
    case 'discard': {
      const tileIndex = action.tileIndex!;
      const discardedTile = player.hand.splice(tileIndex, 1)[0];

      player.discards.push(discardedTile);
      game.lastDiscard = discardedTile;
      game.lastDiscardSeat = game.currentSeat;

      // After player's own discard, move to next seat; don't check for responses
      // on own discard (own discard has no pong/kong for the discarder)
      game.currentSeat = getNextSeat(game.currentSeat, game.players.length);

      // Check if anyone wants to respond to this discard
      const responder = findResponder(game, discardedTile, game.lastDiscardSeat, game.currentSeat);
      if (responder !== null) {
        if (game.players[responder].isHuman) {
          // Human: wait for their response
          // currentSeat already set to next seat above; keep it there
          // Reset currentSeat to the responder for the actions API
          game.currentSeat = responder;
        } else {
          // AI: auto-decide and apply
          game.currentSeat = responder;
          applyAIResponse(game, game.players[responder], discardedTile);
        }
      } else {
        // No one responds, process AI turns if needed
        processAITurns(game);
      }
      break;
    }

    case 'pong': {
      const discardTile = game.lastDiscard!;
      performPong(player, discardTile);
      player.hand = sortHand(player.hand);
      game.lastDiscard = null;
      game.lastDiscardSeat = null;
      game.currentSeat = player.seat;
      processAITurns(game);
      break;
    }

    case 'ming-kong': {
      const discardTile = game.lastDiscard!;
      performMingKong(player, discardTile);

      // Draw replacement tile from wall tail
      const drawResult = drawReplacementTile(game.wall);
      if (drawResult.tile) {
        game.wall = drawResult.remaining;
        player.hand.push(drawResult.tile);
        player.hand = sortHand(player.hand);
      }

      game.lastDiscard = null;
      game.lastDiscardSeat = null;
      game.currentSeat = player.seat;
      processAITurns(game);
      break;
    }

    case 'an-kong': {
      const kongTiles = canAnKong(player);
      performAnKong(player, kongTiles);

      // Draw replacement tile from wall tail
      const drawResult = drawReplacementTile(game.wall);
      if (drawResult.tile) {
        game.wall = drawResult.remaining;
        player.hand.push(drawResult.tile);
        player.hand = sortHand(player.hand);
      }

      game.currentSeat = player.seat;
      processAITurns(game);
      break;
    }

    case 'bu-kong': {
      const buKongResult = canBuKong(player)!;
      performBuKong(player, buKongResult.pongMeldIndex, buKongResult.tile);

      // Draw replacement tile from wall tail
      const drawResult = drawReplacementTile(game.wall);
      if (drawResult.tile) {
        game.wall = drawResult.remaining;
        player.hand.push(drawResult.tile);
        player.hand = sortHand(player.hand);
      }

      game.currentSeat = player.seat;
      processAITurns(game);
      break;
    }

    case 'jin-kong': {
      const hunTiles = canJinKong(player);
      // Jin-kong: remove 4 hun tiles from hand and create meld
      const removed: Tile[] = [];
      for (const target of hunTiles) {
        const idx = player.hand.findIndex((t) => t.id === target.id);
        if (idx !== -1) {
          removed.push(player.hand.splice(idx, 1)[0]);
        }
      }
      player.melds.push({
        type: 'jin-kong',
        tiles: removed,
      });

      // Draw replacement tile from wall tail
      const drawResult = drawReplacementTile(game.wall);
      if (drawResult.tile) {
        game.wall = drawResult.remaining;
        player.hand.push(drawResult.tile);
        player.hand = sortHand(player.hand);
      }

      game.currentSeat = player.seat;
      processAITurns(game);
      break;
    }

    case 'win': {
      // Self-draw win
      const winResult = checkWin(player.hand, game.hunTiles, patternRegistry);
      if (!winResult) {
        return { error: 'INVALID_ACTION', message: 'Hand is not a winning hand' };
      }
      game.winner = game.currentSeat;
      game.winPattern = winResult.patternName;
      game.phase = 'finished';
      break;
    }
  }

  return {};
}

// ---------------------------------------------------------------------------
// AI turn processing
// ---------------------------------------------------------------------------

function processAITurns(game: GameState): void {
  const maxIterations = 100; // safety valve
  let iterations = 0;

  while (
    game.phase === 'playing' &&
    !game.players[game.currentSeat].isHuman &&
    iterations < maxIterations
  ) {
    doAITurn(game);
    iterations++;
  }

  // If it's now a human's turn and they haven't drawn yet (hand matches expected
  // pre-draw size), draw a tile for them automatically.
  if (
    game.phase === 'playing' &&
    game.players[game.currentSeat].isHuman
  ) {
    // Human should have 14 tiles on their turn (13 + drawn)
    // If they have 13, they haven't drawn yet — auto-draw
    if (game.players[game.currentSeat].hand.length === 13) {
      const drawResult = drawTile(game.wall);
      if (drawResult.tile) {
        game.wall = drawResult.remaining;
        game.players[game.currentSeat].hand.push(drawResult.tile);
        game.players[game.currentSeat].hand = sortHand(
          game.players[game.currentSeat].hand,
        );
        game.lastDiscard = null;
        game.lastDiscardSeat = null;
      } else {
        game.phase = 'finished';
      }
    }
  }
}

function doAITurn(game: GameState): void {
  const player = game.players[game.currentSeat];

  // 1. Draw tile from wall head
  const drawResult = drawTile(game.wall);
  if (!drawResult.tile) {
    // Wall empty, game ends in draw (no winner for now, just mark finished)
    game.phase = 'finished';
    return;
  }
  game.wall = drawResult.remaining;
  player.hand.push(drawResult.tile);
  player.hand = sortHand(player.hand);

  // Clear previous lastDiscard for the AI's own turn
  game.lastDiscard = null;
  game.lastDiscardSeat = null;

  // 2. Check self-draw win
  const winResult = checkWin(player.hand, game.hunTiles, patternRegistry);
  if (winResult !== null) {
    game.winner = game.currentSeat;
    game.winPattern = winResult.patternName;
    game.phase = 'finished';
    return;
  }

  // 3. Check for an-kong, bu-kong, jin-kong on own turn (AI auto-does these)
  // An-kong
  const anKongTiles = canAnKong(player);
  if (anKongTiles.length > 0) {
    performAnKong(player, anKongTiles);
    const repl = drawReplacementTile(game.wall);
    if (repl.tile) {
      game.wall = repl.remaining;
      player.hand.push(repl.tile);
      player.hand = sortHand(player.hand);
    }
    // After kong, check win again
    const winAfterKong = checkWin(player.hand, game.hunTiles, patternRegistry);
    if (winAfterKong !== null) {
      game.winner = game.currentSeat;
      game.winPattern = winAfterKong.patternName;
      game.phase = 'finished';
      return;
    }
  }

  // Bu-kong
  const buKongInfo = canBuKong(player);
  if (buKongInfo !== null) {
    performBuKong(player, buKongInfo.pongMeldIndex, buKongInfo.tile);
    const repl = drawReplacementTile(game.wall);
    if (repl.tile) {
      game.wall = repl.remaining;
      player.hand.push(repl.tile);
      player.hand = sortHand(player.hand);
    }
    const winAfterKong = checkWin(player.hand, game.hunTiles, patternRegistry);
    if (winAfterKong !== null) {
      game.winner = game.currentSeat;
      game.winPattern = winAfterKong.patternName;
      game.phase = 'finished';
      return;
    }
  }

  // Jin-kong
  const jinKongTiles = canJinKong(player);
  if (jinKongTiles.length > 0) {
    const removed: Tile[] = [];
    for (const target of jinKongTiles) {
      const idx = player.hand.findIndex((t) => t.id === target.id);
      if (idx !== -1) {
        removed.push(player.hand.splice(idx, 1)[0]);
      }
    }
    player.melds.push({ type: 'jin-kong', tiles: removed });
    const repl = drawReplacementTile(game.wall);
    if (repl.tile) {
      game.wall = repl.remaining;
      player.hand.push(repl.tile);
      player.hand = sortHand(player.hand);
    }
    const winAfterKong = checkWin(player.hand, game.hunTiles, patternRegistry);
    if (winAfterKong !== null) {
      game.winner = game.currentSeat;
      game.winPattern = winAfterKong.patternName;
      game.phase = 'finished';
      return;
    }
  }

  // 4. AI chooses a tile to discard
  const discardIndex = aiDecideDiscard(player);
  const discardedTile = player.hand.splice(discardIndex, 1)[0];
  player.discards.push(discardedTile);
  game.lastDiscard = discardedTile;
  game.lastDiscardSeat = game.currentSeat;

  // 5. Move to next seat
  const nextSeat = getNextSeat(game.currentSeat, game.players.length);

  // 6. Check if any player can respond to this discard (starting from nextSeat,
  //    iterating around the table but skipping the discarder)
  const responder = findResponder(game, discardedTile, game.lastDiscardSeat, nextSeat);
  if (responder !== null) {
    if (game.players[responder].isHuman) {
      // Human: stop AI processing, let them respond
      game.currentSeat = responder;
    } else {
      // AI responder: auto-decide
      game.currentSeat = responder;
      applyAIResponse(game, game.players[responder], discardedTile);
    }
  } else {
    // No one responds, continue to next seat
    game.currentSeat = nextSeat;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateAction(
  game: GameState,
  action: PlayerAction,
): { error: string; message: string } | null {
  if (game.phase !== 'playing') {
    return { error: 'INVALID_ACTION', message: 'Game is not in playing phase' };
  }

  const player = game.players[game.currentSeat];

  switch (action.type) {
    case 'discard': {
      if (action.tileIndex === undefined || action.tileIndex < 0 || action.tileIndex >= player.hand.length) {
        return { error: 'INVALID_ACTION', message: 'Invalid tile index' };
      }
      const tile = player.hand[action.tileIndex];
      if (tile.isHun) {
        return { error: 'INVALID_ACTION', message: '混儿 cannot be discarded' };
      }
      // Cannot discard on another player's discard (must respond or draw first)
      break;
    }

    case 'pong': {
      if (!game.lastDiscard || game.lastDiscardSeat === null) {
        return { error: 'INVALID_ACTION', message: 'No discard to pong' };
      }
      if (!canPong(player, game.lastDiscard)) {
        return { error: 'INVALID_ACTION', message: 'Cannot pong' };
      }
      break;
    }

    case 'ming-kong': {
      if (!game.lastDiscard || game.lastDiscardSeat === null) {
        return { error: 'INVALID_ACTION', message: 'No discard to ming-kong' };
      }
      if (!canMingKong(player, game.lastDiscard)) {
        return { error: 'INVALID_ACTION', message: 'Cannot ming-kong' };
      }
      break;
    }

    case 'an-kong': {
      if (canAnKong(player).length === 0) {
        return { error: 'INVALID_ACTION', message: 'Cannot an-kong' };
      }
      break;
    }

    case 'bu-kong': {
      if (canBuKong(player) === null) {
        return { error: 'INVALID_ACTION', message: 'Cannot bu-kong' };
      }
      break;
    }

    case 'jin-kong': {
      if (canJinKong(player).length === 0) {
        return { error: 'INVALID_ACTION', message: 'Cannot jin-kong' };
      }
      break;
    }

    case 'win': {
      const winResult = checkWin(player.hand, game.hunTiles, patternRegistry);
      if (!winResult) {
        return { error: 'INVALID_ACTION', message: 'Hand is not a winning hand' };
      }
      break;
    }

    default:
      return { error: 'INVALID_ACTION', message: `Unknown action type: ${action.type}` };
  }

  return null;
}

/**
 * Check all players around the table (starting from startSeat, skipping the discarder)
 * to see if anyone can pong or ming-kong the discard. Returns the seat of the first
 * player who can respond, or null if no one can.
 *
 * Priority: earlier in turn order gets first chance.
 */
function findResponder(
  game: GameState,
  discardTile: Tile,
  discarderSeat: number,
  startSeat: number,
): number | null {
  const playerCount = game.players.length;
  let current = startSeat;

  for (let i = 0; i < playerCount - 1; i++) {
    if (current === discarderSeat) {
      current = getNextSeat(current, playerCount);
      continue;
    }

    const player = game.players[current];
    if (canPong(player, discardTile) || canMingKong(player, discardTile)) {
      return current;
    }

    current = getNextSeat(current, playerCount);
  }

  return null;
}

function applyAIResponse(game: GameState, player: Player, discardTile: Tile): void {
  const decision = aiDecideResponse(player, discardTile);

  if (decision === 'ming-kong') {
    performMingKong(player, discardTile);
    const repl = drawReplacementTile(game.wall);
    if (repl.tile) {
      game.wall = repl.remaining;
      player.hand.push(repl.tile);
      player.hand = sortHand(player.hand);
    }
    game.lastDiscard = null;
    game.lastDiscardSeat = null;
    game.currentSeat = player.seat;
    // After AI kong, check win and continue AI turns
    const winResult = checkWin(player.hand, game.hunTiles, patternRegistry);
    if (winResult !== null) {
      game.winner = player.seat;
      game.winPattern = winResult.patternName;
      game.phase = 'finished';
      return;
    }
    processAITurns(game);
  } else if (decision === 'pong') {
    performPong(player, discardTile);
    player.hand = sortHand(player.hand);
    game.lastDiscard = null;
    game.lastDiscardSeat = null;
    game.currentSeat = player.seat;
    processAITurns(game);
  } else {
    // AI passes — continue scanning for the next responder in priority order
    // The discarder and this player have already been checked; scan remaining seats
    processRemainingResponders(game, discardTile, player.seat);
  }
}

/**
 * Continue scanning for responders after one player has already passed.
 * Scans all remaining seats (excluding the discarder and the already-checked player)
 * in priority order.
 */
function processRemainingResponders(
  game: GameState,
  discardTile: Tile,
  alreadyCheckedSeat: number,
): void {
  const playerCount = game.players.length;
  const discarderSeat = game.lastDiscardSeat!;

  // Start from the seat after the one that just passed
  let current = getNextSeat(alreadyCheckedSeat, playerCount);

  // Scan all remaining seats (total seats - discarder - already checked)
  for (let i = 0; i < playerCount - 2; i++) {
    // Skip the discarder
    if (current === discarderSeat) {
      current = getNextSeat(current, playerCount);
      continue;
    }

    const p = game.players[current];
    if (canPong(p, discardTile) || canMingKong(p, discardTile)) {
      if (p.isHuman) {
        game.currentSeat = current;
        return;
      } else {
        game.currentSeat = current;
        applyAIResponse(game, p, discardTile);
        // applyAIResponse may have changed game state (phase finished, or AI claimed it)
        // If this response consumed the discard (pong/kong), lastDiscard is now null
        if (game.lastDiscard === null || game.phase === 'finished') {
          return;
        }
        // Otherwise this AI also passed, and processRemainingResponders was called
        // recursively — return so we don't double-scan
        return;
      }
    }

    current = getNextSeat(current, playerCount);
  }

  // No one responded; advance to the seat after the discarder's successor
  game.currentSeat = getNextSeat(discarderSeat, playerCount);
  processAITurns(game);
}

// Export for testing
export { patternRegistry };
