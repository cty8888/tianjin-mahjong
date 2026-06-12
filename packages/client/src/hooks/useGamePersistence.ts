// ---------------------------------------------------------------------------
// localStorage persistence hook for Tianjin Mahjong (天津麻将)
// Task 12 — Save/load game state to survive page reloads.
// ---------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import type { GameState } from '@tj-mahjong/shared';

const STORAGE_KEY = 'tianjin-mahjong-game';

function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed.id !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable; silently ignore
  }
}

function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export interface UseGamePersistenceReturn {
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;
  clearGame: () => void;
}

export function useGamePersistence(): UseGamePersistenceReturn {
  const [gameState, setGameStateInternal] = useState<GameState | null>(() =>
    loadGameState(),
  );

  const setGameState = useCallback((state: GameState | null) => {
    setGameStateInternal(state);
    if (state) {
      saveGameState(state);
    } else {
      clearSavedGame();
    }
  }, []);

  const clearGame = useCallback(() => {
    setGameState(null);
  }, [setGameState]);

  // Re-sync on mount in case another tab changed localStorage
  useEffect(() => {
    const saved = loadGameState();
    if (saved && (!gameState || saved.id !== gameState.id)) {
      setGameStateInternal(saved);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { gameState, setGameState, clearGame };
}
