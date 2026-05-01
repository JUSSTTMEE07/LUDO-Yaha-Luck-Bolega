/**
 * GameEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-authoritative Ludo game state machine.
 * ALL game logic lives here. Socket handlers only call these functions.
 *
 * TOKEN POSITIONS:
 *  -1   = at home base (not started)
 *   0   = start cell (outer ring position 0 for this color)
 *   1…50 = outer ring steps
 *  51…56 = home column steps
 *  57   = WIN (finished)
 *
 * TURN FLOW:
 *  1. rollDice       → validates turn, rolls, returns valid moves
 *  2. moveToken      → validates + applies move, checks cuts/traps/powers
 *  3. nextTurn       → advances turn (handles six-reroll, double-dice, freeze)
 */

'use strict';

const {
  getCell, isSafe, cellKey, inHomeColumn,
  START_OUTER_INDEX, COLOR_ORDER,
} = require('./BoardConstants');

const { rollDice } = require('./DiceEngine');
const {
  createPowerState,
  normalizePowerState,
  applyRevive,
  activateShield,
  activateDoubleDice,
  consumeDoubleDice,
  canSwap,
  applySwap: applyPowerSwap,
  onCapture,
  onRollStats,
  onLapProgress,
  getShieldBlocker,
  consumeShield,
  tickOpponentTurnShields,
} = require('./PowerEngine');

const WIN_POSITION = 57;
const MAX_TOKENS   = 4;

// ─── State Factory ────────────────────────────────────────────────────────────

/**
 * Creates the initial game state when a game starts.
 * @param {string} roomId
 * @param {Array}  players     [{ id, username }] in turn order
 * @param {string} serverSeed
 * @param {string} serverSeedHash
 * @param {Array}  traps       from TrapEngine.generateTraps()
 * @returns {Object} gameState
 */
function createGameState(roomId, players, serverSeed, serverSeedHash, traps) {
  const coloredPlayers = players.map((p, i) => ({
    id:             p.id,
    username:       p.username,
    color:          COLOR_ORDER[i],
    tokens:         [-1, -1, -1, -1],
    finishedTokens: 0,
    powers:         createPowerState(),
    frozenTurns:    0,    // > 0 means this player is frozen (skip turn)
    stats: {
      cuts:      0,
      wascut:    0,
      rollTotal: 0,
      rollCount: 0,
      sixes:     0,
      rollsSinceSix: 0,
      powerUsage: {
        revivedTokens: 0,
        shieldsUsed: 0,
        shieldBlocks: 0,
        swapUsed: 0,
        doubleDiceUsed: 0,
      },
    },
  }));

  return {
    roomId,
    status:              'active',
    players:             coloredPlayers,
    currentPlayerIndex:  0,
    turnIndex:           0,
    consecutiveSixes:    0,
    lastDiceValue:       null,
    secondDiceValue:     null,  // used in double-dice turns
    isDoubleDiceTurn:    false,
    pendingMoves:        [],    // valid moves after roll
    diceRolled:          false, // has the current player rolled yet?
    traps,
    diceHistory:         [],    // { playerId, turnIndex, roll, color }
    serverSeed,                 // NEVER sent to clients until game ends
    serverSeedHash,             // sent to clients at game start
    winner:              null,
    isMoving:            false,
    isCapturing:         false,
    isInDanger:          false,
    startedAt:           new Date().toISOString(),
    endedAt:             null,
  };
}

// ─── Accessors ────────────────────────────────────────────────────────────────

function getPlayer(state, playerId) {
  return state.players.find(p => p.id === playerId);
}

function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

function ensurePowerUsage(player) {
  const defaults = {
    revivedTokens: 0,
    shieldsUsed: 0,
    shieldBlocks: 0,
    swapUsed: 0,
    doubleDiceUsed: 0,
  };
  player.stats.powerUsage = {
    ...defaults,
    ...(player.stats.powerUsage || {}),
  };
  return player.stats.powerUsage;
}

// ─── Computed: Valid Moves ────────────────────────────────────────────────────

/**
 * Returns all valid moves for the current player given a dice value.
 * Each move: { tokenIndex, from, to, willCut, cutTarget, willWin, trapEffect }
 *
 * @param {Object} state
 * @param {number} diceValue  1-6
 * @param {Object} player     player object from state
 */
