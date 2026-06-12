// ---------------------------------------------------------------------------
// PlayerHand component — displays a row of mahjong tiles for one player.
// Horizontal (bottom/top): tiles side-by-side, tall cards.
// Vertical (left/right): tiles stacked top-to-bottom, with rotated faces.
// When holding 14 tiles, the drawn tile is visually separated.
// ---------------------------------------------------------------------------

import { getTileName } from '@tj-mahjong/shared';
import type { Tile } from '@tj-mahjong/shared';

interface PlayerHandProps {
  tiles: Tile[];
  isHuman: boolean;
  orientation?: 'horizontal' | 'vertical';
  legalIndices?: number[];
  selectedIndex?: number | null;
  onTileClick?: (index: number) => void;
}

function tileBg(tile: Tile, isHuman: boolean): string {
  if (!isHuman) return 'bg-blue-800 text-blue-200 border-blue-600';
  if (tile.isHun) return 'bg-amber-700 text-amber-100 border-amber-500';
  return 'bg-amber-100 text-gray-900 border-amber-400';
}

function tileDisplay(tile: Tile, isHuman: boolean): string {
  if (!isHuman) return '🀫';
  return getTileName(tile);
}

export default function PlayerHand({
  tiles,
  isHuman,
  orientation = 'horizontal',
  legalIndices,
  selectedIndex,
  onTileClick,
}: PlayerHandProps) {
  const legalSet = legalIndices ? new Set(legalIndices) : null;
  const isVertical = orientation === 'vertical';
  const hasDrawn = tiles.length === 14;
  const handTiles = hasDrawn ? tiles.slice(0, 13) : tiles;
  const drawnTile = hasDrawn ? tiles[13] : null;

  function renderTile(tile: Tile, index: number, isDrawn: boolean) {
    const effectiveIndex = isDrawn ? 13 : index;
    const isLegal = legalSet ? legalSet.has(effectiveIndex) : false;
    const isSelected = selectedIndex === effectiveIndex;

    let ring = '';
    let lift = '';
    if (isSelected) {
      ring = 'ring-2 ring-green-400';
      lift = isVertical ? 'translate-x-1.5' : '-translate-y-1.5';
    }

    const clickable = isHuman && isLegal && onTileClick;

    // Horizontal (face-on): tall card w-10 h-14
    // Vertical (side view): wide card w-14 h-10
    const tileSize = isVertical
      ? 'w-14 h-10'
      : 'w-10 h-14';

    const gap = isDrawn ? (isVertical ? 'mt-3' : 'ml-3') : '';

    return (
      <button
        key={isDrawn ? 'drawn' : tile.id}
        type="button"
        disabled={!clickable}
        onClick={() => clickable && onTileClick(effectiveIndex)}
        className={[
          'relative flex items-center justify-center rounded-md border font-bold',
          'transition-all duration-100 select-none',
          tileSize,
          'text-xs',
          tileBg(tile, isHuman),
          ring,
          lift,
          gap,
          clickable ? 'cursor-pointer hover:brightness-110' : 'cursor-default',
        ]
          .filter(Boolean)
          .join(' ')}
        title={isHuman ? getTileName(tile) : '?'}
      >
        <span>{tileDisplay(tile, isHuman)}</span>
        {isHuman && tile.isHun && (
          <span className="absolute -top-1 -right-1 text-[8px] bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
            混
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={isVertical ? 'flex flex-col items-center gap-0.5' : 'flex flex-wrap justify-center items-end gap-0.5'}>
      {handTiles.map((tile, i) => renderTile(tile, i, false))}
      {drawnTile && renderTile(drawnTile, 13, true)}
    </div>
  );
}
