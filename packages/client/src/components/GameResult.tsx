// ---------------------------------------------------------------------------
// GameResult component — overlay shown when the game ends.
// Task 11 — Displays winner, pattern, all revealed hands, and play-again button.
// ---------------------------------------------------------------------------

import type { GameState } from '@tj-mahjong/shared';
import PlayerHand from './PlayerHand';

interface GameResultProps {
  game: GameState;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export default function GameResult({ game, onPlayAgain, onLeave }: GameResultProps) {
  const isHumanWin = game.winner === 0;
  const isDraw = game.winner === null;

  let title: string;
  let titleColor: string;
  if (isDraw) {
    title = '流局';
    titleColor = 'text-yellow-400';
  } else if (isHumanWin) {
    title = '你赢了！';
    titleColor = 'text-green-400';
  } else {
    title = 'AI 赢了';
    titleColor = 'text-red-400';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Title */}
        <h1 className={`text-3xl font-bold text-center mb-2 ${titleColor}`}>
          {title}
        </h1>

        {/* Win pattern */}
        {game.winPattern && (
          <p className="text-center text-sm text-gray-400 mb-4">
            {game.winPattern}
          </p>
        )}

        {/* All players' hands revealed */}
        <div className="space-y-4 mb-6">
          {game.players.map((player) => (
            <div key={player.seat}>
              <p className="text-xs text-gray-500 mb-1">
                {player.isHuman ? '你' : `玩家 ${player.seat + 1}`}
                {game.winner === player.seat && (
                  <span className="ml-2 text-yellow-400">&#x1F3C6; 赢家</span>
                )}
              </p>
              <PlayerHand
                tiles={player.hand}
                isHuman={true}
              />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={onPlayAgain}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-green-600 hover:bg-green-500 text-white transition-all"
          >
            再来一局
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-gray-600 hover:bg-gray-500 text-white transition-all"
          >
            退出对局
          </button>
        </div>
      </div>
    </div>
  );
}
