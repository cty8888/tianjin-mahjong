import { describe, it, expect } from 'vitest';
import type { Tile, Suit } from './types';
import {
  createTiles,
  getTileName,
  getNextTileInSequence,
  isHunTile,
  tilesMatch,
} from './tile';

// ---------------------------------------------------------------------------
// createTiles
// ---------------------------------------------------------------------------
describe('createTiles', () => {
  it('returns exactly 136 tiles', () => {
    const tiles = createTiles();
    expect(tiles).toHaveLength(136);
  });

  it('all IDs 0-135 are unique', () => {
    const tiles = createTiles();
    const ids = tiles.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(136);
    expect(Math.min(...ids)).toBe(0);
    expect(Math.max(...ids)).toBe(135);
  });

  it('all tiles start with isHun=false', () => {
    const tiles = createTiles();
    for (const tile of tiles) {
      expect(tile.isHun).toBe(false);
    }
  });

  it('produces 36 wan tiles (9 ranks x 4 copies each)', () => {
    const tiles = createTiles();
    const wanTiles = tiles.filter((t) => t.suit === 'wan');
    expect(wanTiles).toHaveLength(36);

    for (let rank = 1; rank <= 9; rank++) {
      const copies = wanTiles.filter((t) => t.rank === rank);
      expect(copies).toHaveLength(4);
    }
  });

  it('produces 36 tiao tiles (9 ranks x 4 copies each)', () => {
    const tiles = createTiles();
    const tiaoTiles = tiles.filter((t) => t.suit === 'tiao');
    expect(tiaoTiles).toHaveLength(36);

    for (let rank = 1; rank <= 9; rank++) {
      const copies = tiaoTiles.filter((t) => t.rank === rank);
      expect(copies).toHaveLength(4);
    }
  });

  it('produces 36 tong tiles (9 ranks x 4 copies each)', () => {
    const tiles = createTiles();
    const tongTiles = tiles.filter((t) => t.suit === 'tong');
    expect(tongTiles).toHaveLength(36);

    for (let rank = 1; rank <= 9; rank++) {
      const copies = tongTiles.filter((t) => t.rank === rank);
      expect(copies).toHaveLength(4);
    }
  });

  it('produces 16 feng tiles (4 winds x 4 copies each)', () => {
    const tiles = createTiles();
    const fengTiles = tiles.filter((t) => t.suit === 'feng');
    expect(fengTiles).toHaveLength(16);

    for (let rank = 1; rank <= 4; rank++) {
      const copies = fengTiles.filter((t) => t.rank === rank);
      expect(copies).toHaveLength(4);
    }
  });

  it('produces 12 jian tiles (3 dragons x 4 copies each)', () => {
    const tiles = createTiles();
    const jianTiles = tiles.filter((t) => t.suit === 'jian');
    expect(jianTiles).toHaveLength(12);

    for (let rank = 1; rank <= 3; rank++) {
      const copies = jianTiles.filter((t) => t.rank === rank);
      expect(copies).toHaveLength(4);
    }
  });
});

// ---------------------------------------------------------------------------
// getTileName
// ---------------------------------------------------------------------------
describe('getTileName', () => {
  it('names wan tiles correctly', () => {
    expect(getTileName({ suit: 'wan', rank: 1, id: 0, isHun: false })).toBe(
      '一万',
    );
    expect(getTileName({ suit: 'wan', rank: 5, id: 0, isHun: false })).toBe(
      '五万',
    );
    expect(getTileName({ suit: 'wan', rank: 9, id: 0, isHun: false })).toBe(
      '九万',
    );
  });

  it('names tiao tiles correctly', () => {
    expect(getTileName({ suit: 'tiao', rank: 1, id: 0, isHun: false })).toBe(
      '一条',
    );
    expect(getTileName({ suit: 'tiao', rank: 5, id: 0, isHun: false })).toBe(
      '五条',
    );
    expect(getTileName({ suit: 'tiao', rank: 9, id: 0, isHun: false })).toBe(
      '九条',
    );
  });

  it('names tong tiles correctly', () => {
    expect(getTileName({ suit: 'tong', rank: 1, id: 0, isHun: false })).toBe(
      '一筒',
    );
    expect(getTileName({ suit: 'tong', rank: 5, id: 0, isHun: false })).toBe(
      '五筒',
    );
    expect(getTileName({ suit: 'tong', rank: 9, id: 0, isHun: false })).toBe(
      '九筒',
    );
  });

  it('names feng tiles correctly', () => {
    expect(getTileName({ suit: 'feng', rank: 1, id: 0, isHun: false })).toBe(
      '东',
    );
    expect(getTileName({ suit: 'feng', rank: 2, id: 0, isHun: false })).toBe(
      '南',
    );
    expect(getTileName({ suit: 'feng', rank: 3, id: 0, isHun: false })).toBe(
      '西',
    );
    expect(getTileName({ suit: 'feng', rank: 4, id: 0, isHun: false })).toBe(
      '北',
    );
  });

  it('names jian tiles correctly', () => {
    expect(getTileName({ suit: 'jian', rank: 1, id: 0, isHun: false })).toBe(
      '中',
    );
    expect(getTileName({ suit: 'jian', rank: 2, id: 0, isHun: false })).toBe(
      '发',
    );
    expect(getTileName({ suit: 'jian', rank: 3, id: 0, isHun: false })).toBe(
      '白',
    );
  });
});

