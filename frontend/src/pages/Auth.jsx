/**
 * Auth.jsx - Login / Register page
 * Username + optional 4-digit PIN.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'
import socket from '../socket'

const S = {
  page: { minHeight: '100dvh', background: 'var(--color-bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' },
  card: { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 420 },
  label: { display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.4rem', letterSpacing: '0.04em' },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.8rem 1rem', color: 'white', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' },
  btnPrimary: { width: '100%', background: 'linear-gradient(135deg, #6C63FF 0%, #8B80FF 100%)', color: 'white', border: 'none', borderRadius: 12, padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 20px rgba(108,99,255,0.35)', marginTop: '0.5rem' },
  tab: (active) => ({ flex: 1, padding: '0.6rem', borderRadius: 10, border: 'none', background: active ? 'rgba(108,99,255,0.3)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.45)', fontWeight: active ? 600 : 400, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'Inter, sans-serif' }),
  errBox: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '0.7rem 1rem', color: '#fca5a5', fontSize: '0.84rem', marginBottom: '1rem' },
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || 
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? `http://${window.location.hostname}:3001` 
    : 'http://localhost:3001');

export default function Auth() {
  const navigate = useNavigate()
  const setUser = useGameStore(s => s.setUser)
  const user = useGameStore(s => s.user)

  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (user) navigate('/lobby') }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) { setError('Username is required'); return }
    if (pin && !/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits'); return }

    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), pin: pin || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || data.error || 'Something went wrong')
      setUser(data.user)
      socket.connect()
      navigate('/lobby')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.page} className="safe-area-top safe-area-bottom">
      {/* Background orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.1) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,128,255,0.08) 0%, transparent 70%)' }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 32, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="auth-card" style={S.card}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#6C63FF,#8B80FF)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '1.5rem', marginBottom: '0.75rem', boxShadow: '0 8px 24px rgba(108,99,255,0.4)' }}>L</div>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: 'white', margin: 0 }}>Welcome</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem', marginTop: '0.3rem' }}>Enter your username to join the game</p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, marginBottom: '1.5rem' }}>
          <button id="tab-login" style={S.tab(mode === 'login')} onClick={() => { setMode('login'); setError('') }}>Sign In</button>
          <button id="tab-register" style={S.tab(mode === 'register')} onClick={() => { setMode('register'); setError('') }}>Register</button>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div key="err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={S.errBox}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={S.label} htmlFor="auth-username">Username</label>
            <input
              id="auth-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. LuckyPlayer42"
              maxLength={20}
              autoComplete="username"
              style={S.input}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={S.label} htmlFor="auth-pin">PIN (optional, 4 digits)</label>
            <input
              id="auth-pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Leave blank for no PIN"
              style={S.input}
            />
          </div>

          <motion.button
            id="auth-submit"
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02, boxShadow: '0 0 32px rgba(108,99,255,0.5)' }}
            whileTap={{ scale: 0.97 }}
            style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
          PIN-protected accounts require the same PIN each session.
        </p>
      </motion.div>
    </div>
  )
}
