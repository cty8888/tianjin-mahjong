// ---------------------------------------------------------------------------
// Deck operations for Tianjin Mahjong (天津麻将)
// Shuffling, dealing, drawing, and hun-indicator flipping.
// All functions are pure — they return new arrays and never mutate inputs.
// ---------------------------------------------------------------------------

import type { Tile } from './types';
import { createTiles } from './tile';

// ---------------------------------------------------------------------------
// createWall
// ---------------------------------------------------------------------------

/**
 * Create a fresh 136-tile wall by calling createTiles().
 * All tiles start with isHun = false.
 */
export function createWall(): Tile[] {
  return createTiles();
}

// ---------------------------------------------------------------------------
// shuffleWall
// ---------------------------------------------------------------------------

/**
 * Shuffle a wall using the Fisher-Yates (Durstenfeld) algorithm.
 * Returns a new array; the input wall is NOT mutated.
 */
export function shuffleWall(wall: Tile[]): Tile[] {
  const shuffled = [...wall];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }
  return shuffled;
}

// ---------------------------------------------------------------------------
// drawTile
// ---------------------------------------------------------------------------

/**
 * Draw the first tile from the wall head.
 * Returns the drawn tile (or null if empty) and the remaining wall.
 * Does NOT mutate the input wall.
 */
export function drawTile(wall: Tile[]): { tile: Tile | null; remaining: Tile[] } {
  if (wall.length === 0) {
    return { tile: null, remaining: [] };
  }
  return {
    tile: wall[0],
    remaining: wall.slice(1),
  };
}

// ---------------------------------------------------------------------------
// drawReplacementTile
// ---------------------------------------------------------------------------

/**
 * Draw the last tile from the wall tail (used for kong replacement).
 * Returns the drawn tile (or null if empty) and the remaining wall.
 * Does NOT mutate the input wall.
 */
export function drawReplacementTile(wall: Tile[]): { tile: Tile | null; remaining: Tile[] } {
  if (wall.length === 0) {
    return { tile: null, remaining: [] };
  }
  return {
    tile: wall[wall.length - 1],
    remaining: wall.slice(0, -1),
  };
}

// ---------------------------------------------------------------------------
// flipHunIndicator
// ---------------------------------------------------------------------------

/**
 * Flip the last tile from the wall tail as the 混儿 (hun) indicator.
 * Returns the indicator tile (or null if empty) and the remaining wall.
 * Does NOT mutate the input wall.
 */
export function flipHunIndicator(wall: Tile[]): { indicator: Tile | null; remaining: Tile[] } {
  if (wall.length === 0) {
    return { indicator: null, remaining: [] };
  }
  return {
    indicator: wall[wall.length - 1],
    remaining: wall.slice(0, -1),
  };
}
