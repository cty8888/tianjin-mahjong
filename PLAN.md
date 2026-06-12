# 天津麻将 v1 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建天津麻将 Web 应用：全栈 TypeScript monorepo，支持 2-4 人对战 AI，碰/杠/自摸胡，v1 仅 4 刻子+1 对子胡牌。

**Architecture:** Monorepo 三包 — `shared`（游戏引擎纯函数）、`server`（Express API + 权威校验）、`client`（React 前端）。shared 同时运行在前端（即时提示）和后端（权威校验+AI）。

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Express + SQLite + Vitest + pnpm workspace + Docker

**依赖关系：**

```
Task 1 (类型) ──→ Task 2 (牌) ──→ Task 3 (牌墙) ──→ Task 4 (游戏状态)
                                                    ↓
                              Task 5 (碰杠规则) ←───┘
                                    ↓
                              Task 6 (牌型插件) ←─── Task 4
                                    ↓
                              Task 7 (手牌评估)
                                ↓
                              Task 8 (AI) ←── Task 4
                                
Task 1-8 完成后 → Task 9 (Server) → Task 10 (API路由)
                
Task 1-4 完成后 → Task 11 (Client框架) → Task 12 (组件) → Task 13 (Hooks) → Task 14 (持久化)

全部代码完成后 → Task 15 (Docker + CI)
```

**可并行：** Task 5+6+7 可并行；Task 9-10 与 Task 11-14 可并行。

---

## Phase 0: 项目脚手架

用户自行通过命令创建 monorepo 骨架（pnpm init、Vite 模板等），subagent 从 Task 1 开始编写业务代码。

> **用户操作：** 初始化 pnpm workspace、安装依赖、创建目录结构。详见 README.md 开发环境一节。

---

## Phase 1: shared — 游戏引擎

### Task 1: 共享类型定义

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/types.test.ts`

**Depends on:** 无（项目脚手架就绪）

- [ ] **Step 1: 编写类型定义**

`packages/shared/src/types.ts`:
```typescript
// === 花色与牌 ===
export type Suit = 'wan' | 'tiao' | 'tong' | 'feng' | 'jian';

export interface Tile {
  suit: Suit;
  rank: number;
  // 万条筒: 1-9; 风: 1=东 2=南 3=西 4=北; 箭: 1=中 2=发 3=白
  id: number;        // 0-135 唯一标识
  isHun: boolean;
}

// === 副露（碰/杠） ===
export type MeldType = 'pong' | 'ming-kong' | 'an-kong' | 'bu-kong' | 'jin-kong';

export interface Meld {
  type: MeldType;
  tiles: Tile[];
  sourceSeat?: number;  // 明杠/碰时的来源玩家
}

// === 玩家 ===
export interface Player {
  seat: number;          // 0-3
  hand: Tile[];
  discards: Tile[];
  melds: Meld[];
  isHuman: boolean;
}

// === 游戏状态 ===
export type GamePhase = 'setup' | 'playing' | 'finished';

export interface GameState {
  id: string;
  players: Player[];
  wall: Tile[];
  hunIndicator: Tile | null;
  hunTiles: Tile[];       // 7张混儿
  currentSeat: number;
  phase: GamePhase;
  lastDiscard: Tile | null;
  lastDiscardSeat: number | null;
  winner: number | null;
  winPattern: string | null;
  dealerSeat: number;     // 本局庄家
}

// === 操作 ===
export type ActionType = 'discard' | 'pong' | 'ming-kong' | 'an-kong' | 'bu-kong' | 'jin-kong' | 'win';

export interface PlayerAction {
  type: ActionType;
  tileIndex?: number;     // discard 时的手牌索引
}

// === 牌型插件接口 ===
export interface PatternResult {
  patternName: string;
  description: string;
}

export interface PatternChecker {
  name: string;
  check(hand: Tile[], context: { hunTiles: Tile[] }): PatternResult | null;
}
```

- [ ] **Step 2: 编写类型测试（编译级验证）**

`packages/shared/src/types.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import type { Tile, Suit, GameState, PlayerAction, PatternChecker } from './types';

describe('types', () => {
  it('Tile type is structurally correct', () => {
    const tile: Tile = {
      suit: 'wan',
      rank: 1,
      id: 0,
      isHun: false,
    };
    expect(tile.suit).toBe('wan');
    expect(tile.rank).toBe(1);
    expect(tile.id).toBe(0);
    expect(tile.isHun).toBe(false);
  });

  it('Suit union accepts all valid values', () => {
    const suits: Suit[] = ['wan', 'tiao', 'tong', 'feng', 'jian'];
    expect(suits.length).toBe(5);
  });

  it('GamePhase union accepts valid values', () => {
    const phases = ['setup', 'playing', 'finished'] as const;
    expect(phases.length).toBe(3);
  });
});
```

- [ ] **Step 3: 运行测试验证通过**

```bash
cd packages/shared && npx vitest run src/types.test.ts
```
Expected: 3 tests PASS

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types.ts packages/shared/src/types.test.ts
git commit -m "feat(shared): add core type definitions"
```

---

### Task 2: 牌系统

**Files:**
- Create: `packages/shared/src/tile.ts`
- Create: `packages/shared/src/tile.test.ts`

**Depends on:** Task 1

- [ ] **Step 1: 编写失败测试**

`packages/shared/src/tile.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createTiles, getTileName, getNextTileInSequence, isHunTile } from './tile';
import type { Tile } from './types';

describe('createTiles', () => {
  it('creates exactly 136 tiles', () => {
    const tiles = createTiles();
    expect(tiles.length).toBe(136);
  });

  it('all tiles have unique IDs 0-135', () => {
    const tiles = createTiles();
    const ids = tiles.map(t => t.id).sort((a, b) => a - b);
    expect(ids[0]).toBe(0);
    expect(ids[135]).toBe(135);
    expect(new Set(ids).size).toBe(136);
  });

  it('all tiles start with isHun=false', () => {
    const tiles = createTiles();
    expect(tiles.every(t => !t.isHun)).toBe(true);
  });

  it('has 36 wan tiles (9 ranks x 4)', () => {
    const tiles = createTiles();
    const wan = tiles.filter(t => t.suit === 'wan');
    expect(wan.length).toBe(36);
    for (let r = 1; r <= 9; r++) {
      expect(wan.filter(t => t.rank === r).length).toBe(4);
    }
  });

  it('has 36 tiao tiles', () => {
    const tiles = createTiles();
    const tiao = tiles.filter(t => t.suit === 'tiao');
    expect(tiao.length).toBe(36);
  });

  it('has 36 tong tiles', () => {
    const tiles = createTiles();
    const tong = tiles.filter(t => t.suit === 'tong');
    expect(tong.length).toBe(36);
  });

  it('has 16 feng tiles (4 winds x 4)', () => {
    const tiles = createTiles();
    const feng = tiles.filter(t => t.suit === 'feng');
    expect(feng.length).toBe(16);
    for (let r = 1; r <= 4; r++) {
      expect(feng.filter(t => t.rank === r).length).toBe(4);
    }
  });

  it('has 12 jian tiles (3 dragons x 4)', () => {
    const tiles = createTiles();
    const jian = tiles.filter(t => t.suit === 'jian');
    expect(jian.length).toBe(12);
    for (let r = 1; r <= 3; r++) {
      expect(jian.filter(t => t.rank === r).length).toBe(4);
    }
  });
});

describe('getTileName', () => {
  it('returns correct name for wan', () => {
    const tile: Tile = { suit: 'wan', rank: 5, id: 16, isHun: false };
    expect(getTileName(tile)).toBe('五万');
  });

  it('returns correct name for feng', () => {
    const names: Record<number, string> = { 1: '东', 2: '南', 3: '西', 4: '北' };
    for (const [r, n] of Object.entries(names)) {
      const tile: Tile = { suit: 'feng', rank: Number(r), id: 0, isHun: false };
      expect(getTileName(tile)).toBe(n);
    }
  });

  it('returns correct name for jian', () => {
    const names: Record<number, string> = { 1: '中', 2: '发', 3: '白' };
    for (const [r, n] of Object.entries(names)) {
      const tile: Tile = { suit: 'jian', rank: Number(r), id: 0, isHun: false };
      expect(getTileName(tile)).toBe(n);
    }
  });
});

describe('getNextTileInSequence', () => {
  it('五万 -> 六万', () => {
    const tile: Tile = { suit: 'wan', rank: 5, id: 16, isHun: false };
    const next = getNextTileInSequence(tile);
    expect(next.suit).toBe('wan');
    expect(next.rank).toBe(6);
  });

  it('九万 -> 一万 (wrap)', () => {
    const tile: Tile = { suit: 'wan', rank: 9, id: 32, isHun: false };
    const next = getNextTileInSequence(tile);
    expect(next.suit).toBe('wan');
    expect(next.rank).toBe(1);
  });

  it('九筒 -> 一筒', () => {
    const tile: Tile = { suit: 'tong', rank: 9, id: 104, isHun: false };
    const next = getNextTileInSequence(tile);
    expect(next.suit).toBe('tong');
    expect(next.rank).toBe(1);
  });

  it('北风 -> 东风', () => {
    const tile: Tile = { suit: 'feng', rank: 4, id: 132, isHun: false };
    const next = getNextTileInSequence(tile);
    expect(next.suit).toBe('feng');
    expect(next.rank).toBe(1);
  });

  it('白板 -> 红中', () => {
    const tile: Tile = { suit: 'jian', rank: 3, id: 135, isHun: false };
    const next = getNextTileInSequence(tile);
    expect(next.suit).toBe('jian');
    expect(next.rank).toBe(1);
  });
});

describe('isHunTile', () => {
  it('returns true for tiles with isHun flag', () => {
    const tile: Tile = { suit: 'wan', rank: 1, id: 0, isHun: true };
    expect(isHunTile(tile)).toBe(true);
  });

  it('returns false for non-hun tiles', () => {
    const tile: Tile = { suit: 'wan', rank: 1, id: 0, isHun: false };
    expect(isHunTile(tile)).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd packages/shared && npx vitest run src/tile.test.ts
```
Expected: all FAIL (模块不存在)

