// ---------------------------------------------------------------------------
// GameBoard page — main game board orchestrating all components.
// Task 11 — AI players on top, human on bottom, action panel, auto-save.
// ---------------------------------------------------------------------------

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, PlayerAction } from '@tj-mahjong/shared';
import { getTileName } from '@tj-mahjong/shared';
import { getActions, submitAction, createGame } from '../api';
import PlayerArea from '../components/PlayerArea';
import ActionPanel from '../components/ActionPanel';
import GameResult from '../components/GameResult';

interface GameBoardProps {
  game: GameState;
  onGameStateChange: (state: GameState) => void;
  onClearGame: () => void;
}

export default function GameBoard({
  game,
  onGameStateChange,
  onClearGame,
}: GameBoardProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Available actions from the server
  const [actions, setActions] = useState<{
    canPong: boolean;
    canMingKong: boolean;
    canAnKong: boolean;
    canBuKong: boolean;
    canJinKong: boolean;
    canWin: boolean;
    legalDiscardIndices: number[];
  } | null>(null);

  const pendingRefresh = useRef(false);

  const refreshActions = useCallback(async (currentGame: GameState) => {
    if (pendingRefresh.current) return;
    pendingRefresh.current = true;

    try {
      const acts = await getActions(currentGame.id);
      setActions(acts);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`获取操作失败: ${msg}`);
    } finally {
      pendingRefresh.current = false;
    }
  }, []);

  // Fetch actions whenever the human's turn starts
  useEffect(() => {
    if (game.phase !== 'playing') {
      setActions(null);
      return;
    }
    if (game.players[game.currentSeat]?.isHuman) {
      refreshActions(game);
    } else {
      setActions(null);
    }
  }, [game, refreshActions]);

  // Keep a ref to the latest game for use in async handlers
  const gameRef = useRef(game);
  gameRef.current = game;

  // Submit an action to the server
  const handleAction = useCallback(
    async (action: PlayerAction) => {
      setLoading(true);
      setError(null);
      setSelectedIndex(null);

      try {
        const currentGame = gameRef.current;
        const newState = await submitAction(currentGame.id, action);
        onGameStateChange(newState);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(`操作失败: ${msg}`);
        // Refresh actions to get back in sync
        refreshActions(gameRef.current);
      } finally {
        setLoading(false);
      }
    },
    [onGameStateChange, refreshActions],
  );

  // Handle tile click for discard
  const handleTileClick = useCallback(
    (index: number) => {
      if (!actions || loading) return;

      if (selectedIndex === index) {
        // Second click — confirm discard
        handleAction({ type: 'discard', tileIndex: index });
      } else {
        setSelectedIndex(index);
      }
    },
    [actions, selectedIndex, loading, handleAction],
  );

  // Handle "play again"
  const handlePlayAgain = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSelectedIndex(null);
    setActions(null);

    try {
      const playerCount = gameRef.current.players.length;
      const newState = await createGame(playerCount);
      onGameStateChange(newState);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`创建新游戏失败: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [onGameStateChange]);

  const humanPlayer = game.players.find((p) => p.isHuman)!;
  const isHumanTurn =
    game.phase === 'playing' &&
    game.players[game.currentSeat]?.isHuman;

  const aiPlayers = game.players.filter((p) => !p.isHuman);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col pb-20">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-amber-300">&#x1F004; 天津麻将</h1>
          {game.hunIndicator && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>混儿:</span>
              <span className="text-amber-400 font-bold">
                {getTileName(game.hunIndicator)}
              </span>
              <span className="text-gray-600">
                (下个是混儿)
              </span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClearGame}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all"
        >
          退出对局
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-900/50 border border-red-700/50 rounded-lg text-sm text-red-300 text-center">
          {error}
        </div>
      )}

      {/* Main board area */}
      <div className="flex-1 flex flex-col gap-3 p-4 max-w-5xl mx-auto w-full">
        {/* AI players (top section) */}
        <div className="flex flex-col gap-3">
          {aiPlayers.map((player) => (
            <PlayerArea
              key={player.seat}
              player={player}
              isCurrent={
                game.phase === 'playing' &&
                game.currentSeat === player.seat
              }
              label={`玩家 ${player.seat + 1}`}
            />
          ))}
        </div>

        {/* Center info: wall count + current discard */}
        {game.phase === 'playing' && (
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500 py-2">
            <span>剩余牌: {game.wall.length}</span>
            {game.lastDiscard && (
              <span>
                最新弃牌: {getTileName(game.lastDiscard)} (玩家{' '}
                {(game.lastDiscardSeat ?? 0) + 1})
              </span>
            )}
          </div>
        )}

        {/* Human player (bottom section) */}
        <PlayerArea
          key={humanPlayer.seat}
          player={humanPlayer}
          isCurrent={isHumanTurn}
          legalIndices={actions?.legalDiscardIndices}
          selectedIndex={selectedIndex}
          onTileClick={handleTileClick}
          label="你"
        />
      </div>

      {/* Action panel (fixed bottom bar for human turn) */}
      {isHumanTurn && actions && (
        <ActionPanel
          canPong={actions.canPong}
          canMingKong={actions.canMingKong}
          canAnKong={actions.canAnKong}
          canBuKong={actions.canBuKong}
          canJinKong={actions.canJinKong}
          canWin={actions.canWin}
          onAction={handleAction}
          loading={loading}
        />
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 pointer-events-none">
          <span className="text-sm text-white bg-gray-800 px-4 py-2 rounded-lg">
            处理中...
          </span>
        </div>
      )}

      {/* Game result overlay */}
      {game.phase === 'finished' && (
        <GameResult
          game={game}
          onPlayAgain={handlePlayAgain}
          onLeave={onClearGame}
        />
      )}
    </div>
  );
}
