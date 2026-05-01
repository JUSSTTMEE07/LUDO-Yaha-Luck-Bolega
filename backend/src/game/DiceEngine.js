/**
 * DiceEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Provably fair dice using SHA-256 hashing.
 *
 * FLOW:
 *  1. At room creation: generateServerSeed() → keep secret on server
 *  2. Publish hashSeed(serverSeed) → hash to client at game start
 *  3. Each roll: rollDice(serverSeed, turnIndex, playerId, nonce) → 1-6
 *  4. After game ends: reveal serverSeed → client can verify any roll
 *
 * VERIFICATION FORMULA (client-side):
 *  hash = SHA256(serverSeed + '|' + turnIndex + '|' + playerId + '|' + nonce)
 *  dice = (parseInt(hash.slice(0, 13), 16) % 6) + 1
 */

'use strict';
const crypto = require('crypto');

const DEFAULT_NONCE = 0;

function buildRollHash(serverSeed, turnIndex, playerId, nonce = DEFAULT_NONCE) {
  return crypto
    .createHash('sha256')
    .update(`${serverSeed}|${turnIndex}|${playerId}|${nonce}`)
    .digest('hex');
}

/**
 * Generates a cryptographically strong server seed.
 */
function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes SHA-256 hash of server seed.
 */
function hashSeed(serverSeed) {
  return crypto
    .createHash('sha256')
    .update(serverSeed)
    .digest('hex');
}

/**
 * Deterministic, provably fair roll for a given tuple.
 */
function rollDice(serverSeed, turnIndex, playerId, nonce = DEFAULT_NONCE) {
  const hash = buildRollHash(serverSeed, turnIndex, playerId, nonce);
  // Use 13 hex chars (52-bit safe integer) to minimise modulo bias
  // 2^52 % 6 ≈ 0 bias vs 2^32 % 6 = 4 bias slots
  const bigVal = parseInt(hash.slice(0, 13), 16)
  return (bigVal % 6) + 1;
}

/**
 * Verify a recorded roll.
 */
function verifyRoll(serverSeed, turnIndex, playerId, recordedRoll, nonce = DEFAULT_NONCE) {
  return rollDice(serverSeed, turnIndex, playerId, nonce) === recordedRoll;
}

/**
 * Build verification payload for end screen.
 */
function buildRevealPayload(serverSeed, diceHistory) {
  return {
    serverSeed,
    seedHash: hashSeed(serverSeed),
    verificationFormula: "dice = (parseInt(SHA256(serverSeed + '|' + turnIndex + '|' + playerId + '|' + nonce).slice(0, 13), 16) % 6) + 1",
    rolls: diceHistory.map(({ playerId, turnIndex, roll, nonce = DEFAULT_NONCE }) => ({
      playerId,
      turnIndex,
      nonce,
      roll,
      verified: verifyRoll(serverSeed, turnIndex, playerId, roll, nonce),
    })),
  };
}

module.exports = {
  generateServerSeed,
  hashSeed,
  rollDice,
  verifyRoll,
  buildRevealPayload,
};