function getValidMoves(state, player, diceValue) {
  const moves = [];

  player.tokens.forEach((pos, tokenIndex) => {
    // Finished tokens cannot move
    if (pos === WIN_POSITION) return;

    // Token at home base: can only enter on a 6
    if (pos === -1) {
      if (diceValue === 6) {
        moves.push({
          tokenIndex,
          from: -1,
          to: 0,
          willCut:   checkCut(state, player, 0),
          cutTarget: findCutTarget(state, player, 0),
          willWin:   false,
          trapEffect: null,
        });
      }
      return;
    }

    const newPos = pos + diceValue;

    // Overshoot (cannot exceed WIN_POSITION exactly, but exact is allowed)
    if (newPos > WIN_POSITION) return;

    const willWin = newPos === WIN_POSITION;
    const trap = null;
    const cutInfo = (!willWin && !inHomeColumn(newPos)) ? findCutTarget(state, player, newPos) : null;

    moves.push({
      tokenIndex,
      from:      pos,
      to:        newPos,
      willCut:   !!cutInfo,
      cutTarget: cutInfo,
      willWin,
      trapEffect: null,
    });
  });

  return moves;
}

/**
 * Checks if landing on `newPos` would cut any opponent.
 */
function checkCut(state, movingPlayer, newPos) {
  return !!findCutTarget(state, movingPlayer, newPos);
}

/**
 * Finds an opponent token at the same absolute board cell as newPos.
 * Returns { playerId, color, tokenIndex } or null.
 */
function findCutTarget(state, movingPlayer, newPos) {
  if (inHomeColumn(newPos) || newPos < 0 || newPos === WIN_POSITION) return null;
  if (isSafe(movingPlayer.color, newPos)) return null;

  const movingCell = cellKey(movingPlayer.color, newPos);

  for (const opp of state.players) {
    if (opp.id === movingPlayer.id) continue;

    for (let ti = 0; ti < MAX_TOKENS; ti++) {
      const oppPos = opp.tokens[ti];
      if (oppPos < 0 || oppPos === WIN_POSITION || inHomeColumn(oppPos)) continue;

      // A shielded target blocks one capture attempt.
      if (getShieldBlocker(opp, ti)) continue;

      if (cellKey(opp.color, oppPos) === movingCell) {
        return { playerId: opp.id, color: opp.color, tokenIndex: ti, atPos: oppPos };
      }
    }
  }
  return null;
}

function findShieldBlockTarget(state, movingPlayer, newPos) {
  if (inHomeColumn(newPos) || newPos < 0 || newPos === WIN_POSITION) return null;
  if (isSafe(movingPlayer.color, newPos)) return null;

  const movingCell = cellKey(movingPlayer.color, newPos);

  for (const opp of state.players) {
    if (opp.id === movingPlayer.id) continue;

    for (let ti = 0; ti < MAX_TOKENS; ti++) {
      const oppPos = opp.tokens[ti];
      if (oppPos < 0 || oppPos === WIN_POSITION || inHomeColumn(oppPos)) continue;
      if (cellKey(opp.color, oppPos) === movingCell && getShieldBlocker(opp, ti)) {
        return { playerId: opp.id, color: opp.color, tokenIndex: ti, atPos: oppPos };
      }
    }
  }
  return null;
}

// ─── Move Application ─────────────────────────────────────────────────────────

/**
 * Validates and applies a move chosen by the current player.
 * Returns { newState, events } where events is an array of game events
 * that the socket handler should broadcast.
 *
 * @param {Object} state
 * @param {string} playerId
 * @param {number} tokenIndex   0-3
 * @param {number} diceValue    must match state.lastDiceValue (or second)
 */
