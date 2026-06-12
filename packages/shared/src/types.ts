// ---------------------------------------------------------------------------
// Core type definitions for Tianjin Mahjong (天津麻将)
// Shared across server and client packages.
// ---------------------------------------------------------------------------

/** The five suit categories in Tianjin Mahjong. */
export type Suit = 'wan' | 'tiao' | 'tong' | 'feng' | 'jian';

/** A single mahjong tile. */
export interface Tile {
  suit: Suit;
  /** 万条筒: 1-9; 风(东南西北): 1-4; 箭(中发白): 1-3 */
  rank: number;
  /** Unique identifier 0-135 (34 tile types x 4 copies = 136 tiles). */
  id: number;
  /** Whether this tile is a 混儿 (wildcard). */
  isHun: boolean;
}

/** A seated player. */
export interface Player {
  /** 0-3, where 0 is the dealer (庄家). */
  seat: number;
  hand: Tile[];
  discards: Tile[];
  melds: Meld[];
  isHuman: boolean;
}

/** All valid meld types in Tianjin Mahjong. */
export type MeldType =
  | 'pong'
  | 'ming-kong'
  | 'an-kong'
  | 'bu-kong'
  | 'jin-kong';

/** A revealed meld (set) on the table. */
export interface Meld {
  type: MeldType;
  tiles: Tile[];
  /** Seat that discarded the tile that triggered this meld (undefined for an-kong). */
  sourceSeat?: number;
}

/** The current phase of a game. */
export type GamePhase = 'setup' | 'playing' | 'finished';

/** Complete game state for a single table. */
export interface GameState {
  id: string;
  players: Player[];
  wall: Tile[];
  /** The indicator tile that determines the 混儿. */
  hunIndicator: Tile | null;
  /** All tiles that are 混儿 (wildcards). */
  hunTiles: Tile[];
  currentSeat: number;
  phase: GamePhase;
  lastDiscard: Tile | null;
  lastDiscardSeat: number | null;
  /** Winning seat, if any. */
  winner: number | null;
  /** Name of the winning pattern, if any. */
  winPattern: string | null;
  dealerSeat: number;
}

/** All valid player action types. */
export type ActionType =
  | 'discard'
  | 'pong'
  | 'ming-kong'
  | 'an-kong'
  | 'bu-kong'
  | 'jin-kong'
  | 'win';

/** An action taken by a player. */
export interface PlayerAction {
  type: ActionType;
  /** Index into the player's hand, used for discard. */
  tileIndex?: number;
}

/** Result returned by a pattern checker. */
export interface PatternResult {
  patternName: string;
  description: string;
}

/** A pluggable win-pattern checker function. */
export interface PatternChecker {
  name: string;
  check(hand: Tile[], context: { hunTiles: Tile[] }): PatternResult | null;
}
