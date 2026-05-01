/**
 * handlers.js – Socket.IO Event Handlers
 * ─────────────────────────────────────────────────────────────────────────────
 * All game events are validated server-side here.
 * Game state lives in the in-memory `gameStates` Map (roomCode → gameState).
 * Room metadata is persisted to MongoDB via the Room model.
 *
 * EVENTS (client → server):
 *  joinRoom    { roomCode, userId, username }
 *  createRoom  { userId, username }
 *  ready       { roomCode }
 *  startGame   { roomCode }   (host only)
 *  rollDice    { roomCode }
 *  moveToken   { roomCode, tokenIndex }
 *  usePower    { roomCode, powerType, payload }
 *  rematch     { roomCode }
 *
 * EVENTS (server → client):
 *  roomUpdate        { room }
 *  gameStarted       { state (sanitized), traps, seedHash }
 *  diceResult        { diceValue, secondDiceValue, isDouble, validMoves, events }
 *  stateUpdate       { state (sanitized), events }
 *  gameOver          { winner, stats, seedReveal }
 *  error             { message }
 */

'use strict';

const crypto   = require('crypto');
const Room     = require('../models/Room');
const GameRecord = require('../models/GameRecord');
const { generateServerSeed, hashSeed, buildRevealPayload } = require('../game/DiceEngine');
const { generateTraps } = require('../game/TrapEngine');
const {
  createGameState, processDiceRoll, applyMove,
  usePower, buildEndStats,
} = require('../game/GameEngine');
const { getCell } = require('../game/BoardConstants');
const mongoose = require('mongoose');

// In-memory game state store: roomCode → gameState
const gameStates = new Map();
// In-memory rooms fallback
const memoryRooms = new Map();
// Map socketId to userId
const socketUserMap = new Map();
const MOVE_ANIM_MS = 600;
const CAPTURE_IMPACT_MS = 180;

const isConnected = () => mongoose.connection.readyState === 1;

/** Generates a 6-char alphanumeric room code  */
function generateRoomCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

/** Strips the server seed from state before sending to clients */
function sanitizeState(state) {
  const { serverSeed, ...safe } = state; // eslint-disable-line no-unused-vars
  return safe;
}

// ─── Handler Registration ────────────────────────────────────────────────────