// ---------------------------------------------------------------------------
// getNextTileInSequence
// ---------------------------------------------------------------------------
describe('getNextTileInSequence', () => {
  it('wraps 九万 to 一万', () => {
    const result = getNextTileInSequence({
      suit: 'wan',
      rank: 9,
      id: 0,
      isHun: false,
    });
    expect(result).toEqual({ suit: 'wan', rank: 1 });
  });

  it('wraps 九筒 to 一筒', () => {
    const result = getNextTileInSequence({
      suit: 'tong',
      rank: 9,
      id: 0,
      isHun: false,
    });
    expect(result).toEqual({ suit: 'tong', rank: 1 });
  });

  it('wraps 北 to 东', () => {
    const result = getNextTileInSequence({
      suit: 'feng',
      rank: 4,
      id: 0,
      isHun: false,
    });
    expect(result).toEqual({ suit: 'feng', rank: 1 });
  });

  it('wraps 白 to 中', () => {
    const result = getNextTileInSequence({
      suit: 'jian',
      rank: 3,
      id: 0,
      isHun: false,
    });
    expect(result).toEqual({ suit: 'jian', rank: 1 });
  });

  it('advances 五万 to 六万', () => {
    const result = getNextTileInSequence({
      suit: 'wan',
      rank: 5,
      id: 0,
      isHun: false,
    });
    expect(result).toEqual({ suit: 'wan', rank: 6 });
  });

  it('advances 东 to 南', () => {
    const result = getNextTileInSequence({
      suit: 'feng',
      rank: 1,
      id: 0,
      isHun: false,
    });
    expect(result).toEqual({ suit: 'feng', rank: 2 });
  });

  it('advances 中 to 发', () => {
    const result = getNextTileInSequence({
      suit: 'jian',
      rank: 1,
      id: 0,
      isHun: false,
    });
    expect(result).toEqual({ suit: 'jian', rank: 2 });
  });
});

// ---------------------------------------------------------------------------
// isHunTile
// ---------------------------------------------------------------------------
describe('isHunTile', () => {
  it('returns false for a tile with isHun=false', () => {
    const tile: Tile = { suit: 'wan', rank: 1, id: 0, isHun: false };
    expect(isHunTile(tile)).toBe(false);
  });

  it('returns true for a tile with isHun=true', () => {
    const tile: Tile = { suit: 'wan', rank: 1, id: 0, isHun: true };
    expect(isHunTile(tile)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// tilesMatch
// ---------------------------------------------------------------------------
describe('tilesMatch', () => {
  it('returns true for tiles with same suit and rank', () => {
    const a: Tile = { suit: 'wan', rank: 5, id: 10, isHun: false };
    const b: Tile = { suit: 'wan', rank: 5, id: 20, isHun: true };
    expect(tilesMatch(a, b)).toBe(true);
  });

  it('returns false for tiles with different suit', () => {
    const a: Tile = { suit: 'wan', rank: 5, id: 10, isHun: false };
    const b: Tile = { suit: 'tiao', rank: 5, id: 20, isHun: false };
    expect(tilesMatch(a, b)).toBe(false);
  });

  it('returns false for tiles with different rank', () => {
    const a: Tile = { suit: 'wan', rank: 5, id: 10, isHun: false };
    const b: Tile = { suit: 'wan', rank: 6, id: 20, isHun: false };
    expect(tilesMatch(a, b)).toBe(false);
  });

  it('returns false for tiles with different suit and rank', () => {
    const a: Tile = { suit: 'wan', rank: 1, id: 10, isHun: false };
    const b: Tile = { suit: 'tiao', rank: 9, id: 20, isHun: false };
    expect(tilesMatch(a, b)).toBe(false);
  });
});
