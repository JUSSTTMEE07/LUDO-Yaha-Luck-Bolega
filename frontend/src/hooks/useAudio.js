/**
 * useAudio.js - Web Audio API synthesized sounds
 * No external files needed. All sounds generated procedurally.
 */
import { useRef, useCallback } from 'react'

export default function useAudio() {
  const ctxRef = useRef(null)

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    return ctxRef.current
  }

  // Short percussive click for dice roll
  const playDiceRoll = useCallback(() => {
    try {
      const ctx = getCtx()
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3)
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
      src.connect(gain)
      gain.connect(ctx.destination)
      src.start()
    } catch (_) {}
  }, [])

  // Satisfying "thud" when token moves
  const playMove = useCallback(() => {
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } catch (_) {}
  }, [])

  // Punchy "cut" sound
  const playCut = useCallback(() => {
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.25)
      gain.gain.setValueAtTime(0.35, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.25)
    } catch (_) {}
  }, [])

  // Danger heartbeat: low thump
  const playHeartbeat = useCallback(() => {
    try {
      const ctx = getCtx()
      const playThump = (when) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(80, when)
        gain.gain.setValueAtTime(0.5, when)
        gain.gain.exponentialRampToValueAtTime(0.001, when + 0.15)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(when)
        osc.stop(when + 0.15)
      }
      playThump(ctx.currentTime)
      playThump(ctx.currentTime + 0.2)
    } catch (_) {}
  }, [])

  // Victory fanfare: ascending arpeggio
  const playVictory = useCallback(() => {
    try {
      const ctx = getCtx()
      const notes = [261.63, 329.63, 392, 523.25]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.value = freq
        const start = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(0.4, start + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(start)
        osc.stop(start + 0.4)
      })
    } catch (_) {}
  }, [])

  return { playDiceRoll, playMove, playCut, playHeartbeat, playVictory }
}
