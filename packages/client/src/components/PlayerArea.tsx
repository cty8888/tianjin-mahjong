// ---------------------------------------------------------------------------
// PlayerArea component — one player's zone: name, melds, discards, hand.
// Task 11 — Current player gets yellow ring highlight.
// ---------------------------------------------------------------------------

import { getTileName } from '@tj-mahjong/shared';
import type { Player, Tile } from '@tj-mahjong/shared';
import PlayerHand from './PlayerHand';

interface PlayerAreaProps {
  player: Player;
  isCurrent: boolean;
  legalIndices?: number[];
  selectedIndex?: number | null;
  onTileClick?: (index: number) => void;
  label?: string;
}

function meldTypeLabel(type: string): string {
  switch (type) {
    case 'pong':
      return '碰';
    case 'ming-kong':
      return '明杠';
    case 'an-kong':
      return '暗杠';
    case 'bu-kong':
      return '补杠';
    case 'jin-kong':
      return '金杠';
    default:
      return type;
  }
}

function smallTileDisplay(tiles: Tile[]): string {
  return tiles.map((t) => getTileName(t)).join(' ');
}

export default function PlayerArea({
  player,
  isCurrent,
  legalIndices,
  selectedIndex,
  onTileClick,
  label,
}: PlayerAreaProps) {
  const ring = isCurrent
    ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20'
    : 'ring-1 ring-gray-700';

  return (
    <div
      className={[
        'rounded-lg p-3 flex flex-col gap-2 transition-all',
        ring,
        'bg-gray-900/80',
      ].join(' ')}
    >
      {/* Player name row */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-200">
          {label ?? (player.isHuman ? '你' : `玩家 ${player.seat + 1}`)}
        </span>
        {isCurrent && (
          <span className="text-xs text-yellow-400 animate-pulse">
            &#x25B6; 当前
          </span>
        )}
      </div>

      {/* Melds */}
      {player.melds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {player.melds.map((meld, mi) => (
            <div
              key={mi}
              className="bg-gray-700 rounded px-2 py-1 text-xs text-gray-200 border border-gray-600"
              title={smallTileDisplay(meld.tiles)}
            >
              <span className="text-gray-400">{meldTypeLabel(meld.type)}</span>{' '}
              {smallTileDisplay(meld.tiles)}
            </div>
          ))}
        </div>
      )}

      {/* Discards */}
      {player.discards.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {player.discards.map((tile, di) => (
            <span
              key={`${tile.id}-${di}`}
              className="text-[10px] text-gray-400 bg-gray-800 rounded px-1 py-0.5 border border-gray-700"
            >
              {getTileName(tile)}
            </span>
          ))}
        </div>
      )}

      {/* Hand */}
      {player.hand.length > 0 && (
        <PlayerHand
          tiles={player.hand}
          isHuman={player.isHuman}
          legalIndices={legalIndices}
          selectedIndex={selectedIndex}
          onTileClick={onTileClick}
        />
      )}
    </div>
  );
}