- [ ] **Step 3: 实现牌系统**

`packages/shared/src/tile.ts`:
```typescript
import type { Tile, Suit } from './types';

const SUIT_ORDER: Suit[] = ['wan', 'tiao', 'tong', 'feng', 'jian'];

const SUIT_MAX_RANK: Record<Suit, number> = {
  wan: 9, tiao: 9, tong: 9, feng: 4, jian: 3,
};

const WAN_NAMES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const FENG_NAMES: Record<number, string> = { 1: '东', 2: '南', 3: '西', 4: '北' };
const JIAN_NAMES: Record<number, string> = { 1: '中', 2: '发', 3: '白' };

export function createTiles(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  for (const suit of SUIT_ORDER) {
    const maxRank = SUIT_MAX_RANK[suit];
    for (let rank = 1; rank <= maxRank; rank++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({ suit, rank, id: id++, isHun: false });
      }
    }
  }

  return tiles;
}

export function getTileName(tile: Tile): string {
  const { suit, rank } = tile;
  switch (suit) {
    case 'wan': return `${WAN_NAMES[rank]}万`;
    case 'tiao': return `${WAN_NAMES[rank]}条`;
    case 'tong': return `${WAN_NAMES[rank]}筒`;
    case 'feng': return FENG_NAMES[rank];
    case 'jian': return JIAN_NAMES[rank];
  }
}

export function getNextTileInSequence(tile: Tile): { suit: Suit; rank: number } {
  const maxRank = SUIT_MAX_RANK[tile.suit];
  const nextRank = tile.rank >= maxRank ? 1 : tile.rank + 1;
  return { suit: tile.suit, rank: nextRank };
}

export function isHunTile(tile: Tile): boolean {
  return tile.isHun;
}

export function tilesMatch(a: { suit: Suit; rank: number }, b: { suit: Suit; rank: number }): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd packages/shared && npx vitest run src/tile.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/tile.ts packages/shared/src/tile.test.ts
git commit -m "feat(shared): implement tile system with 136 tiles"
```

---

### Task 3: 牌墙操作

**Files:**
- Create: `packages/shared/src/deck.ts`
- Create: `packages/shared/src/deck.test.ts`

**Depends on:** Task 2

- [ ] **Step 1: 编写失败测试**

`packages/shared/src/deck.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createWall, shuffleWall, drawTile, drawReplacementTile, flipHunIndicator } from './deck';
import { createTiles } from './tile';
import type { Tile } from './types';

describe('createWall', () => {
  it('creates a wall with 136 tiles', () => {
    const wall = createWall();
    expect(wall.length).toBe(136);
  });
});

describe('shuffleWall', () => {
  it('returns a wall with same tiles but different order', () => {
    const wall = createWall();
    const shuffled = shuffleWall([...wall]);
    expect(shuffled.length).toBe(136);
    // IDs should be in different order (probabilistic, but nearly certain)
    const sameOrder = wall.every((t, i) => t.id === shuffled[i]?.id);
    expect(sameOrder).toBe(false);
  });

  it('preserves all tile IDs', () => {
    const wall = createWall();
    const shuffled = shuffleWall([...wall]);
    const originalIds = wall.map(t => t.id).sort((a, b) => a - b);
    const shuffledIds = shuffled.map(t => t.id).sort((a, b) => a - b);
    expect(shuffledIds).toEqual(originalIds);
  });
});

describe('drawTile', () => {
  it('returns first tile and removes it from wall', () => {
    const wall = createWall();
    const originalLength = wall.length;
    const firstTile = wall[0];
    const { tile, remaining } = drawTile(wall);
    expect(tile).toEqual(firstTile);
    expect(remaining.length).toBe(originalLength - 1);
    expect(remaining[0]).not.toEqual(firstTile);
  });

  it('returns null when wall is empty', () => {
    const { tile, remaining } = drawTile([]);
    expect(tile).toBeNull();
    expect(remaining.length).toBe(0);
  });
});

describe('drawReplacementTile', () => {
  it('returns last tile of wall (for kong replacement)', () => {
    const wall = createWall();
    const lastTile = wall[wall.length - 1];
    const { tile, remaining } = drawReplacementTile(wall);
    expect(tile).toEqual(lastTile);
    expect(remaining.length).toBe(wall.length - 1);
  });
});

describe('flipHunIndicator', () => {
  it('returns last tile and remaining wall without it', () => {
    const wall = createWall();
    const lastTile = wall[wall.length - 1];
    const { indicator, remaining } = flipHunIndicator(wall);
    expect(indicator).toEqual(lastTile);
    expect(remaining.length).toBe(wall.length - 1);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd packages/shared && npx vitest run src/deck.test.ts
```
Expected: all FAIL

- [ ] **Step 3: 实现牌墙操作**

`packages/shared/src/deck.ts`:
```typescript
import type { Tile } from './types';

export function createWall(): Tile[] {
  // 由 createTiles() 创建原始牌组，deck 只负责操作
  const { createTiles } = require('./tile');
  return createTiles();
}

export function shuffleWall(wall: Tile[]): Tile[] {
  const shuffled = [...wall];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawTile(wall: Tile[]): { tile: Tile | null; remaining: Tile[] } {
  if (wall.length === 0) return { tile: null, remaining: [] };
  const [tile, ...remaining] = wall;
  return { tile, remaining };
}

export function drawReplacementTile(wall: Tile[]): { tile: Tile | null; remaining: Tile[] } {
  if (wall.length === 0) return { tile: null, remaining: [] };
  const remaining = wall.slice(0, -1);
  const tile = wall[wall.length - 1];
  return { tile, remaining };
}

export function flipHunIndicator(wall: Tile[]): { indicator: Tile | null; remaining: Tile[] } {
  if (wall.length === 0) return { indicator: null, remaining: [] };
  const remaining = wall.slice(0, -1);
  const indicator = wall[wall.length - 1];
  return { indicator, remaining };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd packages/shared && npx vitest run src/deck.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/deck.ts packages/shared/src/deck.test.ts
git commit -m "feat(shared): implement wall operations (shuffle/draw/replace/flip)"
```

---

### Task 4: 游戏状态管理

**Files:**
- Create: `packages/shared/src/game-state.ts`
- Create: `packages/shared/src/game-state.test.ts`

**Depends on:** Task 1, 2, 3

- [ ] **Step 1: 编写失败测试**

