// ---------------------------------------------------------------------------
// PlayerArea component — one player's zone: name, melds, discards, hand.
// Supports 4 table positions: bottom/right/top/left.
// ---------------------------------------------------------------------------

import { getTileName } from '@tj-mahjong/shared';
import type { Player, Tile } from '@tj-mahjong/shared';
import PlayerHand from './PlayerHand';

interface PlayerAreaProps {
  player: Player;
  isCurrent: boolean;
  position?: 'bottom' | 'right' | 'top' | 'left';
  legalIndices?: number[];
  selectedIndex?: number | null;
  onTileClick?: (index: number) => void;
  label?: string;
}

function meldTypeLabel(type: string): string {
  switch (type) {
    case 'pong': return '碰';
    case 'ming-kong': return '明杠';
    case 'an-kong': return '暗杠';
    case 'bu-kong': return '补杠';
    case 'jin-kong': return '金杠';
    default: return type;
  }
}

function smallTileDisplay(tiles: Tile[]): string {
  return tiles.map((t) => getTileName(t)).join(' ');
}

const POSITION_ROTATE: Record<string, string> = {
  bottom: '',
  right: 'rotate-90',
  top: 'rotate-180',
  left: '-rotate-90',
};

const POSITION_ORIENTATION: Record<string, 'horizontal' | 'vertical'> = {
  bottom: 'horizontal',
  right: 'vertical',
  top: 'horizontal',
  left: 'vertical',
};

export default function PlayerArea({
  player,
  isCurrent,
  position = 'bottom',
  legalIndices,
  selectedIndex,
  onTileClick,
  label,
}: PlayerAreaProps) {
  const ring = isCurrent
    ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20'
    : 'ring-1 ring-gray-700';

  const rotate = POSITION_ROTATE[position];
  const orientation = POSITION_ORIENTATION[position];

  return (
    <div
      className={[
        'rounded-lg p-2 flex flex-col gap-1 transition-all',
        ring,
        'bg-gray-900/80',
        rotate,
      ].filter(Boolean).join(' ')}
    >
      {/* Player name row */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-bold text-gray-200">
          {label ?? (player.isHuman ? '你' : `玩家 ${player.seat + 1}`)}
        </span>
        {isCurrent && (
          <span className="text-[10px] text-yellow-400 animate-pulse">
            &#x25B6; 当前
          </span>
        )}
      </div>

      {/* Melds */}
      {player.melds.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {player.melds.map((meld, mi) => (
            <div
              key={mi}
              className="bg-gray-700 rounded px-1.5 py-0.5 text-[10px] text-gray-200 border border-gray-600"
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
              className="text-[9px] text-gray-400 bg-gray-800 rounded px-1 py-0.5 border border-gray-700"
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
          orientation={orientation}
          legalIndices={legalIndices}
          selectedIndex={selectedIndex}
          onTileClick={onTileClick}
        />
      )}
    </div>
  );
}
