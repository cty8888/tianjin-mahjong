// ---------------------------------------------------------------------------
// PlayerHand component — displays a row of mahjong tiles for one player.
// Task 11 — Clickable for human, hidden/背面 for AI.
// ---------------------------------------------------------------------------

import { getTileName } from '@tj-mahjong/shared';
import type { Tile } from '@tj-mahjong/shared';

interface PlayerHandProps {
  tiles: Tile[];
  isHuman: boolean;
  legalIndices?: number[];
  selectedIndex?: number | null;
  onTileClick?: (index: number) => void;
}

function tileBg(tile: Tile, isHuman: boolean): string {
  if (!isHuman) {
    return 'bg-blue-800 text-blue-200 border-blue-600';
  }
  if (tile.isHun) {
    return 'bg-amber-700 text-amber-100 border-amber-500';
  }
  return 'bg-amber-100 text-gray-900 border-amber-400';
}

function tileDisplay(tile: Tile, isHuman: boolean): string {
  if (!isHuman) return '🀫';
  return getTileName(tile);
}

export default function PlayerHand({
  tiles,
  isHuman,
  legalIndices,
  selectedIndex,
  onTileClick,
}: PlayerHandProps) {
  const legalSet = legalIndices ? new Set(legalIndices) : null;

  return (
    <div className="flex flex-wrap justify-center gap-1">
      {tiles.map((tile, index) => {
        const isLegal = legalSet ? legalSet.has(index) : false;
        const isSelected = selectedIndex === index;

        let ring = '';
        let transform = '';
        if (isSelected) {
          ring = 'ring-2 ring-green-400';
          transform = '-translate-y-1.5';
        } else if (isLegal && isHuman) {
          ring = 'ring-1 ring-green-300/50';
        }

        const clickable = isHuman && isLegal && onTileClick;

        return (
          <button
            key={tile.id}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onTileClick(index)}
            className={[
              'relative flex flex-col items-center justify-center',
              'w-10 h-14 rounded-md border text-xs font-bold',
              'transition-all duration-100 select-none',
              tileBg(tile, isHuman),
              ring,
              transform,
              clickable ? 'cursor-pointer hover:brightness-110' : 'cursor-default',
            ]
              .filter(Boolean)
              .join(' ')}
            title={isHuman ? getTileName(tile) : '?'}
          >
            <span className="leading-tight text-center">
              {tileDisplay(tile, isHuman)}
            </span>
            {isHuman && tile.isHun && (
              <span className="absolute -top-1 -right-1 text-[8px] bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
                混
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