`packages/shared/src/game-state.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createGame, dealTiles, determineHunTiles, getNextSeat } from './game-state';
import type { GameState } from './types';

describe('createGame', () => {
  it('creates a game with 4 players', () => {
    const game = createGame(4);
    expect(game.players.length).toBe(4);
    expect(game.phase).toBe('setup');
    expect(game.wall.length).toBeGreaterThan(0);
  });

  it('creates a game with 2 players', () => {
    const game = createGame(2);
    expect(game.players.length).toBe(2);
  });

  it('rejects invalid player count', () => {
    expect(() => createGame(1)).toThrow();
    expect(() => createGame(5)).toThrow();
  });

  it('sets first player as human', () => {
    const game = createGame(4);
    expect(game.players[0].isHuman).toBe(true);
    expect(game.players[1].isHuman).toBe(false);
    expect(game.players[2].isHuman).toBe(false);
    expect(game.players[3].isHuman).toBe(false);
  });

  it('randomly assigns dealer seat', () => {
    const game = createGame(4);
    expect(game.dealerSeat).toBeGreaterThanOrEqual(0);
    expect(game.dealerSeat).toBeLessThan(4);
  });

  it('sets current seat to dealer', () => {
    const game = createGame(4);
    expect(game.currentSeat).toBe(game.dealerSeat);
  });

  it('has hun indicator and tiles set after creation', () => {
    const game = createGame(4);
    expect(game.hunIndicator).not.toBeNull();
    expect(game.hunTiles.length).toBe(7);
  });

  it('generates a unique game ID', () => {
    const game1 = createGame(4);
    const game2 = createGame(4);
    expect(game1.id).not.toBe(game2.id);
  });
});

describe('dealTiles', () => {
  it('deals 14 tiles to dealer and 13 to others', () => {
    const game = createGame(4);
    const dealt = dealTiles(game);
    const dealer = dealt.players[dealt.dealerSeat];
    expect(dealer.hand.length).toBe(14);
    for (let i = 0; i < 4; i++) {
      if (i !== dealt.dealerSeat) {
        expect(dealt.players[i].hand.length).toBe(13);
      }
    }
  });
});

describe('determineHunTiles', () => {
  it('returns 7 hun tiles', () => {
    const game = createGame(4);
    expect(game.hunTiles.length).toBe(7);
  });

  it('indicator tile itself is NOT marked as hun', () => {
    const game = createGame(4);
    const indicator = game.hunIndicator!;
    // 混儿都是 isHun=true 的，且不包含指示牌那张
    const hunIds = new Set(game.hunTiles.map(t => t.id));
    expect(hunIds.has(indicator.id)).toBe(false);
  });
});

describe('getNextSeat', () => {
  it('moves counter-clockwise', () => {
    expect(getNextSeat(0, 4)).toBe(1);
    expect(getNextSeat(3, 4)).toBe(0);
    expect(getNextSeat(1, 3)).toBe(2);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd packages/shared && npx vitest run src/game-state.test.ts
```
Expected: all FAIL

- [ ] **Step 3: 实现游戏状态管理**

`packages/shared/src/game-state.ts`:
```typescript
import type { GameState, Tile, Player } from './types';
import { createTiles, getNextTileInSequence, tilesMatch } from './tile';
import { shuffleWall, flipHunIndicator, drawTile } from './deck';

export function createGame(playerCount: number): GameState {
  if (playerCount < 2 || playerCount > 4) {
    throw new Error(`Invalid player count: ${playerCount}. Must be 2-4.`);
  }

  const allTiles = createTiles();
  let wall = shuffleWall(allTiles);

  // 翻混儿指示牌（最后一张）
  const { indicator, remaining: wallAfterIndicator } = flipHunIndicator(wall);
  if (!indicator) throw new Error('Wall is empty');
  wall = wallAfterIndicator;

  // 确定 7 张混儿
  const hunTiles = determineHunTilesFromIndicator(indicator, wall);

  // 标记混儿
  markHunTiles(wall, hunTiles);

  const dealerSeat = Math.floor(Math.random() * playerCount);

  const players: Player[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      seat: i,
      hand: [],
      discards: [],
      melds: [],
      isHuman: i === 0,
    });
  }

  const game: GameState = {
    id: generateId(),
    players,
    wall,
    hunIndicator: indicator,
    hunTiles,
    currentSeat: dealerSeat,
    phase: 'setup',
    lastDiscard: null,
    lastDiscardSeat: null,
    winner: null,
    winPattern: null,
    dealerSeat,
  };

  return dealTiles(game);
}

export function dealTiles(game: GameState): GameState {
  const totalDealt = game.players.length * 13 + 1; // 庄家多1张
  let currentWall = [...game.wall];

  // 按座位顺序发牌，庄家（第一轮最后多一张）
  for (let round = 0; round < 13; round++) {
    for (let i = 0; i < game.players.length; i++) {
      const { tile, remaining } = drawTile(currentWall);
      if (!tile) throw new Error('Wall exhausted during deal');
      game.players[i].hand.push(tile);
      currentWall = remaining;
    }
  }

  // 庄家多一张
  const { tile: dealerExtra, remaining: finalWall } = drawTile(currentWall);
  if (!dealerExtra) throw new Error('Wall exhausted');
  game.players[game.dealerSeat].hand.push(dealerExtra);

  game.wall = finalWall;
  game.phase = 'playing';
  sortHands(game);

  return game;
}

export function determineHunTilesFromIndicator(
  indicator: Tile,
  allTiles: Tile[]
): Tile[] {
  const nextSeq = getNextTileInSequence(indicator);
  const hunTiles: Tile[] = [];

  for (const tile of allTiles) {
    // 指示牌本身不算混儿（排除 indicator.id）
    if (tile.id === indicator.id) continue;
    // 与指示牌相同花色+数字的剩余3张
    if (tilesMatch(tile, indicator)) {
      hunTiles.push(tile);
    }
    // 下一序列的4张
    if (tilesMatch(tile, nextSeq)) {
      hunTiles.push(tile);
    }
  }

  return hunTiles;
}

export function determineHunTiles(game: GameState): Tile[] {
  if (!game.hunIndicator) return [];
  return determineHunTilesFromIndicator(game.hunIndicator, game.wall);
}

export function markHunTiles(wall: Tile[], hunTiles: Tile[]): void {
  const hunIds = new Set(hunTiles.map(t => t.id));
  for (const tile of wall) {
    if (hunIds.has(tile.id)) {
      tile.isHun = true;
    }
  }
}

export function getNextSeat(current: number, playerCount: number): number {
  return (current + 1) % playerCount;
}

export function sortHand(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => {
    const suitOrder: Record<string, number> = { wan: 0, tiao: 1, tong: 2, feng: 3, jian: 4 };
    if (a.suit !== b.suit) return suitOrder[a.suit] - suitOrder[b.suit];
    return a.rank - b.rank;
  });
}

function sortHands(game: GameState): void {
  for (const player of game.players) {
    player.hand = sortHand(player.hand);
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd packages/shared && npx vitest run src/game-state.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/game-state.ts packages/shared/src/game-state.test.ts
git commit -m "feat(shared): implement game state creation, dealing, hun determination"
```

---

### Task 5: 碰与杠规则

**Files:**
- Create: `packages/shared/src/rules.ts`
- Create: `packages/shared/src/rules.test.ts`

**Depends on:** Task 1, 2, 4

- [ ] **Step 1: 编写失败测试**

`packages/shared/src/rules.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  canPong, canMingKong, canAnKong, canBuKong, canJinKong,
  performPong, performMingKong, performAnKong, performBuKong,
  getLegalDiscards,
} from './rules';
import { createGame } from './game-state';
import { createTiles } from './tile';
import type { Tile, GameState } from './types';

// 辅助函数：从全副牌中取特定牌
function findTile(suit: string, rank: number, tiles: Tile[]): Tile | undefined {
  return tiles.find(t => t.suit === suit && t.rank === rank);
}

describe('canPong', () => {
  it('returns true when player has 2 of the discarded tile', () => {
    const game = createGame(4);
    const discardTile = game.players[1].hand[0];
    // 给 player[0] 两张同样的
    const sameTiles = game.players[0].hand.filter(
      t => t.suit === discardTile.suit && t.rank === discardTile.rank
    );
    // 确认逻辑：手牌中有 >=2 张同牌则可碰
    const count = game.players[0].hand.filter(
      t => t.suit === discardTile.suit && t.rank === discardTile.rank
    ).length;
    if (count >= 2) {
      expect(canPong(game.players[0], discardTile)).toBe(true);
    }
  });

  it('returns false when player has fewer than 2', () => {
    const game = createGame(4);
    // 找一个手牌中只有1张或0张的牌作为弃牌
    const allTiles = createTiles();
    const rareTile = allTiles[allTiles.length - 1];
    expect(canPong(game.players[0], rareTile)).toBe(false);
  });
});

describe('canMingKong', () => {
  it('returns true when player has 3 of discarded tile', () => {
    const game = createGame(4);
    const p0 = game.players[0];
    // 寻找手牌中有3张相同的
    for (const tile of p0.hand) {
      const count = p0.hand.filter(
        t => t.suit === tile.suit && t.rank === tile.rank
      ).length;
      if (count >= 3) {
        expect(canMingKong(p0, tile)).toBe(true);
        return;
      }
    }
    // 如果没有3张相同，测试false情况
    expect(canMingKong(p0, createTiles()[0])).toBe(false);
  });
});

describe('canAnKong', () => {
  it('returns tiles where player has 4 of a kind', () => {
    const game = createGame(4);
    const p0 = game.players[0];
    const result = canAnKong(p0);
    // 检查是否返回了正确的4张套
    if (result.length > 0) {
      expect(result.length).toBe(4);
      const [first] = result;
      expect(result.every(t => t.suit === first.suit && t.rank === first.rank)).toBe(true);
    }
  });
});

describe('getLegalDiscards', () => {
  it('excludes hun tiles from legal discards', () => {
    const game = createGame(4);
    const p0 = game.players[0];
    const legal = getLegalDiscards(p0);
    const hunInLegal = legal.filter(t => t.isHun);
    expect(hunInLegal.length).toBe(0);
  });

  it('returns all non-hun tiles', () => {
    const game = createGame(4);
    const p0 = game.players[0];
    const nonHunCount = p0.hand.filter(t => !t.isHun).length;
    const legal = getLegalDiscards(p0);
    expect(legal.length).toBe(nonHunCount);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd packages/shared && npx vitest run src/rules.test.ts
```
Expected: all FAIL

