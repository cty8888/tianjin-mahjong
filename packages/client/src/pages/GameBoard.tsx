// ---------------------------------------------------------------------------
// GameBoard page — 4-position mahjong table with CSS Grid layout.
// Human at bottom, AI at right/top/left around the table.
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

/** Map a player seat to table position, relative to human at bottom */
function seatToPosition(
  seat: number,
  humanSeat: number,
  playerCount: number,
  isHuman: boolean,
): 'bottom' | 'right' | 'top' | 'left' {
  if (isHuman) return 'bottom';
  const positions: Array<'bottom' | 'right' | 'top' | 'left'> = ['bottom', 'right', 'top', 'left'];
  const offset = (seat - humanSeat + playerCount) % playerCount;
  return positions[offset] ?? 'top';
}

export default function GameBoard({
  game,
  onGameStateChange,
  onClearGame,
}: GameBoardProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const [actions, setActions] = useState<{
    canPong: boolean; canMingKong: boolean; canAnKong: boolean;
    canBuKong: boolean; canJinKong: boolean; canWin: boolean;
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
      setError(`获取操作失败: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      pendingRefresh.current = false;
    }
  }, []);

  useEffect(() => {
    if (game.phase !== 'playing') { setActions(null); return; }
    if (game.players[game.currentSeat]?.isHuman) refreshActions(game);
    else setActions(null);
  }, [game, refreshActions]);

  const gameRef = useRef(game);
  gameRef.current = game;

  const handleAction = useCallback(async (action: PlayerAction) => {
    setLoading(true); setError(null); setSelectedIndex(null);
    try {
      const newState = await submitAction(gameRef.current.id, action);
      onGameStateChange(newState);
    } catch (err: unknown) {
      setError(`操作失败: ${err instanceof Error ? err.message : 'Unknown error'}`);
      refreshActions(gameRef.current);
    } finally { setLoading(false); }
  }, [onGameStateChange, refreshActions]);

  const handleTileClick = useCallback((index: number) => {
    if (!actions || loading) return;
    if (selectedIndex === index) handleAction({ type: 'discard', tileIndex: index });
    else setSelectedIndex(index);
  }, [actions, selectedIndex, loading, handleAction]);

  const handlePlayAgain = useCallback(async () => {
    setLoading(true); setError(null); setSelectedIndex(null); setActions(null);
    try {
      const newState = await createGame(gameRef.current.players.length);
      onGameStateChange(newState);
    } catch (err: unknown) {
      setError(`创建新游戏失败: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally { setLoading(false); }
  }, [onGameStateChange]);

  const humanPlayer = game.players.find(p => p.isHuman)!;
  const humanSeat = humanPlayer.seat;
  const isHumanTurn = game.phase === 'playing' && game.players[game.currentSeat]?.isHuman;

  // Group AI players by their table position
  const positionSlots: Record<string, typeof game.players> = { right: [], top: [], left: [] };
  for (const p of game.players) {
    if (p.isHuman) continue;
    const pos = seatToPosition(p.seat, humanSeat, game.players.length, false);
    if (pos !== 'bottom') positionSlots[pos].push(p);
  }

  const isPlaying = game.phase === 'playing';

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-bold text-amber-300">&#x1F004; 天津麻将</h1>
          {game.hunIndicator && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span>混儿:</span>
              <span className="text-amber-400 font-bold">{getTileName(game.hunIndicator)}</span>
            </div>
          )}
        </div>
        <button onClick={onClearGame}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all">
          退出对局
        </button>
      </header>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-1 px-3 py-1.5 bg-red-900/50 border border-red-700/50 rounded-lg text-xs text-red-300 text-center shrink-0">
          {error}
        </div>
      )}

      {/* Table Grid */}
      <div className="flex-1 grid grid-cols-[minmax(120px,auto)_1fr_minmax(120px,auto)] grid-rows-[auto_1fr_auto] gap-1 p-2 min-h-0">
        {/* Top: AI player */}
        <div className="col-start-2 row-start-1 flex justify-center items-end">
          {positionSlots.top.map(p => (
            <PlayerArea key={p.seat} player={p} isCurrent={isPlaying && game.currentSeat === p.seat}
              position="top" label={`玩家 ${p.seat + 1}`} />
          ))}
        </div>

        {/* Left: AI player */}
        <div className="col-start-1 row-start-2 flex items-center justify-end">
          {positionSlots.left.map(p => (
            <PlayerArea key={p.seat} player={p} isCurrent={isPlaying && game.currentSeat === p.seat}
              position="left" label={`玩家 ${p.seat + 1}`} />
          ))}
        </div>

        {/* Center: table info + discards arranged as a square */}
        <div className="col-start-2 row-start-2 flex flex-col items-center justify-center gap-2">
          {/* Top side discards */}
          <div className="flex gap-0.5 flex-wrap justify-center max-w-[180px]">
            {positionSlots.top.flatMap(p => p.discards).map((t, i) => (
              <span key={i} className="inline-flex items-center justify-center w-6 h-9 text-[10px] bg-gray-700 text-gray-200 rounded border border-gray-600 leading-tight text-center">{getTileName(t)}</span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Left side discards */}
            <div className="flex flex-col gap-0.5 items-end max-h-[120px] overflow-hidden">
              {positionSlots.left.flatMap(p => p.discards).slice(-8).map((t, i) => (
                <span key={i} className="inline-flex items-center justify-center w-6 h-9 text-[10px] bg-gray-700 text-gray-200 rounded border border-gray-600 leading-tight text-center">{getTileName(t)}</span>
              ))}
            </div>

            {/* Center circle */}
            <div className="bg-green-900/40 rounded-full w-20 h-20 sm:w-24 sm:h-24 flex flex-col items-center justify-center border-2 border-green-800/50 shrink-0">
              {isPlaying ? (
                <>
                  <span className="text-[10px] text-gray-400">剩余</span>
                  <span className="text-xl font-bold text-amber-300">{game.wall.length}</span>
                  <span className="text-[10px] text-gray-400">张</span>
                  {game.lastDiscard && (
                    <span className="text-[9px] text-gray-500 mt-0.5">{getTileName(game.lastDiscard)}</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-500">等待开始</span>
              )}
            </div>

            {/* Right side discards */}
            <div className="flex flex-col gap-0.5 items-start max-h-[120px] overflow-hidden">
              {positionSlots.right.flatMap(p => p.discards).slice(-8).map((t, i) => (
                <span key={i} className="inline-flex items-center justify-center w-6 h-9 text-[10px] bg-gray-700 text-gray-200 rounded border border-gray-600 leading-tight text-center">{getTileName(t)}</span>
              ))}
            </div>
          </div>

          {/* Bottom side discards (human) */}
          <div className="flex gap-0.5 flex-wrap justify-center max-w-[260px]">
            {humanPlayer.discards.map((t, i) => (
              <span key={i} className="inline-flex items-center justify-center w-6 h-9 text-[10px] bg-amber-100 text-gray-900 rounded border border-amber-400 font-medium leading-tight text-center">{getTileName(t)}</span>
            ))}
          </div>
        </div>

        {/* Right: AI player */}
        <div className="col-start-3 row-start-2 flex items-center justify-start">
          {positionSlots.right.map(p => (
            <PlayerArea key={p.seat} player={p} isCurrent={isPlaying && game.currentSeat === p.seat}
              position="right" label={`玩家 ${p.seat + 1}`} />
          ))}
        </div>

        {/* Bottom: Human */}
        <div className="col-start-2 row-start-3 flex justify-center items-start">
          <PlayerArea player={humanPlayer} isCurrent={isHumanTurn}
            position="bottom" label="你"
            legalIndices={actions?.legalDiscardIndices}
            selectedIndex={selectedIndex} onTileClick={handleTileClick} />
        </div>
      </div>

      {/* Action panel */}
      {isHumanTurn && actions && (
        <ActionPanel
          canPong={actions.canPong} canMingKong={actions.canMingKong}
          canAnKong={actions.canAnKong} canBuKong={actions.canBuKong}
          canJinKong={actions.canJinKong} canWin={actions.canWin}
          onAction={handleAction} loading={loading} />
      )}

      {/* Result */}
      {game.phase === 'finished' && (
        <GameResult game={game} onPlayAgain={handlePlayAgain} onLeave={onClearGame} />
      )}
    </div>
  );
}
