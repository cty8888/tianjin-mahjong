// ---------------------------------------------------------------------------
// GameSetup page — player count selector and start button.
// Task 11 — Title, 2/3/4 player buttons, loading/error states.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { createGame } from '../api';
import type { GameState } from '@tj-mahjong/shared';

interface GameSetupProps {
  onGameStart: (state: GameState) => void;
}

export default function GameSetup({ onGameStart }: GameSetupProps) {
  const [playerCount, setPlayerCount] = useState<number>(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);
    try {
      const state = await createGame(playerCount);
      onGameStart(state);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown error';
      setError(`创建游戏失败: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  const counts = [2, 3, 4];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4">
      {/* Title */}
      <h1 className="text-4xl font-bold text-amber-300 mb-2">&#x1F004; 天津麻将</h1>
      <p className="text-gray-500 text-sm mb-8">Tianjin Mahjong</p>

      {/* Player count selector */}
      <div className="mb-6">
        <p className="text-gray-400 text-sm mb-3 text-center">选择玩家人数</p>
        <div className="flex gap-3 justify-center">
          {counts.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setPlayerCount(n)}
              className={[
                'w-16 h-16 rounded-xl text-xl font-bold border-2 transition-all',
                playerCount === n
                  ? 'bg-amber-600 text-white border-amber-400 shadow-lg shadow-amber-600/30'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500',
              ].join(' ')}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Start button */}
      <button
        type="button"
        disabled={loading}
        onClick={handleStart}
        className={[
          'px-8 py-3 rounded-xl text-lg font-bold transition-all',
          'bg-amber-600 hover:bg-amber-500 text-white',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        {loading ? '正在发牌...' : '开始游戏'}
      </button>

      {/* Error display */}
      {error && (
        <p className="mt-4 text-sm text-red-400 text-center max-w-sm">{error}</p>
      )}
    </div>
  );
}