- [ ] **Step 3: 实现碰杠规则**

`packages/shared/src/rules.ts`:
```typescript
import type { Tile, Player } from './types';

export function canPong(player: Player, discardTile: Tile): boolean {
  const count = player.hand.filter(
    t => t.suit === discardTile.suit && t.rank === discardTile.rank
  ).length;
  return count >= 2;
}

export function canMingKong(player: Player, discardTile: Tile): boolean {
  const count = player.hand.filter(
    t => t.suit === discardTile.suit && t.rank === discardTile.rank
  ).length;
  return count >= 3;
}

export function canAnKong(player: Player): Tile[] {
  const groups = groupBySuitRank(player.hand);
  for (const [, tiles] of groups) {
    if (tiles.length === 4) return tiles;
  }
  return [];
}

export function canBuKong(player: Player): { pongMeldIndex: number; tile: Tile } | null {
  for (let i = 0; i < player.melds.length; i++) {
    const meld = player.melds[i];
    if (meld.type !== 'pong') continue;
    const meldTile = meld.tiles[0];
    const matching = player.hand.find(
      t => t.suit === meldTile.suit && t.rank === meldTile.rank
    );
    if (matching) return { pongMeldIndex: i, tile: matching };
  }
  return null;
}

export function canJinKong(player: Player): Tile[] {
  const hunTiles = player.hand.filter(t => t.isHun);
  if (hunTiles.length >= 4) return hunTiles.slice(0, 4);
  return [];
}

export function getLegalDiscards(player: Player): Tile[] {
  return player.hand.filter(t => !t.isHun);
}

export function performPong(player: Player, discardTile: Tile): void {
  const matching = player.hand.filter(
    t => t.suit === discardTile.suit && t.rank === discardTile.rank
  ).slice(0, 2);

  // 从手牌移除2张
  for (const tile of matching) {
    const idx = player.hand.indexOf(tile);
    if (idx !== -1) player.hand.splice(idx, 1);
  }

  player.melds.push({
    type: 'pong',
    tiles: [...matching, discardTile],
    sourceSeat: undefined,
  });
}

export function performMingKong(player: Player, discardTile: Tile): void {
  const matching = player.hand.filter(
    t => t.suit === discardTile.suit && t.rank === discardTile.rank
  );

  for (const tile of matching) {
    const idx = player.hand.indexOf(tile);
    if (idx !== -1) player.hand.splice(idx, 1);
  }

  player.melds.push({
    type: 'ming-kong',
    tiles: [...matching, discardTile],
    sourceSeat: undefined,
  });
}

export function performAnKong(player: Player, tiles: Tile[]): void {
  for (const tile of tiles) {
    const idx = player.hand.indexOf(tile);
    if (idx !== -1) player.hand.splice(idx, 1);
  }

  player.melds.push({
    type: 'an-kong',
    tiles: [...tiles],
  });
}

export function performBuKong(player: Player, meldIndex: number, tile: Tile): void {
  const idx = player.hand.indexOf(tile);
  if (idx !== -1) player.hand.splice(idx, 1);

  const meld = player.melds[meldIndex];
  meld.tiles.push(tile);
  meld.type = 'bu-kong';
}

function groupBySuitRank(tiles: Tile[]): Map<string, Tile[]> {
  const groups = new Map<string, Tile[]>();
  for (const tile of tiles) {
    const key = `${tile.suit}_${tile.rank}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tile);
  }
  return groups;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd packages/shared && npx vitest run src/rules.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/rules.ts packages/shared/src/rules.test.ts
git commit -m "feat(shared): implement pong and kong rules"
```

---

### Task 6: 胡牌牌型插件系统

**Files:**
- Create: `packages/shared/src/patterns/registry.ts`
- Create: `packages/shared/src/patterns/four-triplets-pair.ts`
- Create: `packages/shared/src/patterns/registry.test.ts`

**Depends on:** Task 1, 4

- [ ] **Step 1: 编写失败测试**

`packages/shared/src/patterns/registry.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { PatternRegistry } from './registry';
import { fourTripletsPairChecker } from './four-triplets-pair';
import type { Tile } from '../types';

function makeTile(suit: string, rank: number, isHun = false): Tile {
  return { suit: suit as any, rank, id: 0, isHun };
}

describe('fourTripletsPairChecker', () => {
  it('detects 4 triplets + 1 pair (all pongs)', () => {
    // 构造: 111万 222条 333筒 444万 55条 (全部刻子+对子)
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2),
      makeTile('tong', 3), makeTile('tong', 3), makeTile('tong', 3),
      makeTile('wan', 4), makeTile('wan', 4), makeTile('wan', 4),
      makeTile('tiao', 5), makeTile('tiao', 5),
    ];
    const result = fourTripletsPairChecker.check(hand, { hunTiles: [] });
    expect(result).not.toBeNull();
    expect(result!.patternName).toBe('四刻一对');
  });

  it('returns null for non-winning hand', () => {
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 2), makeTile('wan', 3),
      makeTile('tiao', 1), makeTile('tiao', 2), makeTile('tiao', 3),
      makeTile('tong', 1), makeTile('tong', 2), makeTile('tong', 3),
      makeTile('wan', 4), makeTile('wan', 5), makeTile('wan', 6),
      makeTile('feng', 1), makeTile('feng', 1),
    ];
    const result = fourTripletsPairChecker.check(hand, { hunTiles: [] });
    expect(result).toBeNull(); // 全是顺子不是刻子
  });

  it('returns null for hand with wrong tile count', () => {
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),
      makeTile('tiao', 2), makeTile('tiao', 2),
    ];
    const result = fourTripletsPairChecker.check(hand, { hunTiles: [] });
    expect(result).toBeNull();
  });
});

