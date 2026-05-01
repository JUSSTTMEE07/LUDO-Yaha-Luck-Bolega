'use strict';

const WIN_POSITION = 57;

function createPowerState() {
  return {
    revive: {
      count: 1,
      earnedBonus: false,
    },
    shield: {
      unlocked: false,
      count: 0,
      active: false,
      activeTokenIndex: null,
      remainingOpponentTurns: 0,
      used: false,
    },
    swap: {
      unlocked: false,
      used: false,
    },
    doubleDice: {
      unlocked: false,
      count: 0,
      active: false,
      awarded: false,
    },
  };
}

function normalizePowerState(powerState = {}) {
  const base = createPowerState();
  return {
    revive: { ...base.revive, ...(powerState.revive || {}) },
    shield: { ...base.shield, ...(powerState.shield || {}) },
    swap: { ...base.swap, ...(powerState.swap || {}) },
    doubleDice: { ...base.doubleDice, ...(powerState.doubleDice || {}) },
  };
}

function isActiveToken(pos) {
  return pos >= 0 && pos < WIN_POSITION;
}

function isBoardToken(pos) {
  return pos >= 0 && pos <= 50;
}

function applyRevive(player, tokenIndex) {
  player.powers = normalizePowerState(player.powers);
  const idx = Number.isInteger(tokenIndex)
    ? tokenIndex
    : player.tokens.findIndex(pos => pos === -1);

  if (player.powers.revive.count <= 0) throw new Error('Revive is not available');
  if (idx < 0 || idx >= player.tokens.length) throw new Error('Choose a valid token to revive');
  if (player.tokens[idx] !== -1) throw new Error('Revive can only be used on a home token');

  player.tokens[idx] = 0;
  player.powers.revive.count -= 1;
  return { tokenIndex: idx };
}

function activateShield(player, tokenIndex) {
  player.powers = normalizePowerState(player.powers);
  if (!player.powers.shield.unlocked || player.powers.shield.count <= 0) {
    throw new Error('Shield is not available');
  }
  if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex >= player.tokens.length) {
    throw new Error('Choose a valid token to shield');
  }
  if (!isActiveToken(player.tokens[tokenIndex])) throw new Error('Shield can only protect an active token');

  player.powers.shield.count -= 1;
  player.powers.shield.used = true;
  player.powers.shield.active = true;
  player.powers.shield.activeTokenIndex = tokenIndex;
  player.powers.shield.remainingOpponentTurns = 1;
  return { tokenIndex };
}

function activateDoubleDice(player) {
  player.powers = normalizePowerState(player.powers);
  if (!player.powers.doubleDice.unlocked || player.powers.doubleDice.count <= 0) {
    throw new Error('x2 Dice is not available');
  }
  if (player.powers.doubleDice.active) throw new Error('x2 Dice is already armed');

  player.powers.doubleDice.count -= 1;
  player.powers.doubleDice.active = true;
}

function consumeDoubleDice(player) {
  player.powers = normalizePowerState(player.powers);
  if (!player.powers.doubleDice.active) return false;
  player.powers.doubleDice.active = false;
  return true;
}

function canSwap(player, myTokenIndex, opponent, targetTokenIndex, isSafeFn) {
  player.powers = normalizePowerState(player.powers);
  if (!player.powers.swap.unlocked) return { ok: false, reason: 'Complete one full lap to unlock Swap' };
  if (player.powers.swap.used) return { ok: false, reason: 'Swap already used' };
  if (!Number.isInteger(myTokenIndex) || myTokenIndex < 0 || myTokenIndex >= player.tokens.length) {
    return { ok: false, reason: 'Choose one of your active tokens' };
  }
  if (!Number.isInteger(targetTokenIndex) || targetTokenIndex < 0 || targetTokenIndex >= opponent.tokens.length) {
    return { ok: false, reason: 'Choose a valid opponent token' };
  }
  if (!isActiveToken(player.tokens[myTokenIndex])) {
    return { ok: false, reason: 'Your swap token must be active' };
  }

  const targetPos = opponent.tokens[targetTokenIndex];
  if (!isBoardToken(targetPos)) return { ok: false, reason: 'Target must be on the outer path' };
  if (isSafeFn(opponent.color, targetPos)) return { ok: false, reason: 'Cannot swap with a safe token' };

  return { ok: true };
}

function applySwap(player, myTokenIndex, opponent, targetTokenIndex) {
  const myPos = player.tokens[myTokenIndex];
  player.tokens[myTokenIndex] = opponent.tokens[targetTokenIndex];
  opponent.tokens[targetTokenIndex] = myPos;
  player.powers.swap.used = true;
}

function onCapture(player) {
  player.powers = normalizePowerState(player.powers);

  if (!player.powers.shield.unlocked) {
    player.powers.shield.unlocked = true;
    player.powers.shield.count = Math.max(player.powers.shield.count, 1);
  }

  if (player.stats.cuts >= 2 && !player.powers.revive.earnedBonus) {
    player.powers.revive.count += 1;
    player.powers.revive.earnedBonus = true;
  }
}

function onRollStats(player) {
  player.powers = normalizePowerState(player.powers);
  if (player.stats.sixes >= 3 && !player.powers.doubleDice.awarded) {
    player.powers.doubleDice.unlocked = true;
    player.powers.doubleDice.count = 1;
    player.powers.doubleDice.awarded = true;
    return true;
  }
  return false;
}

function onLapProgress(player, from, to) {
  player.powers = normalizePowerState(player.powers);
  if (!player.powers.swap.unlocked && from <= 50 && to >= 51) {
    player.powers.swap.unlocked = true;
    return true;
  }
  return false;
}

function getShieldBlocker(player, tokenIndex) {
  player.powers = normalizePowerState(player.powers);
  if (
    player.powers.shield.active &&
    player.powers.shield.activeTokenIndex === tokenIndex &&
    player.powers.shield.remainingOpponentTurns > 0
  ) {
    return player.powers.shield;
  }
  return null;
}

function consumeShield(player) {
  player.powers = normalizePowerState(player.powers);
  player.powers.shield.active = false;
  player.powers.shield.activeTokenIndex = null;
  player.powers.shield.remainingOpponentTurns = 0;
}

function tickOpponentTurnShields(players, finishedPlayerId) {
  players.forEach(player => {
    player.powers = normalizePowerState(player.powers);
    const shield = player.powers.shield;
    if (!shield.active || player.id === finishedPlayerId) return;
    shield.remainingOpponentTurns -= 1;
    if (shield.remainingOpponentTurns <= 0) consumeShield(player);
  });
}

module.exports = {
  createPowerState,
  normalizePowerState,
  applyRevive,
  activateShield,
  activateDoubleDice,
  consumeDoubleDice,
  canSwap,
  applySwap,
  onCapture,
  onRollStats,
  onLapProgress,
  getShieldBlocker,
  consumeShield,
  tickOpponentTurnShields,
};
