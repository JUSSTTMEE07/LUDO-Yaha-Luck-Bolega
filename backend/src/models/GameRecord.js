const mongoose = require('mongoose');

/**
 * GameRecord model.
 * Stored after each completed game for history + seed verification.
 */
const gameRecordSchema = new mongoose.Schema(
  {
    roomCode:   { type: String, required: true },
    winnerId:   { type: String, required: true },
    winnerName: { type: String, required: true },
    players: [
      {
        userId:    String,
        username:  String,
        color:     String,
        cuts:      Number,
        luckScore: Number,
        avgRoll:   Number,
        sixes:     Number,
        swapUsed:  Boolean,
      },
    ],
    diceHistory: [
      {
        playerId:  String,
        color:     String,
        turnIndex: Number,
        roll:      Number,
      },
    ],
    // Provably fair reveal (populated at game end)
    serverSeedHash: { type: String, required: true },
    serverSeed:     { type: String, default: null }, // revealed after game
    traps: [
      {
        outerIndex: Number,
        type:       String,
        cell:       [Number],
      },
    ],
    startedAt:  Date,
    endedAt:    Date,
    createdAt:  { type: Date, default: Date.now },
  },
  { versionKey: false }
);

module.exports = mongoose.model('GameRecord', gameRecordSchema);