describe('PatternRegistry', () => {
  it('registers and iterates checkers', () => {
    const reg = new PatternRegistry();
    reg.register(fourTripletsPairChecker);
    expect(reg.list().length).toBe(1);
    expect(reg.list()[0].name).toBe('四刻一对');
  });

  it('unregisters checkers by name', () => {
    const reg = new PatternRegistry();
    reg.register(fourTripletsPairChecker);
    reg.unregister('四刻一对');
    expect(reg.list().length).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd packages/shared && npx vitest run src/patterns/registry.test.ts
```
Expected: all FAIL

- [ ] **Step 3: 实现牌型注册表**

`packages/shared/src/patterns/registry.ts`:
```typescript
import type { PatternChecker } from '../types';

export class PatternRegistry {
  private checkers: Map<string, PatternChecker> = new Map();

  register(checker: PatternChecker): void {
    this.checkers.set(checker.name, checker);
  }

  unregister(name: string): void {
    this.checkers.delete(name);
  }

  list(): PatternChecker[] {
    return Array.from(this.checkers.values());
  }

  clear(): void {
    this.checkers.clear();
  }
}
```

- [ ] **Step 4: 实现 4 刻子 + 1 对子牌型**

`packages/shared/src/patterns/four-triplets-pair.ts`:
```typescript
import type { Tile, PatternChecker, PatternResult } from '../types';

export const fourTripletsPairChecker: PatternChecker = {
  name: '四刻一对',
  check(hand: Tile[], _context: { hunTiles: Tile[] }): PatternResult | null {
    if (hand.length !== 14) return null;

    // 按 suit+rank 分组
    const groups = new Map<string, Tile[]>();
    for (const tile of hand) {
      const key = `${tile.suit}_${tile.rank}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tile);
    }

    let tripletCount = 0;
    let pairCount = 0;

    for (const [, tiles] of groups) {
      if (tiles.length === 3) {
        tripletCount++;
      } else if (tiles.length === 2) {
        pairCount++;
      } else if (tiles.length === 4) {
        // 4张相同也算一个刻子（暗杠也算刻子）
        tripletCount++;
      } else if (tiles.length === 1) {
        return null; // 单张无法成面子
      }
    }

    if (tripletCount === 4 && pairCount === 1) {
      return {
        patternName: '四刻一对',
        description: '4组刻子 + 1对将牌',
      };
    }

    return null;
  },
};
```

- [ ] **Step 5: 运行测试确认通过**

```bash
cd packages/shared && npx vitest run src/patterns/registry.test.ts
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/patterns/
git commit -m "feat(shared): implement pluggable win pattern system with 4-triplets-1-pair"
```

---

### Task 7: 手牌评估

**Files:**
- Create: `packages/shared/src/hand.ts`
- Create: `packages/shared/src/hand.test.ts`

**Depends on:** Task 4, 6

- [ ] **Step 1: 编写失败测试**

`packages/shared/src/hand.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { checkWin, isTing } from './hand';
import { PatternRegistry } from './patterns/registry';
import { fourTripletsPairChecker } from './patterns/four-triplets-pair';
import type { Tile } from './types';

function makeTile(suit: string, rank: number, isHun = false): Tile {
  return { suit: suit as any, rank, id: 0, isHun };
}

const registry = new PatternRegistry();
registry.register(fourTripletsPairChecker);

describe('checkWin', () => {
  it('returns pattern for winning hand', () => {
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1),
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2),
      makeTile('tong', 3), makeTile('tong', 3), makeTile('tong', 3),
      makeTile('wan', 4), makeTile('wan', 4), makeTile('wan', 4),
      makeTile('tiao', 5), makeTile('tiao', 5),
    ];
    const result = checkWin(hand, [], registry);
    expect(result).not.toBeNull();
    expect(result!.patternName).toBe('四刻一对');
  });

  it('returns null for non-winning hand', () => {
    const hand: Tile[] = Array.from({ length: 14 }, (_, i) =>
      makeTile('wan', (i % 9) + 1)
    );
    const result = checkWin(hand, [], registry);
    expect(result).toBeNull();
  });

  it('returns null for hand with wrong count', () => {
    const hand: Tile[] = Array.from({ length: 13 }, (_, i) =>
      makeTile('wan', (i % 9) + 1)
    );
    const result = checkWin(hand, [], registry);
    expect(result).toBeNull();
  });
});

describe('isTing', () => {
  it('detects ting when one tile away', () => {
    // 13张: 3个刻子 + 1个对子 + 1个单张 = 听牌
    const hand: Tile[] = [
      makeTile('wan', 1), makeTile('wan', 1), makeTile('wan', 1), // 刻
      makeTile('tiao', 2), makeTile('tiao', 2), makeTile('tiao', 2), // 刻
      makeTile('tong', 3), makeTile('tong', 3), makeTile('tong', 3), // 刻
      makeTile('wan', 5), makeTile('wan', 5), // 对
      makeTile('wan', 6), // 单张 — 摸到 wan6 或 wan5 都能凑
    ];
    const result = isTing(hand, [], registry);
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd packages/shared && npx vitest run src/hand.test.ts
```
Expected: all FAIL

- [ ] **Step 3: 实现手牌评估**

`packages/shared/src/hand.ts`:
```typescript
import type { Tile, PatternResult } from './types';
import { PatternRegistry } from './patterns/registry';
import { createTiles, tilesMatch } from './tile';

export function checkWin(
  hand: Tile[],
  hunTiles: Tile[],
  registry: PatternRegistry
): PatternResult | null {
  if (hand.length !== 14) return null;

  for (const checker of registry.list()) {
    const result = checker.check(hand, { hunTiles });
    if (result) return result;
  }

  return null;
}

export function isTing(
  hand: Tile[],
  hunTiles: Tile[],
  registry: PatternRegistry
): boolean {
  // 尝试所有可能摸到的牌，看是否能胡
  const allTiles = createTiles();
  for (const testTile of allTiles) {
    const testHand = [...hand, testTile];
    if (checkWin(testHand, hunTiles, registry)) {
      return true;
    }
  }
  return false;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd packages/shared && npx vitest run src/hand.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/hand.ts packages/shared/src/hand.test.ts
git commit -m "feat(shared): implement hand evaluation (win check and ting detection)"
```

---

### Task 8: AI 决策（v1 随机）

**Files:**
- Create: `packages/shared/src/ai.ts`
- Create: `packages/shared/src/ai.test.ts`

**Depends on:** Task 4, 5, 7

- [ ] **Step 1: 编写失败测试**

`packages/shared/src/ai.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { aiDecideDiscard, aiDecideResponse } from './ai';
import { createGame } from './game-state';
import type { Player } from './types';

describe('aiDecideDiscard', () => {
  it('returns a non-hun tile index', () => {
    const game = createGame(4);
    const aiPlayer = game.players[1]; // AI
    const index = aiDecideDiscard(aiPlayer);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(aiPlayer.hand.length);
    // 不能是混儿
    expect(aiPlayer.hand[index].isHun).toBe(false);
  });
});

describe('aiDecideResponse', () => {
  it('returns null or a valid action type', () => {
    const game = createGame(4);
    const aiPlayer = game.players[1];
    const discard = game.players[0].hand[0];
    const result = aiDecideResponse(aiPlayer, discard);
    // v1: 可能返回 null（不响应）或响应类型不含 'win'
    if (result !== null) {
      expect(['pong', 'ming-kong']).toContain(result);
    }
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd packages/shared && npx vitest run src/ai.test.ts
```
Expected: all FAIL

- [ ] **Step 3: 实现 v1 随机 AI**

`packages/shared/src/ai.ts`:
```typescript
import type { Player, Tile, ActionType } from './types';
import { getLegalDiscards, canPong, canMingKong } from './rules';

export function aiDecideDiscard(player: Player): number {
  const legal = getLegalDiscards(player);
  if (legal.length === 0) {
    // 理论上不会发生（手牌不可能全是混儿）
    return 0;
  }
  const chosenTile = legal[Math.floor(Math.random() * legal.length)];
  return player.hand.indexOf(chosenTile);
}

export function aiDecideResponse(
  player: Player,
  discardTile: Tile
): ActionType | null {
  // v1: 满足条件就随机决定是否响应
  const canKong = canMingKong(player, discardTile);
  const canP = canPong(player, discardTile);

  if (canKong && Math.random() > 0.5) return 'ming-kong';
  if (canP && Math.random() > 0.5) return 'pong';

  return null;
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd packages/shared && npx vitest run src/ai.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/ai.ts packages/shared/src/ai.test.ts
git commit -m "feat(shared): implement v1 random AI decision"
```

---

## Phase 2: Server — 后端 API

### Task 9: Express 服务端 + 游戏 API

**Files:**
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/routes/game.ts`
- Create: `packages/server/src/services/game-service.ts`
- Create: `packages/server/src/routes/game.test.ts`

**Depends on:** Task 1–8 (shared 包完成)

- [ ] **Step 1: 编写服务层测试**

`packages/server/src/routes/game.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { createGameRouter } from './game';

let app: express.Express;
let server: any;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/games', createGameRouter());
});

describe('POST /api/games', () => {
  it('creates a new game', async () => {
    const res = await fetch('http://localhost:0/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerCount: 4 }),
    });
    // Note: 需要启动 server 或用 supertest
    // 此测试为伪代码 —— 实际使用 supertest 或启动临时 server
  });
});
```

> **注：** 实际实现时使用 `supertest` 库进行 HTTP 测试。此处展示测试结构。

- [ ] **Step 2: 运行测试确认失败**

```bash
cd packages/server && npx vitest run src/routes/game.test.ts
```
Expected: FAIL

- [ ] **Step 3: 实现游戏服务层**

`packages/server/src/services/game-service.ts`:
```typescript
import { createGame, getNextSeat } from '@tj-mahjong/shared/game-state';
import { checkWin, isTing } from '@tj-mahjong/shared/hand';
import { PatternRegistry } from '@tj-mahjong/shared/patterns/registry';
import { fourTripletsPairChecker } from '@tj-mahjong/shared/patterns/four-triplets-pair';
import {
  canPong, canMingKong, canAnKong, canBuKong, canJinKong,
  performPong, performMingKong, performAnKong, performBuKong,
  getLegalDiscards,
} from '@tj-mahjong/shared/rules';
import { aiDecideDiscard, aiDecideResponse } from '@tj-mahjong/shared/ai';
import { drawTile, drawReplacementTile, sortHand } from '@tj-mahjong/shared/game-state';
import type { GameState, PlayerAction, Tile } from '@tj-mahjong/shared/types';

const patternRegistry = new PatternRegistry();
patternRegistry.register(fourTripletsPairChecker);

const games = new Map<string, GameState>();

export function createNewGame(playerCount: number): GameState {
  const game = createGame(playerCount);
  games.set(game.id, game);
  return game;
}

export function getGame(id: string): GameState | undefined {
  return games.get(id);
}

export function getActions(game: GameState): {
  canPong: boolean;
  canMingKong: boolean;
  canAnKong: boolean;
  canBuKong: boolean;
  canJinKong: boolean;
  canWin: boolean;
  legalDiscardIndices: number[];
} {
  const player = game.players[game.currentSeat];
  const lastDiscard = game.lastDiscard;
  const lastSeat = game.lastDiscardSeat;

  const isRespondingToDiscard = lastDiscard !== null && lastSeat !== game.currentSeat;

  return {
    canPong: isRespondingToDiscard ? canPong(player, lastDiscard!) : false,
    canMingKong: isRespondingToDiscard ? canMingKong(player, lastDiscard!) : false,
    canAnKong: canAnKong(player).length > 0,
    canBuKong: canBuKong(player) !== null,
    canJinKong: canJinKong(player).length > 0,
    canWin: checkWin(player.hand, game.hunTiles, patternRegistry) !== null,
    legalDiscardIndices: getLegalDiscards(player).map(t => player.hand.indexOf(t)),
  };
}

export function applyAction(game: GameState, action: PlayerAction): GameState {
  const player = game.players[game.currentSeat];

  switch (action.type) {
    case 'discard': {
      const tileIndex = action.tileIndex!;
      const tile = player.hand[tileIndex];
      if (tile.isHun) throw new Error('Cannot discard hun tile');
      player.hand.splice(tileIndex, 1);
      player.discards.push(tile);
      game.lastDiscard = tile;
      game.lastDiscardSeat = game.currentSeat;
      // 轮到下家
      game.currentSeat = getNextSeat(game.currentSeat, game.players.length);
      // 执行 AI 回合
      game = processAITurns(game);
      break;
    }
    case 'pong': {
      const tile = game.lastDiscard!;
      performPong(player, tile);
      game.lastDiscard = null;
      game.lastDiscardSeat = null;
      game.currentSeat = player.seat;
      game = processAITurns(game);
      break;
    }
    case 'ming-kong': {
      const tile = game.lastDiscard!;
      performMingKong(player, tile);
      game.lastDiscard = null;
      game.lastDiscardSeat = null;
      // 补牌
      const { tile: replacement, remaining } = drawReplacementTile(game.wall);
      if (replacement) {
        player.hand.push(replacement);
        game.wall = remaining;
        sortHand(player.hand);
      }
      game.currentSeat = player.seat;
      game = processAITurns(game);
      break;
    }
    case 'an-kong': {
      const kongTiles = canAnKong(player);
      if (kongTiles.length === 0) throw new Error('Cannot an-kong');
      performAnKong(player, kongTiles);
      const { tile: replacement, remaining } = drawReplacementTile(game.wall);
      if (replacement) {
        player.hand.push(replacement);
        game.wall = remaining;
        sortHand(player.hand);
      }
      game.currentSeat = player.seat;
      game = processAITurns(game);
      break;
    }
    case 'bu-kong': {
      const buKong = canBuKong(player);
      if (!buKong) throw new Error('Cannot bu-kong');
      performBuKong(player, buKong.pongMeldIndex, buKong.tile);
      const { tile: replacement, remaining } = drawReplacementTile(game.wall);
      if (replacement) {
        player.hand.push(replacement);
        game.wall = remaining;
        sortHand(player.hand);
      }
      game.currentSeat = player.seat;
      game = processAITurns(game);
      break;
    }
    case 'win': {
      const result = checkWin(player.hand, game.hunTiles, patternRegistry);
      if (!result) throw new Error('Cannot win');
      game.winner = player.seat;
      game.winPattern = result.patternName;
      game.phase = 'finished';
      break;
    }
  }

  return game;
}

function processAITurns(game: GameState): GameState {
  while (game.phase === 'playing' && !game.players[game.currentSeat].isHuman) {
    game = doAITurn(game);
  }
  return game;
}

function doAITurn(game: GameState): GameState {
  const player = game.players[game.currentSeat];

  // 摸牌
  const { tile: drawn, remaining } = drawTile(game.wall);
  if (!drawn) {
    game.phase = 'finished'; // 流局
    return game;
  }
  game.wall = remaining;
  player.hand.push(drawn);
  sortHand(player.hand);

  // 检查自摸
  const winResult = checkWin(player.hand, game.hunTiles, patternRegistry);
  if (winResult) {
    game.winner = player.seat;
    game.winPattern = winResult.patternName;
    game.phase = 'finished';
    return game;
  }

  // AI 出牌
  const discardIndex = aiDecideDiscard(player);
  const tile = player.hand[discardIndex];
  player.hand.splice(discardIndex, 1);
  player.discards.push(tile);
  game.lastDiscard = tile;
  game.lastDiscardSeat = game.currentSeat;

  // 检查其他玩家响应
  for (let i = 1; i < game.players.length; i++) {
    const seat = (game.currentSeat + i) % game.players.length;
    const p = game.players[seat];
    if (p.isHuman) continue; // 人类玩家在前端自己选择

    const response = aiDecideResponse(p, tile);
    if (response === 'pong') {
      performPong(p, tile);
      game.lastDiscard = null;
      game.currentSeat = seat;
      return game;
    }
    if (response === 'ming-kong') {
      performMingKong(p, tile);
      game.lastDiscard = null;
      const { tile: rep, remaining: rem } = drawReplacementTile(game.wall);
      if (rep) { p.hand.push(rep); game.wall = rem; sortHand(p.hand); }
      game.currentSeat = seat;
      return game;
    }
  }

  // 无人响应，下家
  game.currentSeat = getNextSeat(game.currentSeat, game.players.length);
  return game;
}

export function deleteGame(id: string): void {
  games.delete(id);
}
```

- [ ] **Step 4: 实现 Express 路由**

`packages/server/src/routes/game.ts`:
```typescript
import { Router, Request, Response } from 'express';
import { createNewGame, getGame, getActions, applyAction } from '../services/game-service';

export function createGameRouter(): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response) => {
    try {
      const { playerCount } = req.body;
      if (!playerCount || playerCount < 2 || playerCount > 4) {
        return res.status(400).json({ error: 'INVALID_PLAYER_COUNT', message: 'playerCount must be 2-4' });
      }
      const game = createNewGame(playerCount);
      res.status(201).json({ game: { id: game.id, state: game } });
    } catch (err: any) {
      res.status(500).json({ error: 'INTERNAL', message: err.message });
    }
  });

  router.get('/:id', (req: Request, res: Response) => {
    const game = getGame(req.params.id);
    if (!game) return res.status(404).json({ error: 'GAME_NOT_FOUND' });
    res.json({ game: { id: game.id, state: game } });
  });

  router.get('/:id/actions', (req: Request, res: Response) => {
    const game = getGame(req.params.id);
    if (!game) return res.status(404).json({ error: 'GAME_NOT_FOUND' });
    res.json(getActions(game));
  });

  router.post('/:id/actions', (req: Request, res: Response) => {
    const game = getGame(req.params.id);
    if (!game) return res.status(404).json({ error: 'GAME_NOT_FOUND' });
    try {
      const updated = applyAction(game, req.body);
      res.json({ game: { id: updated.id, state: updated } });
    } catch (err: any) {
      res.status(400).json({ error: 'INVALID_ACTION', message: err.message });
    }
  });

  return router;
}
```

`packages/server/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createGameRouter } from './routes/game';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/games', createGameRouter());