function applyMove(state, playerId, tokenIndex, diceValue) {
  // ── Validate ──
  if (state.status !== 'active') throw new Error('Game is not active');
  if (state.winner)              throw new Error('Game already won');

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.id !== playerId) throw new Error('Not your turn');
  if (!state.diceRolled)             throw new Error('Roll dice first');

  const validMove = state.pendingMoves.find(m => m.tokenIndex === tokenIndex);

  if (!validMove) throw new Error('Invalid move');

  // Deep clone state to avoid mutation
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId);
  player.powers = normalizePowerState(player.powers);
  const events = [];

  const { from, to, willCut, cutTarget, willWin, trapEffect } = validMove;
  s.isMoving = true;
  s.isCapturing = false;
  s.isInDanger = false;

  // ── Move the token ──
  player.tokens[tokenIndex] = to;

  events.push({ type: 'TOKEN_MOVED', playerId, color: player.color, tokenIndex, from, to });

  if (onLapProgress(player, from, to)) {
    events.push({ type: 'POWER_UNLOCKED', playerId, powerType: 'swap' });
  }

  // Swap check disabled

  // ── Win detection ──
  if (willWin) {
    player.finishedTokens += 1;
    events.push({ type: 'TOKEN_FINISHED', playerId, color: player.color, tokenIndex });

    if (player.finishedTokens === MAX_TOKENS) {
      s.winner      = playerId;
      s.status      = 'ended';
      s.endedAt     = new Date().toISOString();
      events.push({ type: 'GAME_OVER', winner: playerId, winnerColor: player.color, winnerUsername: player.username });
      return { newState: s, events };
    }
  }

  // Trap logic disabled

  // ── Cut ──
  let didCut = false;
  const shieldBlock = findShieldBlockTarget(s, player, to);
  if (shieldBlock) {
    const shieldOwner = s.players.find(p => p.id === shieldBlock.playerId);
    consumeShield(shieldOwner);
    events.push({
      type: 'SHIELD_BLOCKED_CUT',
      cutterPlayerId: playerId,
      victimPlayerId: shieldOwner.id,
      victimColor: shieldOwner.color,
      tokenIndex: shieldBlock.tokenIndex,
    });
  } else if (willCut && cutTarget) {
    const oppPlayer = s.players.find(p => p.id === cutTarget.playerId);

    // Send opponent token home
    oppPlayer.tokens[cutTarget.tokenIndex] = -1;
    oppPlayer.stats.wascut += 1;
    player.stats.cuts += 1;

    didCut = true;
    s.isCapturing = true;
    const hadShield = player.powers.shield.unlocked;
    const hadReviveBonus = player.powers.revive.earnedBonus;
    onCapture(player);
    events.push({
      type:       'TOKEN_CUT',
      cutterPlayerId: playerId,
      cutterColor: player.color,
      victimPlayerId: oppPlayer.id,
      victimColor: oppPlayer.color,
      tokenIndex: cutTarget.tokenIndex,
    });
    if (!hadShield && player.powers.shield.unlocked) {
      events.push({ type: 'POWER_UNLOCKED', playerId, powerType: 'shield' });
    }
    if (!hadReviveBonus && player.powers.revive.earnedBonus) {
      events.push({ type: 'POWER_GAINED', playerId, powerType: 'revive' });
    }
  }

  // ── Advance turn ──
  // Standard Ludo bonus-turn rules:
  //  1. Roll a 6           → extra turn, increment six-chain counter
  //  2. Cut an opponent    → extra turn, reset six-chain (bonus, not a 6)
  //  3. Token reaches home → extra turn, reset six-chain (bonus, not a 6)

  if (diceValue === 6) {
    // Six-chain logic
    s.consecutiveSixes += 1;
    if (s.consecutiveSixes >= 3) {
      // Shouldn't normally reach here (blocked in processDiceRoll), but safety net
      s.consecutiveSixes = 0;
      events.push({ type: 'THREE_SIXES_FORFEIT', playerId });
      advanceTurn(s);
    } else {
      events.push({ type: 'EXTRA_TURN', playerId, reason: 'rolled six' });
      // If token ALSO finished on a 6, the six-turn already covers it
    }
  } else if (didCut) {
    // Cut bonus turn — reset six chain
    s.consecutiveSixes = 0;
    events.push({ type: 'EXTRA_TURN', playerId, reason: 'cut opponent' });
  } else if (willWin) {
    // Token finished bonus turn — reset six chain
    s.consecutiveSixes = 0;
    events.push({ type: 'EXTRA_TURN', playerId, reason: 'token finished' });
  } else {
    // Normal move — reset six chain, advance turn
    s.consecutiveSixes = 0;
    advanceTurn(s);
  }

  s.diceRolled    = false;
  s.pendingMoves  = [];
  s.lastDiceValue = null;
  s.isMoving = false;
  s.isCapturing = false;

  return { newState: s, events };
}

// ─── Dice Roll ────────────────────────────────────────────────────────────────

/**
 * Rolls the dice for the current player and returns valid moves.
 * Records roll in diceHistory.
 *
 * @param {Object} state
 * @param {string} playerId  must match currentPlayer
 * @returns {{ newState, diceValue, validMoves, events }}
 */
