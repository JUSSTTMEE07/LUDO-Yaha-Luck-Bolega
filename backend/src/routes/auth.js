/**
 * auth.js – Authentication Routes
 * POST /api/auth/register  → create new user
 * POST /api/auth/login     → login with username (+ optional PIN)
 */

'use strict';

const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const mongoose = require('mongoose');
const crypto = require('crypto');

// In-memory fallback
const memoryUsers = new Map();

// ── Register ────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || username.trim().length < 2) {
      return res.status(400).json({ message: 'Username must be at least 2 characters' });
    }

    const isConnected = mongoose.connection.readyState === 1;

    if (isConnected) {
      const exists = await User.findOne({ username: username.trim() });
      if (exists) return res.status(409).json({ message: 'Username already taken' });

      const user = new User({
        username: username.trim(),
        pinHash:  pin ? pin.toString() : null, // pre('save') will hash it
      });
      await user.save();

      return res.status(201).json({
        user: {
          _id:      user._id,
          userId:   user._id,
          username: user.username,
          hasPin:   !!user.pinHash,
        }
      });
    } else {
      // In-memory fallback
      const cleanUsername = username.trim();
      if (memoryUsers.has(cleanUsername.toLowerCase())) {
        return res.status(409).json({ message: 'Username already taken' });
      }

      const newUser = {
        _id: crypto.randomBytes(12).toString('hex'),
        username: cleanUsername,
        pinHash: pin ? pin.toString() : null, // simplistic for mock
        stats: { gamesPlayed: 0, wins: 0, totalCuts: 0, highestLuck: 0 }
      };
      memoryUsers.set(cleanUsername.toLowerCase(), newUser);

      return res.status(201).json({
        user: {
          _id:      newUser._id,
          userId:   newUser._id,
          username: newUser.username,
          hasPin:   !!newUser.pinHash,
        }
      });
    }

  } catch (err) {
    console.error('[auth/register]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username) return res.status(400).json({ message: 'Username required' });

    const isConnected = mongoose.connection.readyState === 1;

    if (isConnected) {
      const user = await User.findOne({ username: username.trim() });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const valid = await user.verifyPin(pin || '');
      if (!valid) return res.status(401).json({ message: 'Incorrect PIN' });

      user.lastSeen = new Date();
      await user.save();

      return res.json({
        user: {
          _id:      user._id,
          userId:   user._id,
          username: user.username,
          hasPin:   !!user.pinHash,
          stats:    user.stats,
        }
      });
    } else {
      // In-memory fallback
      const cleanUsername = username.trim();
      const user = memoryUsers.get(cleanUsername.toLowerCase());
      if (!user) return res.status(404).json({ message: 'User not found' });

      // simplistic mock check
      const valid = !user.pinHash || user.pinHash === (pin ? pin.toString() : '');
      if (!valid) return res.status(401).json({ message: 'Incorrect PIN' });

      return res.json({
        user: {
          _id:      user._id,
          userId:   user._id,
          username: user.username,
          hasPin:   !!user.pinHash,
          stats:    user.stats,
        }
      });
    }

  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
