/**
 * hashVerify.js – Client-side Provably Fair Verification
 * Mirrors the server's DiceEngine formula so players can verify any roll.
 *
 * USAGE (after game ends with serverSeed revealed):
 *   import { verifyRoll, verifyAllRolls } from './hashVerify'
 *   verifyRoll(serverSeed, turnIndex, playerId, recordedRoll) → boolean
 */

/**
 * Computes HMAC-SHA256 using the Web Crypto API (browser-native, no libraries).
 * @param {string} key      serverSeed
 * @param {string} message  `${serverSeed}|${turnIndex}|${playerId}|${nonce}`
 * @returns {Promise<string>} hex digest
 */
async function sha256(message) {
  const enc = new TextEncoder()
  const sig = await window.crypto.subtle.digest('SHA-256', enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Recomputes a dice roll from the server seed and verifies it matches.
 * @param {string} serverSeed
 * @param {number} turnIndex
 * @param {string} playerId
 * @param {number} recordedRoll  1-6
 */
export async function verifyRoll(serverSeed, turnIndex, playerId, recordedRoll, nonce = 0) {
  const hash = await sha256(`${serverSeed}|${turnIndex}|${playerId}|${nonce}`)
  const value = parseInt(hash.slice(0, 13), 16)
  const computed = (value % 6) + 1
  return computed === recordedRoll
}

/**
 * Verifies the entire roll history against the revealed server seed.
 * @param {string} serverSeed
 * @param {Array}  rolls  [{ turnIndex, playerId, roll }]
 * @returns {Promise<Array>} same array with `verified: boolean` added
 */
export async function verifyAllRolls(serverSeed, rolls) {
  return Promise.all(
    rolls.map(async (r) => ({
      ...r,
      verified: await verifyRoll(serverSeed, r.turnIndex, r.playerId, r.roll, r.nonce ?? 0),
    })),
  )
}

/**
 * Verifies the server seed hash commitment.
 * @param {string} serverSeed   revealed at game end
 * @param {string} publishedHash  hash shared at game start
 */
export async function verifySeedHash(serverSeed, publishedHash) {
  const enc = new TextEncoder()
  const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(serverSeed))
  const computed = Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return computed === publishedHash
}
