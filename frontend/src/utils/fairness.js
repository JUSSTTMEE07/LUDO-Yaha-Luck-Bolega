/**
 * fairness.js – Luck Score & Distribution Calculations
 */

/**
 * Computes a luck score (0-100%) for a roll history array.
 * Rolls above the uniform mean (3.5) count as "lucky".
 * @param {number[]} rolls
 */
export function computeLuckScore(rolls) {
  if (!rolls?.length) return 50
  const lucky = rolls.filter(r => r > 3.5).length
  return Math.round((lucky / rolls.length) * 100)
}

/**
 * Returns distribution counts: how many times each face (1-6) was rolled.
 * @param {number[]} rolls
 * @returns {Object} { 1: n, 2: n, ... 6: n }
 */
export function rollDistribution(rolls) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
  rolls.forEach(r => { if (dist[r] !== undefined) dist[r]++ })
  return dist
}

/**
 * Computes the best roll streak (consecutive rolls above a value, default >= 4).
 * @param {number[]} rolls
 * @param {number} threshold
 */
export function bestStreak(rolls, threshold = 4) {
  let best = 0, current = 0
  for (const r of rolls) {
    if (r >= threshold) { current++; best = Math.max(best, current) }
    else current = 0
  }
  return best
}

/**
 * Chi-squared fairness p-value approximation (simplified).
 * Returns a % likelihood the dice is "fair" given the distribution.
 * @param {number[]} rolls
 */
export function fairnessPValue(rolls) {
  if (rolls.length < 6) return 100
  const expected = rolls.length / 6
  const dist = rollDistribution(rolls)
  const chi2 = Object.values(dist).reduce((sum, obs) => {
    return sum + Math.pow(obs - expected, 2) / expected
  }, 0)
  // Degrees of freedom = 5. Rough approximation for p-value.
  // chi2 < 11.07 → p > 0.05 (fair at 95% confidence)
  const isFair = chi2 < 11.07
  const fairPct = Math.max(0, Math.round(100 - (chi2 / 11.07) * 50))
  return { chi2: +chi2.toFixed(2), isFair, fairPct }
}
