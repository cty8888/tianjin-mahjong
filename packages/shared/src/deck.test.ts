// ---------------------------------------------------------------------------
// Unit tests for deck.ts
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  createWall,
  shuffleWall,
  drawTile,
  drawReplacementTile,
  flipHunIndicator,
} from './deck';

describe('createWall', () => {
  it('returns 136 tiles', () => {
    const wall = createWall();
    expect(wall).toHaveLength(136);
  });

  it('returns tiles with distinct IDs 0-135', () => {
    const wall = createWall();
    const ids = wall.map((t) => t.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 136 }, (_, i) => i));
  });

  it('returns tiles with isHun = false', () => {
    const wall = createWall();
    for (const tile of wall) {
      expect(tile.isHun).toBe(false);
    }
  });
});

describe('shuffleWall', () => {
  it('returns 136 tiles', () => {
    const wall = createWall();
    const shuffled = shuffleWall(wall);
    expect(shuffled).toHaveLength(136);
  });

  it('contains the same tile IDs as the input', () => {
    const wall = createWall();
    const shuffled = shuffleWall(wall);
    const originalIds = wall.map((t) => t.id).sort((a, b) => a - b);
    const shuffledIds = shuffled.map((t) => t.id).sort((a, b) => a - b);
    expect(shuffledIds).toEqual(originalIds);
  });

  it('does not mutate the input wall', () => {
    const wall = createWall();
    const wallCopy = [...wall];
    shuffleWall(wall);
    expect(wall).toEqual(wallCopy);
  });

  it('produces a different order (high probability)', () => {
    const wall = createWall();
    // Run multiple times — the chance of identical order is astronomically low
    let sameOrderCount = 0;
    for (let i = 0; i < 10; i++) {
      const shuffled = shuffleWall(wall);
      if (shuffled.every((t, idx) => t.id === wall[idx].id)) {
        sameOrderCount++;
      }
    }
    expect(sameOrderCount).toBeLessThan(10);
  });
});

describe('drawTile', () => {
  it('returns the first tile from the wall head', () => {
    const wall = createWall();
    const { tile, remaining } = drawTile(wall);
    expect(tile).toEqual(wall[0]);
    expect(remaining).toHaveLength(135);
  });

  it('remaining wall does not contain the drawn tile', () => {
    const wall = createWall();
    const { tile, remaining } = drawTile(wall);
    const remainingIds = remaining.map((t) => t.id);
    expect(remainingIds).not.toContain(tile!.id);
  });

  it('does not mutate the input wall', () => {
    const wall = createWall();
    const wallCopy = [...wall];
    drawTile(wall);
    expect(wall).toEqual(wallCopy);
  });

  it('returns null tile for an empty wall', () => {
    const { tile, remaining } = drawTile([]);
    expect(tile).toBeNull();
    expect(remaining).toEqual([]);
  });

  it('after drawing all 136 tiles, wall is empty', () => {
    let wall = createWall();
    for (let i = 0; i < 136; i++) {
      const result = drawTile(wall);
      expect(result.tile).not.toBeNull();
      wall = result.remaining;
    }
    expect(wall).toHaveLength(0);
    const empty = drawTile(wall);
    expect(empty.tile).toBeNull();
  });
});

describe('drawReplacementTile', () => {
  it('returns the last tile from the wall tail', () => {
    const wall = createWall();
    const { tile, remaining } = drawReplacementTile(wall);
    expect(tile).toEqual(wall[135]);
    expect(remaining).toHaveLength(135);
  });

  it('remaining wall does not contain the drawn tile', () => {
    const wall = createWall();
    const { tile, remaining } = drawReplacementTile(wall);
    const remainingIds = remaining.map((t) => t.id);
    expect(remainingIds).not.toContain(tile!.id);
  });

  it('does not mutate the input wall', () => {
    const wall = createWall();
    const wallCopy = [...wall];
    drawReplacementTile(wall);
    expect(wall).toEqual(wallCopy);
  });

  it('returns null tile for an empty wall', () => {
    const { tile, remaining } = drawReplacementTile([]);
    expect(tile).toBeNull();
    expect(remaining).toEqual([]);
  });

  it('draws from the tail each time', () => {
    let wall = createWall();
    const drawnTiles: number[] = [];
    for (let i = 0; i < 5; i++) {
      const { tile, remaining } = drawReplacementTile(wall);
      drawnTiles.push(tile!.id);
      wall = remaining;
    }
    // Tiles drawn should be descending in original order (135, 134, 133, 132, 131)
    expect(drawnTiles).toEqual([135, 134, 133, 132, 131]);
  });
});

describe('flipHunIndicator', () => {
  it('returns the last tile from the wall tail as indicator', () => {
    const wall = createWall();
    const { indicator, remaining } = flipHunIndicator(wall);
    expect(indicator).toEqual(wall[135]);
    expect(remaining).toHaveLength(135);
  });

  it('remaining wall does not contain the indicator tile', () => {
    const wall = createWall();
    const { indicator, remaining } = flipHunIndicator(wall);
    const remainingIds = remaining.map((t) => t.id);
    expect(remainingIds).not.toContain(indicator!.id);
  });

  it('does not mutate the input wall', () => {
    const wall = createWall();
    const wallCopy = [...wall];
    flipHunIndicator(wall);
    expect(wall).toEqual(wallCopy);
  });

  it('returns null indicator for an empty wall', () => {
    const { indicator, remaining } = flipHunIndicator([]);
    expect(indicator).toBeNull();
    expect(remaining).toEqual([]);
  });

  it('returns last tile (tail), same as drawReplacementTile', () => {
    const wall = createWall();
    const dr = drawReplacementTile(wall);
    const flip = flipHunIndicator(wall);
    expect(flip.indicator).toEqual(dr.tile);
    expect(flip.remaining).toHaveLength(dr.remaining.length);
  });
});