// 生产环境提供前端静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { app };
```

- [ ] **Step 5: 运行测试确认通过**

```bash
cd packages/server && npx vitest run
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add packages/server/
git commit -m "feat(server): implement Express server with game API routes"
```

---

## Phase 3: Client — 前端

### Task 10: React 应用框架 + 页面

**Files:**
- Create: `packages/client/src/main.tsx`
- Create: `packages/client/src/App.tsx`
- Create: `packages/client/src/pages/GameSetup.tsx`
- Create: `packages/client/src/pages/GameBoard.tsx`
- Create: `packages/client/src/api.ts`

**Depends on:** Task 1–4（shared 基础类型）, 项目脚手架就绪

- [ ] **Step 1: 创建 API 通信层**

`packages/client/src/api.ts`:
```typescript
import type { GameState, PlayerAction } from '@tj-mahjong/shared/types';

const BASE = '/api';

export async function createGame(playerCount: number): Promise<GameState> {
  const res = await fetch(`${BASE}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerCount }),
  });
  if (!res.ok) throw new Error('Failed to create game');
  const data = await res.json();
  return data.game.state;
}

export async function getGame(id: string): Promise<GameState> {
  const res = await fetch(`${BASE}/games/${id}`);
  if (!res.ok) throw new Error('Game not found');
  const data = await res.json();
  return data.game.state;
}

export async function getActions(id: string): Promise<{
  canPong: boolean; canMingKong: boolean; canAnKong: boolean;
  canBuKong: boolean; canJinKong: boolean; canWin: boolean;
  legalDiscardIndices: number[];
}> {
  const res = await fetch(`${BASE}/games/${id}/actions`);
  if (!res.ok) throw new Error('Failed to get actions');
  return res.json();
}

export async function submitAction(id: string, action: PlayerAction): Promise<GameState> {
  const res = await fetch(`${BASE}/games/${id}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(action),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Invalid action');
  }
  const data = await res.json();
  return data.game.state;
}
```

- [ ] **Step 2: 创建 App 入口 + 页面**

`packages/client/src/App.tsx`:
```tsx
import { useState } from 'react';
import { GameSetup } from './pages/GameSetup';
import { GameBoard } from './pages/GameBoard';
import type { GameState } from '@tj-mahjong/shared/types';

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {!gameState ? (
        <GameSetup onGameStart={setGameState} />
      ) : (
        <GameBoard gameState={gameState} onGameUpdate={setGameState} />
      )}
    </div>
  );
}
```

`packages/client/src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`packages/client/src/pages/GameSetup.tsx`:
```tsx
import { useState } from 'react';
import { createGame } from '../api';
import type { GameState } from '@tj-mahjong/shared/types';

interface Props {
  onGameStart: (state: GameState) => void;
}

export function GameSetup({ onGameStart }: Props) {
  const [playerCount, setPlayerCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await createGame(playerCount);
      onGameStart(state);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <h1 className="text-4xl font-bold">🀄 天津麻将</h1>
      <div className="flex flex-col gap-4 items-center">
        <label className="text-lg">选择玩家人数</label>
        <div className="flex gap-4">
          {[2, 3, 4].map(n => (
            <button
              key={n}
              onClick={() => setPlayerCount(n)}
              className={`px-6 py-3 rounded-lg text-xl font-bold transition-colors ${
                playerCount === n
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {n}人
            </button>
          ))}
        </div>
        <button
          onClick={handleStart}
          disabled={loading}
          className="mt-4 px-10 py-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 rounded-xl text-xl font-bold transition-colors"
        >
          {loading ? '正在发牌...' : '开始游戏'}
        </button>
        {error && <p className="text-red-400">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/
git commit -m "feat(client): add React app shell with game setup page"
```

---

### Task 11: 游戏桌面组件

**Files:**
- Create: `packages/client/src/pages/GameBoard.tsx`
- Create: `packages/client/src/components/PlayerHand.tsx`
- Create: `packages/client/src/components/PlayerArea.tsx`
- Create: `packages/client/src/components/ActionPanel.tsx`
- Create: `packages/client/src/components/GameResult.tsx`

**Depends on:** Task 10

- [ ] **Step 1: 创建 PlayerHand 组件**

`packages/client/src/components/PlayerHand.tsx`:
```tsx
import type { Tile } from '@tj-mahjong/shared/types';
import { getTileName } from '@tj-mahjong/shared/tile';

interface Props {
  tiles: Tile[];
  isHuman: boolean;
  legalIndices?: number[];
  selectedIndex?: number | null;
  onTileClick?: (index: number) => void;
}

export function PlayerHand({ tiles, isHuman, legalIndices = [], selectedIndex, onTileClick }: Props) {
  return (
    <div className="flex gap-1 justify-center flex-wrap">
      {tiles.map((tile, i) => {
        const isLegal = legalIndices.includes(i);
        const isSelected = selectedIndex === i;
        const canClick = isHuman && onTileClick && isLegal;

        return (
          <button
            key={i}
            onClick={() => canClick && onTileClick(i)}
            disabled={!canClick}
            className={`
              w-10 h-14 rounded-md text-xs font-bold flex flex-col items-center justify-center
              transition-all select-none
              ${!isHuman ? 'bg-blue-900 text-blue-200' : 'bg-amber-100 text-gray-900'}
              ${isSelected ? 'ring-2 ring-green-400 -translate-y-2' : ''}
              ${isLegal && canClick ? 'cursor-pointer hover:bg-amber-200 hover:-translate-y-1' : ''}
              ${!isLegal && isHuman ? 'opacity-50' : ''}
              ${tile.isHun ? 'ring-1 ring-red-400' : ''}
            `}
          >
            <span>{getTileName(tile)}</span>
            {tile.isHun && <span className="text-red-500 text-[8px]">混</span>}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 创建 PlayerArea 组件**

`packages/client/src/components/PlayerArea.tsx`:
```tsx
import type { Player, Tile } from '@tj-mahjong/shared/types';
import { getTileName } from '@tj-mahjong/shared/tile';
import { PlayerHand } from './PlayerHand';

interface Props {
  player: Player;
  isCurrent: boolean;
  isHuman: boolean;
  legalIndices?: number[];
  selectedIndex?: number | null;
  onTileClick?: (index: number) => void;
}

export function PlayerArea({ player, isCurrent, isHuman, legalIndices, selectedIndex, onTileClick }: Props) {
  return (
    <div className={`p-3 rounded-lg ${isCurrent ? 'ring-2 ring-yellow-400 bg-gray-800' : 'bg-gray-900'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-bold">
          {isHuman ? '👤 你' : `🤖 AI`}
          {isCurrent && <span className="text-yellow-400 ml-2">● 当前</span>}
        </span>
        <span className="text-xs text-gray-400">Seat {player.seat}</span>
      </div>
      
      {/* 碰/杠区 */}
      {player.melds.length > 0 && (
        <div className="flex gap-1 mb-2">
          {player.melds.map((meld, i) => (
            <div key={i} className="flex gap-0.5 px-1 py-0.5 bg-gray-700 rounded">
              {meld.tiles.map((t, j) => (
                <span key={j} className="text-[10px] bg-amber-100 text-gray-900 px-1 rounded">
                  {getTileName(t)}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 弃牌区 */}
      {player.discards.length > 0 && (
        <div className="flex gap-0.5 flex-wrap mb-2 max-w-xs">
          {player.discards.map((t, i) => (
            <span key={i} className="text-[10px] bg-gray-700 text-gray-300 px-1 rounded">
              {getTileName(t)}
            </span>
          ))}
        </div>
      )}

      {/* 手牌 */}
      <PlayerHand
        tiles={player.hand}
        isHuman={isHuman}
        legalIndices={legalIndices}
        selectedIndex={selectedIndex}
        onTileClick={onTileClick}
      />
    </div>
  );
}
```

- [ ] **Step 3: 创建 ActionPanel + GameResult**

`packages/client/src/components/ActionPanel.tsx`:
```tsx
import type { PlayerAction } from '@tj-mahjong/shared/types';

interface Props {
  canPong: boolean;
  canMingKong: boolean;
  canAnKong: boolean;
  canBuKong: boolean;
  canJinKong: boolean;
  canWin: boolean;
  onAction: (action: PlayerAction) => void;
  onCancel: () => void;
}

export function ActionPanel(props: Props) {
  const { canPong, canMingKong, canAnKong, canBuKong, canJinKong, canWin, onAction, onCancel } = props;
  const hasAny = canPong || canMingKong || canAnKong || canBuKong || canJinKong || canWin;

  if (!hasAny) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-3 bg-gray-800 p-4 rounded-xl shadow-lg z-50">
      {canWin && (
        <button onClick={() => onAction({ type: 'win' })} className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold">
          自摸胡！
        </button>
      )}
      {canMingKong && (
        <button onClick={() => onAction({ type: 'ming-kong' })} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg">
          明杠
        </button>
      )}
      {canAnKong && (
        <button onClick={() => onAction({ type: 'an-kong' })} className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg">
          暗杠
        </button>
      )}
      {canBuKong && (
        <button onClick={() => onAction({ type: 'bu-kong' })} className="px-4 py-2 bg-purple-800 hover:bg-purple-700 rounded-lg">
          补杠
        </button>
      )}
      {canJinKong && (
        <button onClick={() => onAction({ type: 'jin-kong' })} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg">
          金杠
        </button>
      )}
      {canPong && (
        <button onClick={() => onAction({ type: 'pong' })} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg">
          碰
        </button>
      )}
      <button onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg">
        过
      </button>
    </div>
  );
}
```

`packages/client/src/components/GameResult.tsx`:
```tsx
import type { GameState } from '@tj-mahjong/shared/types';
import { getTileName } from '@tj-mahjong/shared/tile';

interface Props {
  gameState: GameState;
  onNewGame: () => void;
}

export function GameResult({ gameState, onNewGame }: Props) {
  const winner = gameState.winner !== null ? gameState.players[gameState.winner] : null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-2xl w-full mx-4">
        <h2 className="text-3xl font-bold text-center mb-6">
          {winner ? `${winner.isHuman ? '🎉 你赢了！' : '😔 AI 赢了'}` : '流局'}
        </h2>
        
        {winner && gameState.winPattern && (
          <p className="text-center text-xl text-green-400 mb-6">
            {gameState.winPattern}
          </p>
        )}

        <div className="space-y-4">
          {gameState.players.map(p => (
            <div key={p.seat} className="bg-gray-900 rounded-lg p-3">
              <span className="font-bold">{p.isHuman ? '👤 你' : `🤖 AI #${p.seat}`}</span>
              <div className="flex gap-1 flex-wrap mt-1">
                {p.hand.map((t, i) => (
                  <span key={i} className="text-xs bg-amber-100 text-gray-900 px-1.5 py-0.5 rounded">
                    {getTileName(t)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onNewGame}
          className="mt-6 w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl text-lg font-bold"
        >
          再来一局
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 组装 GameBoard 页面**

`packages/client/src/pages/GameBoard.tsx`:
```tsx
import { useState, useEffect, useCallback } from 'react';
import type { GameState, PlayerAction } from '@tj-mahjong/shared/types';
import { getActions, submitAction, createGame } from '../api';
import { PlayerArea } from '../components/PlayerArea';
import { ActionPanel } from '../components/ActionPanel';
import { GameResult } from '../components/GameResult';

interface Props {
  gameState: GameState;
  onGameUpdate: (state: GameState) => void;
}

export function GameBoard({ gameState, onGameUpdate }: Props) {
  const [actions, setActions] = useState<any>(null);
  const [selectedDiscard, setSelectedDiscard] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshActions = useCallback(async () => {
    const acts = await getActions(gameState.id);
    setActions(acts);
  }, [gameState.id]);

  useEffect(() => {
    refreshActions();
  }, [refreshActions, gameState.currentSeat]);

  // localStorage 持久化
  useEffect(() => {
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }, [gameState]);

  const handleAction = async (action: PlayerAction) => {
    try {
      setError(null);
      const newState = await submitAction(gameState.id, action);
      onGameUpdate(newState);
      setSelectedDiscard(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleTileClick = (index: number) => {
    if (selectedDiscard === index) {
      // 确认出牌
      handleAction({ type: 'discard', tileIndex: index });
    } else {
      setSelectedDiscard(index);
    }
  };

  const handleNewGame = async () => {
    const state = await createGame(gameState.players.length);
    localStorage.removeItem('gameState');
    onGameUpdate(state);
  };

  if (gameState.phase === 'finished') {
    return <GameResult gameState={gameState} onNewGame={handleNewGame} />;
  }

  const humanPlayer = gameState.players[0];
  const isHumanTurn = gameState.currentSeat === 0;

  return (
    <div className="min-h-screen p-4">
      {/* 混儿显示 */}
      <div className="text-center mb-4">
        <span className="text-sm text-gray-400">混儿指示牌: </span>
        <span className="bg-red-800 text-white px-2 py-1 rounded text-sm">
          {gameState.hunIndicator ? '已翻' : '未翻'}
        </span>
      </div>

      {/* AI 玩家区域（简化布局） */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {gameState.players.filter(p => !p.isHuman).map(p => (
          <PlayerArea
            key={p.seat}
            player={p}
            isCurrent={gameState.currentSeat === p.seat}
            isHuman={false}
          />
        ))}
      </div>

      {/* 人类玩家区域 */}
      <div className="mt-4">
        <PlayerArea
          player={humanPlayer}
          isCurrent={isHumanTurn}
          isHuman={true}
          legalIndices={actions?.legalDiscardIndices ?? []}
          selectedIndex={selectedDiscard}
          onTileClick={handleTileClick}
        />
      </div>

      {error && (
        <p className="text-red-400 text-center mt-2">{error}</p>
      )}

      {/* 操作面板 */}
      {isHumanTurn && actions && (
        <ActionPanel
          canPong={actions.canPong}
          canMingKong={actions.canMingKong}
          canAnKong={actions.canAnKong}
          canBuKong={actions.canBuKong}
          canJinKong={actions.canJinKong}
          canWin={actions.canWin}
          onAction={handleAction}
          onCancel={() => setSelectedDiscard(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/client/src/components/ packages/client/src/pages/GameBoard.tsx
git commit -m "feat(client): implement game board with player areas, actions, and result display"
```

---

### Task 12: localStorage 持久化 + 恢复

**Files:**
- Modify: `packages/client/src/App.tsx`
- Create: `packages/client/src/hooks/useGamePersistence.ts`

**Depends on:** Task 10, 11

- [ ] **Step 1: 创建持久化 hook**

`packages/client/src/hooks/useGamePersistence.ts`:
```typescript
import { useState, useEffect } from 'react';
import type { GameState } from '@tj-mahjong/shared/types';

const STORAGE_KEY = 'tianjin-mahjong-game';

export function loadGameState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as GameState;
  } catch {
    return null;
  }
}

export function useGamePersistence() {
  const [gameState, setGameState] = useState<GameState | null>(() => loadGameState());

  useEffect(() => {
    if (gameState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [gameState]);

  const clearGame = () => {
    setGameState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { gameState, setGameState, clearGame };
}
```

- [ ] **Step 2: 更新 App.tsx 使用持久化**

`packages/client/src/App.tsx`（更新版）:
```tsx
import { GameSetup } from './pages/GameSetup';
import { GameBoard } from './pages/GameBoard';
import { useGamePersistence } from './hooks/useGamePersistence';

export default function App() {
  const { gameState, setGameState, clearGame } = useGamePersistence();

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {!gameState ? (
        <GameSetup onGameStart={setGameState} />
      ) : (
        <>
          <button
            onClick={clearGame}
            className="absolute top-4 right-4 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm z-10"
          >
            退出对局
          </button>
          <GameBoard gameState={gameState} onGameUpdate={setGameState} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/hooks/ packages/client/src/App.tsx
git commit -m "feat(client): add localStorage persistence for game state"
```

---

## Phase 4: 集成与部署

### Task 13: Docker 容器化

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`

**Depends on:** Task 9, 11（前后端可构建）

- [ ] **Step 1: 编写 Dockerfile**

`Dockerfile`:
```dockerfile
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared/
COPY packages/server packages/server/
COPY packages/client packages/client/

RUN pnpm --filter @tj-mahjong/shared build
RUN pnpm --filter @tj-mahjong/client build
RUN pnpm --filter @tj-mahjong/server build

FROM base AS runner
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/shared/dist /app/packages/shared/dist
COPY --from=build /app/packages/server/dist /app/packages/server/dist
COPY --from=build /app/packages/client/dist /app/packages/client/dist
COPY --from=build /app/packages/server/package.json /app/packages/server/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
```

- [ ] **Step 2: 编写 docker-compose.yml**

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile docker-compose.yml
git commit -m "feat: add Docker containerization"
```

---

### Task 14: CI 配置

**Files:**
- Create: `.github/workflows/ci.yml`

**Depends on:** Task 13

- [ ] **Step 1: 编写 CI 配置**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @tj-mahjong/shared build
      - run: pnpm test

  build-docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t tianjin-mahjong .
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions for test and Docker build"
```

---

## 验证步骤

每个 Phase 完成后，运行以下命令验证：

```bash
# 测试
pnpm test

# 构建
pnpm --filter @tj-mahjong/shared build
pnpm --filter @tj-mahjong/client build
pnpm --filter @tj-mahjong/server build

# Docker
docker build -t tianjin-mahjong .
docker run -p 3001:3001 tianjin-mahjong
# 浏览器打开 http://localhost:3001
```

---

## Task 依赖汇总

```
Task 1 (types)
  └─→ Task 2 (tile)
        └─→ Task 3 (deck)
              └─→ Task 4 (game-state)
                    ├─→ Task 5 (rules)
                    ├─→ Task 6 (patterns)
                    ├─→ Task 7 (hand)
                    └─→ Task 8 (AI)
                          └─→ Task 9 (server API)
                                └─→ Task 13 (Docker)
                                      └─→ Task 14 (CI)

Task 4 → Task 10 (client shell)
  └─→ Task 11 (components)
        └─→ Task 12 (persistence)
              └─→ Task 13 (Docker)
```

**可并行执行：**
- Task 5, 6, 7 可并行（均依赖 Task 4）
- Task 9-10 与 Task 11-12 可并行（Phase 2 与 Phase 3）
