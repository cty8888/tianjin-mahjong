// ---------------------------------------------------------------------------
// API client for Tianjin Mahjong (天津麻将)
// Communicates with the Express backend via fetch.
// ---------------------------------------------------------------------------

import type { GameState, PlayerAction } from '@tj-mahjong/shared';

const BASE = '/api';

export interface ActionsResponse {
  canPong: boolean;
  canMingKong: boolean;
  canAnKong: boolean;
  canBuKong: boolean;
  canJinKong: boolean;
  canWin: boolean;
  legalDiscardIndices: number[];
}

export interface CreateGameResponse {
  game: {
    id: string;
    state: GameState;
  };
}

export interface GetGameResponse {
  game: {
    id: string;
    state: GameState;
  };
}

/**
 * Create a new game with the specified number of players.
 */
export async function createGame(playerCount: number): Promise<GameState> {
  const res = await fetch(`${BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerCount }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Failed to create game');
  }

  const data: CreateGameResponse = await res.json();
  return data.game.state;
}

/**
 * Retrieve a game by its ID.
 */
export async function getGame(id: string): Promise<GameState> {
  const res = await fetch(`${BASE}/games/${encodeURIComponent(id)}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Failed to get game');
  }

  const data: GetGameResponse = await res.json();
  return data.game.state;
}

/**
 * Get available actions for the current player in a game.
 */
export async function getActions(id: string): Promise<ActionsResponse> {
  const res = await fetch(`${BASE}/games/${encodeURIComponent(id)}/actions`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Failed to get actions');
  }

  return res.json();
}

/**
 * Submit an action for the current player.
 */
export async function submitAction(
  id: string,
  action: PlayerAction,
): Promise<GameState> {
  const res = await fetch(`${BASE}/games/${encodeURIComponent(id)}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Failed to submit action');
  }

  const data: GetGameResponse = await res.json();
  return data.game.state;
}