function processDiceRoll(state, playerId) {
  if (state.status !== 'active')  throw new Error('Game is not active');
  if (state.diceRolled)           throw new Error('Already rolled this turn');

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.id !== playerId) throw new Error('Not your turn');

  const s = deepClone(state);
  s.isMoving = false;
  s.isCapturing = false;
  s.isInDanger = false;
  const player = s.players.find(p => p.id === playerId);
  player.powers = normalizePowerState(player.powers);
  const events = [];

  const isDouble = consumeDoubleDice(player);
  s.isDoubleDiceTurn = isDouble;

  // Roll - block the THIRD consecutive 6 and avoid same-tuple repeat rolls.
  let rollNonce = 0;
  const firstTurnIndex = s.turnIndex;
  let diceValue = rollDice(s.serverSeed, firstTurnIndex, playerId, rollNonce);

  const needsOpeningSix = player.tokens.every(pos => pos === -1) && player.stats.rollsSinceSix >= 3;
  if (needsOpeningSix && s.consecutiveSixes === 0) {
    while (diceValue !== 6) {
      rollNonce += 1;
      diceValue = rollDice(s.serverSeed, firstTurnIndex, playerId, rollNonce);
    }
    events.push({
      type: 'SIX_CHAIN_LIMITED',
      playerId,
      note: 'Opening drought protection applied.',
    });
  }

  if (s.consecutiveSixes >= 2 && diceValue === 6) {
    while (diceValue === 6) {
      rollNonce += 1;
      diceValue = rollDice(s.serverSeed, firstTurnIndex, playerId, rollNonce);
    }
    // Reset six chain so the forced non-six still advances the turn normally
    s.consecutiveSixes = 0;
    events.push({
      type: 'SIX_CHAIN_LIMITED',
      playerId,
      note: 'Two consecutive sixes reached — third six blocked.',
    });
  }

  let secondValue = null;
  let secondNonce = 0;
  if (isDouble) {
    const secondTurnIndex = firstTurnIndex + 1;
    secondValue = rollDice(s.serverSeed, secondTurnIndex, playerId, secondNonce);
    if (s.consecutiveSixes >= 2 && secondValue === 6) {
      while (secondValue === 6) {
        secondNonce += 1;
        secondValue = rollDice(s.serverSeed, secondTurnIndex, playerId, secondNonce);
      }
      events.push({
        type: 'SIX_CHAIN_LIMITED',
        playerId,
        note: 'Two consecutive sixes reached - x2 Dice six blocked.',
      });
    }
  }

  const effectiveDice = isDouble ? Math.max(diceValue, secondValue) : diceValue;
  s.lastDiceValue = effectiveDice;
  s.secondDiceValue = secondValue;

  // Record in history
  const historyEntry = {
    playerId,
    color: player.color,
    turnIndex: firstTurnIndex,
    roll: diceValue,
    nonce: rollNonce,
  };
  s.diceHistory.push(historyEntry);
  if (isDouble) {
    s.diceHistory.push({
      playerId,
      color: player.color,
      turnIndex: firstTurnIndex + 1,
      roll: secondValue,
      nonce: secondNonce,
      power: 'doubleDice',
    });
  }
  s.turnIndex += isDouble ? 2 : 1;

  // Update roll stats
  const updateRollStats = (roll) => {
    player.stats.rollTotal += roll;
    player.stats.rollCount += 1;
    if (roll === 6) player.stats.sixes += 1;
    player.stats.rollsSinceSix = roll === 6 ? 0 : (player.stats.rollsSinceSix || 0) + 1;
  };
  updateRollStats(diceValue);
  if (isDouble) updateRollStats(secondValue);
  if (onRollStats(player)) {
    events.push({ type: 'POWER_UNLOCKED', playerId, powerType: 'doubleDice' });
  }

  const validMoves = getValidMoves(s, player, effectiveDice);

  s.pendingMoves = validMoves;
  s.diceRolled   = true;

  events.push({
    type: 'DICE_ROLLED',
    playerId,
    color: player.color,
    diceValue: effectiveDice,
    firstDiceValue: diceValue,
    secondDiceValue: secondValue,
    isDouble,
    effectiveDice,
    validMoves: validMoves.map(m => ({ tokenIndex: m.tokenIndex, from: m.from, to: m.to })),
  });

  // If no valid moves, auto-pass turn
  if (validMoves.length === 0) {
    s.diceRolled   = false;
    s.pendingMoves = [];
    s.consecutiveSixes = 0;
    advanceTurn(s);
    events.push({ type: 'NO_VALID_MOVES', playerId, diceValue: effectiveDice });
  }

  return { newState: s, diceValue: effectiveDice, firstDiceValue: diceValue, secondDiceValue: secondValue, validMoves, events };
}

// ─── Power Usage ──────────────────────────────────────────────────────────────

