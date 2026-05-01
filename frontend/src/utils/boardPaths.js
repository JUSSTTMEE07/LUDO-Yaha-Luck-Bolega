/**
 * boardPaths.js – Board Coordinate Maps
 * ─────────────────────────────────────────────────────────────────────────────
 * MUST stay in sync with backend/src/game/BoardConstants.js
 *
 * POSITION ENCODING:
 *  −1   = home base (rendered in home cluster, not on the path)
 *   0   = start cell (outer ring index 0 for that color)
 *   1…50 = outer ring walking steps
 *  51…56 = home column steps
 *  57   = WIN / center (7,7)
 */

// ── Outer ring (52 cells clockwise — index 0 is Green's START) ─────────────
// Mirrors BoardConstants.js OUTER_RING exactly
export const OUTER_RING = [
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
  /* 51 */ [6,  0],
]

// ── Home columns (6 cells each, color-specific) ────────────────────────────
export const HOME_COLS = {
  green:  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  red:    [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  blue:   [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
}

// ── Start offsets into the outer ring ─────────────────────────────────────
export const START_OUTER_INDEX = { green: 0, red: 13, blue: 26, yellow: 39 }

// ── Safe outer ring indices ────────────────────────────────────────────────
export const SAFE_OUTER_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47])

// ── Home base cells (where unstarted tokens sit visually) ──────────────────
// Symmetric: slots at rows/cols 2 & 4 (centered at 1.5 and 3.5 within 4×4 inner box)
// All 4 corners use the SAME relative slot layout → identical appearance
export const HOME_BASE_CELLS = {
  green:  [[1,1],[1,4],[4,1],[4,4]],
  red:    [[1,10],[1,13],[4,10],[4,13]],
  blue:   [[10,10],[10,13],[13,10],[13,13]],
  yellow: [[10,1],[10,4],[13,1],[13,4]],
}

// Larger visual home slots. Fractional grid centers keep the 4 tokens evenly
// spaced inside each 6x6 corner base without hugging the edges.
export const HOME_BASE_POINTS = {
  green:  [[1.85,1.85],[1.85,4.15],[4.15,1.85],[4.15,4.15]],
  red:    [[1.85,10.85],[1.85,13.15],[4.15,10.85],[4.15,13.15]],
  blue:   [[10.85,10.85],[10.85,13.15],[13.15,10.85],[13.15,13.15]],
  yellow: [[10.85,1.85],[10.85,4.15],[13.15,1.85],[13.15,4.15]],
}

// ── Token color styles ──────────────────────────────────────────────────────
export const COLOR_STYLES = {
  green:  { bg: '#2D6B46', light: '#3FC46A', glow: 'rgba(63,196,106,0.38)' },
  red:    { bg: '#8B2F3D', light: '#E84F5A', glow: 'rgba(232,79,90,0.35)' },
  blue:   { bg: '#1D5D83', light: '#29B6F6', glow: 'rgba(41,182,246,0.34)' },
  yellow: { bg: '#9A7A18', light: '#F0C94A', glow: 'rgba(240,201,74,0.34)' },
}

/**
 * Returns the [row, col] grid position for a token.
 * @param {string} color
 * @param {number} pos  -1 (home), 0-50 (outer), 51-56 (home col), 57 (win)
 * @param {number} [homeSlot]  which of the 4 home-base slots to use when pos=-1
 */
export function getCell(color, pos, homeSlot = 0) {
  if (pos === -1)  return HOME_BASE_CELLS[color]?.[homeSlot] ?? [7, 7]
  if (pos === 57)  return [7, 7]
  if (pos <= 50) {
    const absIdx = (START_OUTER_INDEX[color] + pos) % 52
    return OUTER_RING[absIdx]
  }
  return HOME_COLS[color]?.[pos - 51] ?? [7, 7]
}

/**
 * Returns true if the path position is a safe square (cannot be cut).
 */
export function isSafe(color, pos) {
  if (pos < 0 || pos >= 51) return true
  const absIdx = (START_OUTER_INDEX[color] + pos) % 52
  return SAFE_OUTER_INDICES.has(absIdx)
}

/**
 * Converts a [row, col] pair to CSS grid placement (1-indexed).
 * Use as: style={{ gridRow: r+1, gridColumn: c+1 }}
 */
export function toGridPos([row, col]) {
  return { gridRow: row + 1, gridColumn: col + 1 }
}