module.exports = function registerHandlers(io, socket) {
  console.log(`[socket] connected: ${socket.id}`);

  // ── createRoom ─────────────────────────────────────────────────────────────
  socket.on('createRoom', async ({ userId, username }) => {
    try {
      let code = generateRoomCode();
      let room;

      if (isConnected()) {
        while (await Room.exists({ code })) code = generateRoomCode();
        room = await Room.create({
          code,
          hostId: userId,
          players: [{ userId, username, socketId: socket.id, ready: false }],
          status: 'waiting',
        });
      } else {
        while (memoryRooms.has(code)) code = generateRoomCode();
        room = {
          code,
          hostId: userId,
          players: [{ userId, username, socketId: socket.id, ready: false }],
          status: 'waiting',
          maxPlayers: 4,
          save: async function() { memoryRooms.set(this.code, this); return this; }
        };
        memoryRooms.set(code, room);
      }

      socketUserMap.set(socket.id, userId);
      socket.join(code);
      socket.emit('roomCreated', { roomCode: code, room });
      io.to(code).emit('roomUpdate', { room });
    } catch (err) {
      console.error('[createRoom]', err);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });

  // ── joinRoom ───────────────────────────────────────────────────────────────
  socket.on('joinRoom', async ({ roomCode, userId, username }) => {
    try {
      const code = roomCode?.toUpperCase();
      let room;
      
      if (isConnected()) {
        room = await Room.findOne({ code });
      } else {
        room = memoryRooms.get(code);
      }

      if (!room)                          return socket.emit('error', { message: 'Room not found' });
      if (room.status !== 'waiting')      return socket.emit('error', { message: 'Game already in progress' });
      if (room.players.length >= room.maxPlayers)
                                          return socket.emit('error', { message: 'Room is full' });

      // Prevent duplicate joins
      const already = room.players.find(p => p.userId === userId);
      if (!already) {
        room.players.push({ userId, username, socketId: socket.id, ready: false });
        if (isConnected()) await room.save();
      } else {
        already.socketId = socket.id; // reconnect
        if (isConnected()) await room.save();
      }

      socketUserMap.set(socket.id, userId);
      socket.join(code);
      socket.emit('roomJoined', { roomCode: code, room });
      io.to(code).emit('roomUpdate', { room });
    } catch (err) {
      console.error('[joinRoom]', err);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // ── ready toggle ───────────────────────────────────────────────────────────
  socket.on('toggleReady', async ({ roomCode }) => {
    try {
      const code = roomCode?.toUpperCase();
      let room = isConnected() ? await Room.findOne({ code }) : memoryRooms.get(code);
      if (!room) return socket.emit('error', { message: 'Room not found' });

      const player = room.players.find(p => p.socketId === socket.id);
      if (player) {
        player.ready = !player.ready;
        if (isConnected()) await room.save();
        io.to(code).emit('roomUpdate', { room });
      }
    } catch (err) {
      socket.emit('error', { message: 'Failed to toggle ready' });
    }
  });

  // ── startGame ─────────────────────────────────────────────────────────────
  socket.on('startGame', async ({ roomCode }) => {
    try {
      const code = roomCode?.toUpperCase();
      let room = isConnected() ? await Room.findOne({ code }) : memoryRooms.get(code);

      if (!room) return socket.emit('error', { message: 'Room not found' });
      const userId = socketUserMap.get(socket.id);
      if (room.hostId !== userId) return socket.emit('error', { message: 'Only the host can start' });
      if (room.players.length < 2)  return socket.emit('error', { message: 'Need at least 2 players' });
      if (room.players.some(p => !p.ready)) return socket.emit('error', { message: 'All players must be ready' });

      // Generate provably fair seed
      const serverSeed = generateServerSeed();
      const seedHash   = hashSeed(serverSeed);

      // Generate traps
      const traps = [];

      // Assign colors and build player list
      const playerList = room.players.map((p, i) => ({
        id:       p.userId,
        username: p.username,
      }));

      const gameState = createGameState(code, playerList, serverSeed, seedHash, traps);
      gameStates.set(code, gameState);

      room.status = 'active';
      room.players.forEach((p, i) => { p.color = gameState.players[i].color; });
      if (isConnected()) await room.save();

      io.to(code).emit('gameStarted', {
        state:    sanitizeState(gameState),
        traps:    traps.map(t => ({ cell: t.cell, outerIndex: t.outerIndex, type: t.type })),
        seedHash,
      });
    } catch (err) {
      console.error('[startGame]', err);
      socket.emit('error', { message: 'Failed to start game' });
    }
  });

  // ── rollDice ──────────────────────────────────────────────────────────────
  socket.on('rollDice', ({ roomCode }) => {
    try {
      const code = roomCode?.toUpperCase();
      const state = gameStates.get(code);
      if (!state) return socket.emit('error', { message: 'Game not found' });

      const userId = getUserIdForSocket(state, socket.id, code);
      console.log(`[rollDice] request triggered by socket ${socket.id} for room: ${code}`);
      console.log(`[rollDice] current player: ${userId}`);

      const { newState, diceValue, firstDiceValue, secondDiceValue, validMoves, events } = processDiceRoll(state, userId);
      gameStates.set(code, newState);
      
      console.log(`[rollDice] result emitted: ${diceValue}`);

      io.to(code).emit('diceResult', {
        playerId:        userId,
        diceValue,
        firstDiceValue,
        secondDiceValue,
        isDouble:        newState.isDoubleDiceTurn,
        validMoves:      validMoves.map(m => ({ tokenIndex: m.tokenIndex, from: m.from, to: m.to })),
        events,
      });

      // Keep every client in sync with turn/dice flags after a roll.
      // This is required both for normal rolls (diceRolled=true) and
      // auto-pass turns when there are no valid moves.
      io.to(code).emit('stateUpdate', { state: sanitizeState(newState), events: [] });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ── moveToken ─────────────────────────────────────────────────────────────
  socket.on('moveToken', ({ roomCode, tokenIndex }) => {
    try {
      const code = roomCode?.toUpperCase();
      const state = gameStates.get(code);
      if (!state) return socket.emit('error', { message: 'Game not found' });

      const userId = getUserIdForSocket(state, socket.id, code);
      const diceValue = state.lastDiceValue;
      const { newState, events } = applyMove(state, userId, tokenIndex, diceValue);
      gameStates.set(code, newState);

      const moveEvent = events.find(e => e.type === 'TOKEN_MOVED');
      const captureEvent = events.find(e => e.type === 'TOKEN_CUT');

      if (moveEvent) {
        const movePath = buildMovePath(newState, moveEvent);
        io.to(code).emit('animationEvent', {
          type: 'MOVE',
          roomCode: code,
          tokenKey: `${moveEvent.playerId}:${moveEvent.tokenIndex}`,
          playerId: moveEvent.playerId,
          tokenIndex: moveEvent.tokenIndex,
          path: movePath,
          duration: MOVE_ANIM_MS / 1000,
          playAt: Date.now() + 50,
        });
      }

      if (captureEvent) {
        const capturePlayAt = Date.now() + MOVE_ANIM_MS;
        io.to(code).emit('animationEvent', {
          type: 'CAPTURE',
          roomCode: code,
          attackerTokenKey: `${captureEvent.cutterPlayerId}:${moveEvent?.tokenIndex ?? 0}`,
          victimTokenKey: `${captureEvent.victimPlayerId}:${captureEvent.tokenIndex}`,
          attackerId: captureEvent.cutterPlayerId,
          victimId: captureEvent.victimPlayerId,
          playAt: capturePlayAt,
        });
      }

      const syncDelay = moveEvent ? MOVE_ANIM_MS + (captureEvent ? CAPTURE_IMPACT_MS : 0) : 0;
      setTimeout(() => {
        io.to(code).emit('stateUpdate', { state: sanitizeState(newState), events });
      }, syncDelay);

      // Handle game over
      if (newState.status === 'ended') {
        setTimeout(() => handleGameOver(io, code, newState), syncDelay);
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ── usePower ──────────────────────────────────────────────────────────────
  socket.on('usePower', ({ roomCode, powerType, payload }) => {
    try {
      const code = roomCode?.toUpperCase();
      const state = gameStates.get(code);
      if (!state) return socket.emit('error', { message: 'Game not found' });

      const userId = getUserIdForSocket(state, socket.id, code);
      const { newState, events } = usePower(state, userId, powerType, payload);
      gameStates.set(code, newState);

      events
        .filter(e => e.type?.startsWith('POWER_') || e.type === 'DOUBLE_DICE_ARMED')
        .forEach(e => io.to(code).emit('animationEvent', {
          type: 'POWER',
          roomCode: code,
          powerType,
          playerId: userId,
          eventType: e.type,
          tokenIndex: e.tokenIndex ?? e.myTokenIndex,
          playAt: Date.now() + 40,
        }));

      io.to(code).emit('stateUpdate', { state: sanitizeState(newState), events });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ── rematch ───────────────────────────────────────────────────────────────
  socket.on('rematch', async ({ roomCode }) => {
    try {
      const code = roomCode?.toUpperCase();
      let room = isConnected() ? await Room.findOne({ code }) : memoryRooms.get(code);
      if (!room) return socket.emit('error', { message: 'Room not found' });

      room.status = 'waiting';
      room.players.forEach(p => { p.ready = false; p.color = null; });
      if (isConnected()) await room.save();
      gameStates.delete(code);

      io.to(code).emit('rematchStarted', { room });
    } catch (err) {
      socket.emit('error', { message: 'Failed to start rematch' });
    }
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    console.log(`[socket] disconnected: ${socket.id}`);
    socketUserMap.delete(socket.id);
    // Mark player offline; could add reconnect grace period here
  });
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Looks up userId from socket.id via the in-memory game state.
 * In production this should be tied to an auth token.
 */
function getUserIdForSocket(state, socketId, roomCode) {
  const userId = socketUserMap.get(socketId);
  if (!userId) throw new Error('Player not found for this socket');
  return userId;
}

/**
 * Saves game record and emits GAME_OVER with seed reveal.
 */
async function handleGameOver(io, code, state) {
  try {
    const stats      = buildEndStats(state);
    const reveal     = buildRevealPayload(state.serverSeed, state.diceHistory);
    const winner     = state.players.find(p => p.id === state.winner);

    // Persist to DB if connected
    if (mongoose.connection.readyState === 1) {
      await GameRecord.create({
        roomCode:       code,
        winnerId:       state.winner,
        winnerName:     winner?.username || 'Unknown',
        players:        stats,
        diceHistory:    state.diceHistory,
        serverSeedHash: state.serverSeedHash,
        serverSeed:     state.serverSeed,
        traps:          state.traps,
        startedAt:      state.startedAt,
        endedAt:        state.endedAt,
      });
    }

    io.to(code).emit('gameOver', { winner: state.winner, stats, seedReveal: reveal });
  } catch (err) {
    console.error('[handleGameOver]', err);
  }
}

function buildMovePath(state, moveEvent) {
  const path = [];
  const mover = state.players.find(p => p.id === moveEvent.playerId);
  if (!mover) return path;
  for (let pos = Math.max(moveEvent.from + 1, 0); pos <= moveEvent.to; pos += 1) {
    const cell = getCell(mover.color, pos);
    if (cell) path.push(cell);
  }
  if (moveEvent.from === -1 && path.length === 0) {
    const entry = getCell(mover.color, 0);
    if (entry) path.push(entry);
  }
  return path;
}
