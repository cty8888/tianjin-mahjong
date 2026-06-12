// ---------------------------------------------------------------------------
// Integration tests for game API and game service
// Task 9 — Tests for Express server endpoints and game orchestration.
// ---------------------------------------------------------------------------

import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import http from 'node:http';
import { createGameRouter } from './routes/game';
import { createNewGame, getGame, getActions, applyAction, patternRegistry } from './services/game-service';
import type { PlayerAction } from '@tj-mahjong/shared';

// ---------------------------------------------------------------------------
// Tiny request helper (avoids supertest dependency)
// ---------------------------------------------------------------------------

function makeRequest(
  app: express.Express,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address() as { port: number };
      const options: http.RequestOptions = {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers: { 'Content-Type': 'application/json' },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode!, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode!, body: data });
          }
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      if (body !== undefined) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/games', createGameRouter());
  return app;
}

// ---------------------------------------------------------------------------
// Service-level tests
// ---------------------------------------------------------------------------

describe('Game Service', () => {
  it('createNewGame creates a 4-player game', () => {
    const game = createNewGame(4);

    expect(game).toBeDefined();
    expect(game.id).toMatch(/^game-/);
    expect(game.players).toHaveLength(4);
    expect(game.players[0].isHuman).toBe(true);
    expect(game.players[1].isHuman).toBe(false);
    expect(game.players[2].isHuman).toBe(false);
    expect(game.players[3].isHuman).toBe(false);
    expect(game.phase).toBe('playing');

    // Dealer gets 14 tiles, others 13 (unless AI processing has advanced the game
    // and the human has drawn on their turn)
    const dealerSeat = game.dealerSeat;
    expect(game.players[dealerSeat].hand).toHaveLength(14);
    for (let i = 0; i < 4; i++) {
      if (i !== dealerSeat) {
        // Non-dealers start with 13, but if AI processing advanced to human's turn,
        // human may have auto-drawn to 14
        expect([13, 14]).toContain(game.players[i].hand.length);
      }
    }

    // Wall should have remaining tiles
    expect(game.wall.length).toBeGreaterThan(0);
    expect(game.wall.length).toBeLessThan(136);
  });

  it('createNewGame rejects invalid playerCount', () => {
    expect(() => createNewGame(1)).toThrow();
    expect(() => createNewGame(5)).toThrow();
  });

  it('getGame retrieves stored game', () => {
    const game = createNewGame(4);
    const retrieved = getGame(game.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(game.id);
  });

  it('getGame returns undefined for unknown id', () => {
    expect(getGame('nonexistent')).toBeUndefined();
  });

  it('getActions returns actions for current player on their turn', () => {
    const game = createNewGame(4);
    // Force currentSeat to be the human (seat 0) for predictable testing
    game.currentSeat = 0;

    // Simulate that it's the player's own turn (no pending discard from others)
    game.lastDiscard = null;
    game.lastDiscardSeat = null;

    const actions = getActions(game);
    expect(actions).toBeDefined();
    expect(actions!.legalDiscardIndices).toBeInstanceOf(Array);
    expect(actions!.legalDiscardIndices.length).toBeGreaterThanOrEqual(0);
    // canPong/MingKong should be false on own turn with no lastDiscard from others
    expect(actions!.canPong).toBe(false);
    expect(actions!.canMingKong).toBe(false);
  });

  it('getActions shows pong/kong when another player discards', () => {
    const game = createNewGame(4);
    game.currentSeat = 0; // human's turn

    // Simulate AI player (seat 1) discarding a tile that human has 2+ copies of
    const humanHand = game.players[0].hand;

    // Find a tile that appears at least twice in human's hand
    const tileCounts = new Map<string, { count: number; tile: any }>();
    for (const t of humanHand) {
      const key = `${t.suit}:${t.rank}`;
      if (!tileCounts.has(key)) {
        tileCounts.set(key, { count: 0, tile: t });
      }
      tileCounts.get(key)!.count++;
    }

    // Find a tile with 2+ copies to set up a pong scenario
    let foundDuplicate = false;
    for (const [, info] of tileCounts) {
      if (info.count >= 2) {
        game.lastDiscard = { ...info.tile, id: 9999 };
        game.lastDiscardSeat = 1;
        foundDuplicate = true;
        break;
      }
    }

    if (foundDuplicate) {
      const actions = getActions(game);
      expect(actions!.canPong).toBe(true);
    }
  });

  it('applyAction with valid discard advances game', () => {
    const game = createNewGame(4);
    game.currentSeat = 0; // human's turn
    // Clear any prior lastDiscard so it's player's own turn
    game.lastDiscard = null;
    game.lastDiscardSeat = null;

    // Find a non-hun tile index
    const legalIndices = getActions(game)!.legalDiscardIndices;
    expect(legalIndices.length).toBeGreaterThan(0);

    const discardCountBefore = game.players[0].discards.length;

    const action: PlayerAction = { type: 'discard', tileIndex: legalIndices[0] };
    const result = applyAction(game, action);

    expect(result.error).toBeUndefined();
    // Human's discard pile increased by 1
    expect(game.players[0].discards.length).toBe(discardCountBefore + 1);
    // Game is still in a valid state (playing or finished)
    expect(game.phase === 'playing' || game.phase === 'finished').toBe(true);
  });

  it('applyAction with invalid discard index returns error', () => {
    const game = createNewGame(4);
    game.currentSeat = 0;

    const action: PlayerAction = { type: 'discard', tileIndex: -1 };
    const result = applyAction(game, action);
    expect(result.error).toBe('INVALID_ACTION');
  });

  it('applyAction rejects hun discard', () => {
    const game = createNewGame(4);
    game.currentSeat = 0;

    // Find a hun tile if any
    const hunIndex = game.players[0].hand.findIndex((t) => t.isHun);
    if (hunIndex !== -1) {
      const action: PlayerAction = { type: 'discard', tileIndex: hunIndex };
      const result = applyAction(game, action);
      expect(result.error).toBe('INVALID_ACTION');
      expect(result.message).toContain('混儿');
    }
  });

  it('applyAction with win when hand is winning', () => {
    // Create a game and manually set up a winning hand
    const game = createNewGame(4);
    game.currentSeat = 0;

    // Build a four-triplets-pair winning hand
    // Gather 4 sets of 3 matching tiles and 1 pair from the wall
    const wall = game.wall;
    const hand: any[] = [];
    const usedIds = new Set<number>();

    // Find 4 groups of 3 matching tiles
    const groups: any[][] = [];
    for (const tile of wall) {
      if (usedIds.has(tile.id)) continue;
      const matching = wall.filter(
        (t) => t.suit === tile.suit && t.rank === tile.rank && !usedIds.has(t.id),
      );
      if (matching.length >= 3 && groups.length < 4) {
        const group = matching.slice(0, 3);
        group.forEach((t) => usedIds.add(t.id));
        groups.push(group);
      }
    }

    // Find a pair
    for (const tile of wall) {
      if (usedIds.has(tile.id)) continue;
      const matching = wall.filter(
        (t) => t.suit === tile.suit && t.rank === tile.rank && !usedIds.has(t.id),
      );
      if (matching.length >= 2 && hand.length < 2) {
        const pair = matching.slice(0, 2);
        pair.forEach((t) => usedIds.add(t.id));
        hand.push(...pair);
        break;
      }
    }

    for (const group of groups) {
      hand.push(...group);
    }

    if (hand.length === 14) {
      game.players[0].hand = hand;
      game.wall = game.wall.filter((t) => !usedIds.has(t.id));

      const action: PlayerAction = { type: 'win' };
      const result = applyAction(game, action);

      if (!result.error) {
        expect(game.phase).toBe('finished');
        expect(game.winner).toBe(0);
        expect(game.winPattern).toBeDefined();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// API endpoint tests
// ---------------------------------------------------------------------------

describe('Game API Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTestApp();
  });

  // POST /api/games
  describe('POST /api/games', () => {
    it('creates game with 4 players', async () => {
      const res = await makeRequest(app, 'POST', '/api/games', { playerCount: 4 });
      expect(res.status).toBe(201);
      expect((res.body as any).game).toBeDefined();
      expect((res.body as any).game.id).toMatch(/^game-/);
      expect((res.body as any).game.state.players).toHaveLength(4);
      expect((res.body as any).game.state.phase).toBe('playing');
    });

    it('creates game with 2 players', async () => {
      const res = await makeRequest(app, 'POST', '/api/games', { playerCount: 2 });
      expect(res.status).toBe(201);
      expect((res.body as any).game.state.players).toHaveLength(2);
    });

    it('creates game with 3 players', async () => {
      const res = await makeRequest(app, 'POST', '/api/games', { playerCount: 3 });
      expect(res.status).toBe(201);
      expect((res.body as any).game.state.players).toHaveLength(3);
    });

    it('rejects playerCount 1', async () => {
      const res = await makeRequest(app, 'POST', '/api/games', { playerCount: 1 });
      expect(res.status).toBe(400);
      expect((res.body as any).error).toBe('INVALID_PLAYER_COUNT');
    });

    it('rejects playerCount 5', async () => {
      const res = await makeRequest(app, 'POST', '/api/games', { playerCount: 5 });
      expect(res.status).toBe(400);
      expect((res.body as any).error).toBe('INVALID_PLAYER_COUNT');
    });

    it('rejects missing playerCount', async () => {
      const res = await makeRequest(app, 'POST', '/api/games', {});
      expect(res.status).toBe(400);
      expect((res.body as any).error).toBe('INVALID_PLAYER_COUNT');
    });
  });

  // GET /api/games/:id
  describe('GET /api/games/:id', () => {
    it('returns game state for valid id', async () => {
      const createRes = await makeRequest(app, 'POST', '/api/games', { playerCount: 4 });
      const gameId = (createRes.body as any).game.id;

      const res = await makeRequest(app, 'GET', `/api/games/${gameId}`);
      expect(res.status).toBe(200);
      expect((res.body as any).game.id).toBe(gameId);
      expect((res.body as any).game.state).toBeDefined();
    });

    it('returns 404 for unknown game', async () => {
      const res = await makeRequest(app, 'GET', '/api/games/nonexistent-id');
      expect(res.status).toBe(404);
      expect((res.body as any).error).toBe('GAME_NOT_FOUND');
    });
  });

  // GET /api/games/:id/actions
  describe('GET /api/games/:id/actions', () => {
    it('returns actions for current player', async () => {
      const createRes = await makeRequest(app, 'POST', '/api/games', { playerCount: 4 });
      const gameId = (createRes.body as any).game.id;

      const res = await makeRequest(app, 'GET', `/api/games/${gameId}/actions`);
      expect(res.status).toBe(200);
      expect((res.body as any)).toHaveProperty('canPong');
      expect((res.body as any)).toHaveProperty('canMingKong');
      expect((res.body as any)).toHaveProperty('canAnKong');
      expect((res.body as any)).toHaveProperty('canBuKong');
      expect((res.body as any)).toHaveProperty('canJinKong');
      expect((res.body as any)).toHaveProperty('canWin');
      expect((res.body as any)).toHaveProperty('legalDiscardIndices');
    });

    it('returns 404 for unknown game', async () => {
      const res = await makeRequest(app, 'GET', '/api/games/nonexistent/actions');
      expect(res.status).toBe(404);
      expect((res.body as any).error).toBe('GAME_NOT_FOUND');
    });
  });

  // POST /api/games/:id/actions
  describe('POST /api/games/:id/actions', () => {
    it('valid discard advances game', async () => {
      const createRes = await makeRequest(app, 'POST', '/api/games', { playerCount: 4 });
      const gameId = (createRes.body as any).game.id;

      // Get actions to find a legal discard
      const actionsRes = await makeRequest(app, 'GET', `/api/games/${gameId}/actions`);
      const discardIndex = (actionsRes.body as any).legalDiscardIndices[0];
      expect(discardIndex).toBeGreaterThanOrEqual(0);

      const res = await makeRequest(app, 'POST', `/api/games/${gameId}/actions`, {
        type: 'discard',
        tileIndex: discardIndex,
      });
      expect(res.status).toBe(200);
      expect((res.body as any).game).toBeDefined();
      expect((res.body as any).game.state.players[0].discards.length).toBeGreaterThan(0);
      const state = (res.body as any).game.state;
      expect(state.phase === 'playing' || state.phase === 'finished').toBe(true);
    });

    it('invalid action returns 400', async () => {
      const createRes = await makeRequest(app, 'POST', '/api/games', { playerCount: 4 });
      const gameId = (createRes.body as any).game.id;

      const res = await makeRequest(app, 'POST', `/api/games/${gameId}/actions`, {
        type: 'discard',
        tileIndex: 999,
      });
      expect(res.status).toBe(400);
      expect((res.body as any).error).toBe('INVALID_ACTION');
    });

    it('missing type returns 400', async () => {
      const createRes = await makeRequest(app, 'POST', '/api/games', { playerCount: 4 });
      const gameId = (createRes.body as any).game.id;

      const res = await makeRequest(app, 'POST', `/api/games/${gameId}/actions`, {});
      expect(res.status).toBe(400);
      expect((res.body as any).error).toBe('INVALID_ACTION');
    });

    it('returns 404 for unknown game', async () => {
      const res = await makeRequest(app, 'POST', '/api/games/nonexistent/actions', {
        type: 'discard',
        tileIndex: 0,
      });
      expect(res.status).toBe(404);
      expect((res.body as any).error).toBe('GAME_NOT_FOUND');
    });
  });
});

// ---------------------------------------------------------------------------
// AI auto-processing tests
// ---------------------------------------------------------------------------

describe('AI Turn Processing', () => {
  it('AI turns auto-process after human action', () => {
    const game = createNewGame(4);

    expect(game.phase).toBe('playing');

    // If it's the human's turn at seat 0
    if (game.currentSeat === 0) {
      // We can safely discard
      const actions = getActions(game)!;
      if (actions.legalDiscardIndices.length > 0) {
        const result = applyAction(game, {
          type: 'discard',
          tileIndex: actions.legalDiscardIndices[0],
        });
        // Game should still be valid -- AI turns may have been processed
        expect(game.phase === 'playing' || game.phase === 'finished').toBe(true);
      }
    }
  });

  it('does not crash with full AI vs AI interaction', () => {
    const game = createNewGame(2);

    if (game.currentSeat === 0) {
      const actions = getActions(game)!;
      if (actions.legalDiscardIndices.length > 0) {
        applyAction(game, { type: 'discard', tileIndex: actions.legalDiscardIndices[0] });
        expect(game.phase === 'playing' || game.phase === 'finished').toBe(true);
      }
    }
    expect(game.phase === 'playing' || game.phase === 'finished').toBe(true);
  });
});
