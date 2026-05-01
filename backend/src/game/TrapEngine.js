/**
 * TrapEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side trap tile generation and effect application.
 *
 * Traps are placed on the outer ring only (never on safe squares, never on
 * start squares, never on home columns). They are visible to all players as
 * subtle glowing cells.
 *
 * TRAP TYPES:
 *  'send_home'  → token returns to home base (position -1)
 *  'freeze'     → token owner skips their next turn
 *  'reverse'    → token moves back 3 steps (or to position 0 if less than 3)
 */

'use strict';

const crypto = require('crypto');
const { SAFE_OUTER_INDICES, START_OUTER_INDEX, OUTER_RING } = require('./BoardConstants');

// Cells that must NEVER be traps
const PROTECTED_OUTER_INDICES = new Set([
  ...SAFE_OUTER_INDICES,
  // (START_OUTER_INDEX values are already in SAFE_OUTER_INDICES)
]);

const TRAP_TYPES = ['send_home', 'freeze', 'reverse'];

/**
 * Generates 4-6 trap tiles for a game using a deterministic seed.
 * Returns an array of { outerIndex, type } objects.
 *
 * @param {string} serverSeed  - same seed used for dice (game-scoped)
 * @param {number} count       - how many traps to place (4-6)
 */
function generateTraps(serverSeed, count = 5) {
  // Build candidate indices (outer ring, not protected)
  const candidates = [];
  for (let i = 0; i < 52; i++) {
    if (!PROTECTED_OUTER_INDICES.has(i)) candidates.push(i);
  }

  // Use HMAC to derive deterministic but unpredictable positions
  const hmac = crypto
    .createHmac('sha256', serverSeed)
    .update('traps')
    .digest('hex');

  const traps = [];
  const used = new Set();
  let hexOffset = 0;

  while (traps.length < count && hexOffset + 4 <= hmac.length) {
    const slice = hmac.slice(hexOffset, hexOffset + 4);
    const val = parseInt(slice, 16);
    const candidateIdx = val % candidates.length;
    const outerIndex = candidates[candidateIdx];

    if (!used.has(outerIndex)) {
      used.add(outerIndex);
      const typeIndex = (val >> 8) % TRAP_TYPES.length;
      traps.push({
        outerIndex,
        cell: OUTER_RING[outerIndex],
        type: TRAP_TYPES[typeIndex],
      });
    }
    hexOffset += 2;

    // Fallback: if HMAC too short, wrap with extra hash
    if (hexOffset + 4 > hmac.length) {
      const extra = crypto
        .createHmac('sha256', serverSeed)
        .update(`traps_extra_${hexOffset}`)
        .digest('hex');
      hexOffset = 0;
    }
  }

  return traps;
}

/**
 * Checks if a given absolute outer-ring index has a trap.
 * Returns the trap object or null.
 *
 * @param {Array}  traps      - result of generateTraps()
 * @param {number} outerIndex - absolute outer ring index
 */
function getTrapAt(traps, outerIndex) {
  return traps.find(t => t.outerIndex === outerIndex) || null;
}

/**
 * Given a color and a path position (0-50 = outer ring), returns the
 * trap at that cell or null.
 *
 * @param {Array}  traps
 * @param {string} color
 * @param {number} pathPos  - 0..50 (outer ring only)
 * @param {Object} START_OUTER_INDEX - imported from BoardConstants
 */
function getTrapForToken(traps, color, pathPos, startIndices) {
  if (pathPos < 0 || pathPos > 50) return null; // home column / base are trap-free
  const absIdx = (startIndices[color] + pathPos) % 52;
  return getTrapAt(traps, absIdx);
}

/**
 * Applies a trap effect to the game state token.
 * Returns a mutation descriptor: { type, newPos, freeze }
 * The GameEngine is responsible for actually mutating the state.
 *
 * @param {string} trapType  - 'send_home' | 'freeze' | 'reverse'
 * @param {number} currentPos - current path position of the token
 */
function applyTrapEffect(trapType, currentPos) {
  switch (trapType) {
    case 'send_home':
      return { type: 'send_home', newPos: -1, freeze: false };

    case 'freeze':
      return { type: 'freeze', newPos: currentPos, freeze: true };

    case 'reverse': {
      const newPos = Math.max(0, currentPos - 3);
      return { type: 'reverse', newPos, freeze: false };
    }

    default:
      return { type: 'none', newPos: currentPos, freeze: false };
  }
}

module.exports = {
  generateTraps,
  getTrapAt,
  getTrapForToken,
  applyTrapEffect,
  TRAP_TYPES,
};
