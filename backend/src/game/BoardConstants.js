/**
 * BoardConstants.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Central source of truth for all Ludo board geometry (15×15 grid).
 *
 * TOKEN POSITION ENCODING
 *  -1          → at home base (not yet entered the board)
 *   0 … 50    → outer ring cells (51 cells, traversed clockwise)
 *  51 … 56    → home column cells (6 color-specific cells)
 *  57          → WIN (reached center)
 *
 * COLORS: green (top-left start), red (top-right start),
 *         blue (bottom-right start), yellow (bottom-left start)
 */

'use strict';

// ─── Outer Ring ──────────────────────────────────────────────────────────────
// 52 cells in clockwise order starting at Green's entry cell (6,1).
// Each color starts at a different offset within this ring.
// Format: [row, col] (0-indexed, 15×15 grid)
const OUTER_RING = [
  /* 00 */ [6,  1],  // ★ Green START
  /* 01 */ [6,  2],
  /* 02 */ [6,  3],
  /* 03 */ [6,  4],
  /* 04 */ [6,  5],
  /* 05 */ [5,  6],
  /* 06 */ [4,  6],
  /* 07 */ [3,  6],
  /* 08 */ [2,  6],  // ★ STAR (safe)
  /* 09 */ [1,  6],
  /* 10 */ [0,  6],
  /* 11 */ [0,  7],
  /* 12 */ [0,  8],
  /* 13 */ [1,  8],  // ★ Red START
  /* 14 */ [2,  8],
  /* 15 */ [3,  8],
  /* 16 */ [4,  8],
  /* 17 */ [5,  8],
  /* 18 */ [6,  9],
  /* 19 */ [6, 10],
  /* 20 */ [6, 11],
  /* 21 */ [6, 12],  // ★ STAR (safe)
  /* 22 */ [6, 13],
  /* 23 */ [6, 14],
  /* 24 */ [7, 14],
  /* 25 */ [8, 14],
  /* 26 */ [8, 13],  // ★ Blue START
  /* 27 */ [8, 12],
  /* 28 */ [8, 11],
  /* 29 */ [8, 10],
  /* 30 */ [8,  9],
  /* 31 */ [9,  8],
  /* 32 */ [10, 8],
  /* 33 */ [11, 8],
  /* 34 */ [12, 8],  // ★ STAR (safe)
  /* 35 */ [13, 8],
  /* 36 */ [14, 8],
  /* 37 */ [14, 7],
  /* 38 */ [14, 6],
  /* 39 */ [13, 6],  // ★ Yellow START
  /* 40 */ [12, 6],
  /* 41 */ [11, 6],
  /* 42 */ [10, 6],
  /* 43 */ [9,  6],
  /* 44 */ [8,  5],
  /* 45 */ [8,  4],
  /* 46 */ [8,  3],
  /* 47 */ [8,  2],  // ★ STAR (safe)
  /* 48 */ [8,  1],
  /* 49 */ [8,  0],
  /* 50 */ [7,  0],
  /* 51 */ [6,  0],  // Last ring cell (visited by Red/Blue/Yellow but NOT Green)
];

// ─── Home Columns ─────────────────────────────────────────────────────────────
// 6 cells each, leading from the outer ring toward the center (7,7).
// A token in its home column is ALWAYS safe and CANNOT be cut.
const HOME_COLS = {
  green:  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],  // row 7, left→right
  red:    [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],  // col 7, top→down
  blue:   [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]], // row 7, right→left
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]], // col 7, bottom→up
};

// ─── Home Base Cells (unstarted tokens sit here visually) ─────────────────────
const HOME_BASE_CELLS = {
  green:  [[1,1],[1,4],[4,1],[4,4]],
  red:    [[1,10],[1,13],[4,10],[4,13]],
  blue:   [[10,10],[10,13],[13,10],[13,13]],
  yellow: [[10,1],[10,4],[13,1],[13,4]],
};

// ─── Color Metadata ──────────────────────────────────────────────────────────
// Index into OUTER_RING where each color enters the board.
const START_OUTER_INDEX = { green: 0, red: 13, blue: 26, yellow: 39 };

// OUTER_RING indices that are always safe (start squares + star squares)
const SAFE_OUTER_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const COLOR_ORDER = ['green', 'red', 'blue', 'yellow'];

// ─── Path Helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the [row, col] board cell for a given color + path position.
 * @param {string} color  'green' | 'red' | 'blue' | 'yellow'
 * @param {number} pos    -1 (home base), 0-50 (outer ring), 51-56 (home col), 57 (win)
 */
function getCell(color, pos) {
  if (pos < 0 || pos > 57) return null;
  if (pos === 57) return [7, 7]; // center / WIN cell

  if (pos <= 50) {
    const absIdx = (START_OUTER_INDEX[color] + pos) % 52;
    return OUTER_RING[absIdx];
  }
  // pos 51–56 → home column index 0–5
  return HOME_COLS[color][pos - 51];
}

/**
 * Checks whether a token is on a safe square (cannot be cut).
 * Tokens in home columns or at WIN are always safe.
 */
function isSafe(color, pos) {
  if (pos >= 51) return true; // home column or win
  if (pos < 0) return true;   // home base (can't be cut there)
  const absIdx = (START_OUTER_INDEX[color] + pos) % 52;
  return SAFE_OUTER_INDICES.has(absIdx);
}

/**
 * For the given color and path position, returns a unique string key
 * identifying the absolute board cell — used for cut detection.
 */
function cellKey(color, pos) {
  const cell = getCell(color, pos);
  return cell ? `${cell[0]},${cell[1]}` : null;
}

/**
 * Checks if a token at pathPos in its home column counts as being
 * "in the home column" (i.e., immune to cuts, no trap effects).
 */
function inHomeColumn(pos) {
  return pos >= 51 && pos <= 56;
}

module.exports = {
  OUTER_RING,
  HOME_COLS,
  HOME_BASE_CELLS,
  START_OUTER_INDEX,
  SAFE_OUTER_INDICES,
  COLOR_ORDER,
  getCell,
  isSafe,
  cellKey,
  inHomeColumn,
};
