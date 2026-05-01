/**
 * gameStore.js – Zustand Global State
 * Centralizes all game state for the React app.
 * Updated by socket event handlers in useSocket hook.
 */
import { create } from 'zustand'

const useGameStore = create((set, get) => ({
  // ── Auth ────────────────────────────────────────────────────────────────
  user: JSON.parse(localStorage.getItem('ludo_user') || 'null'),
  setUser: (user) => {
    localStorage.setItem('ludo_user', JSON.stringify(user))
    set({ user })
  },
  logout: () => {
    localStorage.removeItem('ludo_user')
    set({ user: null, room: null, gameState: null })
  },

  // ── Room ────────────────────────────────────────────────────────────────
  room:     null,
  roomCode: null,
  setRoom: (room) => set({ room, roomCode: room?.code || null }),

  // ── Game State ──────────────────────────────────────────────────────────
  gameState:   null,
  traps:       [],
  seedHash:    null,
  setGameStarted: ({ state, traps, seedHash }) =>
    set({ gameState: state, traps, seedHash }),
  setGameState: (state) => set({ gameState: state }),

  // ── Dice ────────────────────────────────────────────────────────────────
  lastDiceResult: null, // { diceValue, secondDiceValue, isDouble, validMoves }
  setDiceResult: (result) => set({ lastDiceResult: result }),
  clearDiceResult: () => set({ lastDiceResult: null }),

  // ── Events Queue (for animations) ───────────────────────────────────────
  // Events from stateUpdate are consumed by components
  pendingEvents: [],
  pushEvents: (events) =>
    set(s => ({ pendingEvents: [...s.pendingEvents, ...events] })),
  shiftEvent: () =>
    set(s => ({ pendingEvents: s.pendingEvents.slice(1) })),
  clearEvents: () => set({ pendingEvents: [] }),

  // ── End Game ────────────────────────────────────────────────────────────
  endGameData: null, // { winner, stats, seedReveal }
  setEndGameData: (data) => set({ endGameData: data }),

  // ── UI ──────────────────────────────────────────────────────────────────
  isDangerMode: false, // heartbeat when opponent within 2 tiles
  setDangerMode: (v) => set({ isDangerMode: v }),

  isAlmostCut: false, // flash on near-miss
  setAlmostCut: (v) => {
    set({ isAlmostCut: v })
    if (v) setTimeout(() => set({ isAlmostCut: false }), 1200)
  },
}))

export default useGameStore