/**
 * Validates and applies a power action.
 * @param {Object} state
 * @param {string} playerId
 * @param {string} powerType   'revive' | 'swap'
 * @param {Object} payload     power-specific data (e.g. swap target)
 */
function usePower(state, playerId, powerType, payload = {}) {
  if (state.status !== 'active') throw new Error('Game is not active');

  const currentPlayer = getCurrentPlayer(state);
  if (currentPlayer.id !== playerId) throw new Error('Not your turn');
  if (state.diceRolled) throw new Error('Use powers before rolling dice');

  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId);
  player.powers = normalizePowerState(player.powers);
  const events = [];

  if (powerType === 'revive') {
    const result = applyRevive(player, payload.tokenIndex);
    events.push({
      type: 'POWER_REVIVE',
      playerId,
      color: player.color,
      tokenIndex: result.tokenIndex,
    });
  } else if (powerType === 'shield') {
    const result = activateShield(player, payload.tokenIndex);
    events.push({
      type: 'POWER_SHIELD',
      playerId,
      color: player.color,
      tokenIndex: result.tokenIndex,
    });
  } else if (powerType === 'swap') {
    const opponent = s.players.find(p => p.id === payload.targetPlayerId);
    if (!opponent || opponent.id === playerId) throw new Error('Choose an opponent token');
    opponent.powers = normalizePowerState(opponent.powers);

    const validation = canSwap(
      player,
      payload.myTokenIndex,
      opponent,
      payload.targetTokenIndex,
      isSafe,
    );
    if (!validation.ok) throw new Error(validation.reason);

    applyPowerSwap(player, payload.myTokenIndex, opponent, payload.targetTokenIndex);
    events.push({
      type: 'POWER_SWAP',
      playerId,
      color: player.color,
      myTokenIndex: payload.myTokenIndex,
      targetPlayerId: opponent.id,
      targetColor: opponent.color,
      targetTokenIndex: payload.targetTokenIndex,
    });
  } else if (powerType === 'doubleDice' || powerType === 'dd') {
    activateDoubleDice(player);
    events.push({
      type: 'DOUBLE_DICE_ARMED',
      playerId,
      color: player.color,
    });
  } else {
    throw new Error('Unknown power');
  }

  return { newState: s, events };
}

// ─── Turn Management ──────────────────────────────────────────────────────────

/**
 * Advances to the next player's turn, skipping frozen players.
 * Mutates state directly (called inside deepClone context).
 */
function advanceTurn(s) {
  const total = s.players.length;
  const finishedPlayerId = s.players[s.currentPlayerIndex]?.id;
  let next = (s.currentPlayerIndex + 1) % total;

  // Skip frozen players
  let skips = 0;
  while (s.players[next].frozenTurns > 0 && skips < total) {
    s.players[next].frozenTurns -= 1;
    next = (next + 1) % total;
    skips++;
  }

  tickOpponentTurnShields(s.players, finishedPlayerId);
  s.currentPlayerIndex = next;
}

// ─── Fairness Stats ───────────────────────────────────────────────────────────

/**
 * Computes the Luck Score for a player (0-100%).
 * Definition: % of rolls above the mean (3.5).
 * A score > 50% means above-average luck.
 */
function computeLuckScore(rollHistory) {
  if (rollHistory.length === 0) return 50;
  const aboveAvg = rollHistory.filter(r => r > 3.5).length;
  return Math.round((aboveAvg / rollHistory.length) * 100);
}

/**
 * Builds end-of-game stats for all players.
 */
function buildEndStats(state) {
  return state.players.map(p => {
    const myRolls = state.diceHistory
      .filter(d => d.playerId === p.id)
      .map(d => d.roll);

    return {
      playerId: p.id,
      username: p.username,
      color:    p.color,
      cuts:     p.stats.cuts,
      wasCut:   p.stats.wascut,
      avgRoll:  myRolls.length ? +(myRolls.reduce((a, b) => a + b, 0) / myRolls.length).toFixed(2) : 0,
      luckScore: computeLuckScore(myRolls),
      sixes:    p.stats.sixes,
      rollHistory: myRolls,
      powerUsage: {
        revivedTokens: 0,
        shieldBlocks:  0,
        swapUsed:      0,
        doubleDiceUsed: false,
      },
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createGameState,
  processDiceRoll,
  applyMove,
  usePower,
  getValidMoves,
  getCurrentPlayer,
  getPlayer,
  buildEndStats,
  computeLuckScore,
  WIN_POSITION,
};
