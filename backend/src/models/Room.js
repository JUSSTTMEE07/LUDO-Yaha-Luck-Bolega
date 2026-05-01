const mongoose = require('mongoose');

/**
 * Room model.
 * Stores active game rooms. Auto-expires after 24 hours (TTL index).
 */
const roomSchema = new mongoose.Schema(
  {
    code: {
      type:     String,
      required: true,
      unique:   true,
      uppercase: true,
      length: 6,
    },
    hostId: { type: String, required: true }, // socket ID or user ID of host
    players: [
      {
        userId:   String,
        username: String,
        socketId: String,
        ready:    { type: Boolean, default: false },
        color:    { type: String, default: null },
      },
    ],
    maxPlayers: { type: Number, default: 4, min: 2, max: 4 },
    status: {
      type:    String,
      enum:    ['waiting', 'active', 'ended'],
      default: 'waiting',
    },
    // Embedded lightweight game state snapshot (full state lives in memory)
    gameStateRef: { type: String, default: null }, // key into in-memory store
    createdAt:    { type: Date, default: Date.now, expires: '24h' }, // TTL
  },
  { versionKey: false }
);

module.exports = mongoose.model('Room', roomSchema);
