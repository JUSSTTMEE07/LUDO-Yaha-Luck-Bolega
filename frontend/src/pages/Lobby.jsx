/**
 * Lobby.jsx - Room lobby with create/join, player list, and ready-up
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import useGameStore from '../store/gameStore'
import useMediaQuery from '../hooks/useMediaQuery'
import socket from '../socket'

const S = {
  page: { minHeight: '100dvh', background: 'var(--color-bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  card: { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 500 },
  input: { width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.75rem 1rem', color: 'white', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase', letterSpacing: '0.1em' },
  btnPrimary: { background: 'linear-gradient(135deg, #6C63FF 0%, #8B80FF 100%)', color: 'white', border: 'none', borderRadius: 12, padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 20px rgba(108,99,255,0.35)' },
  btnGhost: { background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '0.75rem 1.5rem', fontWeight: 500, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  btnDanger: { background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '0.75rem 1.5rem', fontWeight: 500, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  playerRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: '0.5rem' },
  errBox: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '0.6rem 1rem', color: '#fca5a5', fontSize: '0.84rem', marginBottom: '0.75rem' },
}

const COLOR_MAP = { green: '#2D7D46', red: '#C0392B', blue: '#1A5276', yellow: '#B7860B' }

export default function Lobby() {
  const navigate = useNavigate()
  const user = useGameStore(s => s.user)
  const room = useGameStore(s => s.room)
  const setRoom = useGameStore(s => s.setRoom)
  const logout = useGameStore(s => s.logout)

  const [view, setView] = useState('home')   // 'home' | 'create' | 'join'
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isMobile = useMediaQuery('(max-width: 768px)')

  const isHost = room?.hostId === (user?._id || user?.username)
  const myPlayer = room?.players?.find(p => p.username === user?.username)
  const allReady = room?.players?.length >= 2 && room?.players?.every(p => p.ready)

  useEffect(() => {
    if (!socket.connected) socket.connect()

    const onRoomCreated = ({ room: r }) => { setRoom(r); setView('room'); setError('') }
    const onRoomJoined  = ({ room: r }) => { setRoom(r); setView('room'); setError('') }
    const onRoomUpdate  = ({ room: r }) => { setRoom(r) }
    const onGameStarted = ({ state, traps, seedHash }) => {
      useGameStore.getState().setGameStarted({ state, traps, seedHash })
      navigate('/game')
    }
    const onError = ({ message }) => { setError(message); setLoading(false) }
    const onRematch = ({ room: r }) => { setRoom(r); setView('room') }

    socket.on('roomCreated', onRoomCreated)
    socket.on('roomJoined',  onRoomJoined)
    socket.on('roomUpdate',  onRoomUpdate)
    socket.on('gameStarted', onGameStarted)
    socket.on('error',       onError)
    socket.on('rematchStarted', onRematch)

    return () => {
      socket.off('roomCreated', onRoomCreated)
      socket.off('roomJoined',  onRoomJoined)
      socket.off('roomUpdate',  onRoomUpdate)
      socket.off('gameStarted', onGameStarted)
      socket.off('error',       onError)
      socket.off('rematchStarted', onRematch)
    }
  }, [navigate, setRoom])

  const handleCreate = () => {
    setError('')
    setLoading(true)
    socket.emit('createRoom', { userId: user._id || user.username, username: user.username })
    setTimeout(() => setLoading(false), 3000)
  }

  const handleJoin = () => {
    setError('')
    if (joinCode.length !== 6) { setError('Enter the full 6-character room code'); return }
    setLoading(true)
    socket.emit('joinRoom', { roomCode: joinCode.toUpperCase(), userId: user._id || user.username, username: user.username })
    setTimeout(() => setLoading(false), 3000)
  }

  const handleToggleReady = () => {
    socket.emit('toggleReady', { roomCode: room.code })
  }

  const handleStart = () => {
    setError('')
    socket.emit('startGame', { roomCode: room.code })
  }

  const handleLeave = () => {
    setRoom(null)
    setView('home')
  }

  const handleLogout = () => {
    logout()
    socket.disconnect()
    navigate('/auth')
  }

  return (
    <div style={{ ...S.page, padding: isMobile ? '1rem 0.75rem' : '2rem' }} className="safe-area-top">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '1.25rem' : '2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6C63FF,#8B80FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white' }}>L</div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'white', fontSize: '1rem' }}>Ludo</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>@{user?.username}</span>
          <button onClick={handleLogout} style={{ ...S.btnGhost, padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Sign out</button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {view === 'room' && room ? (
          /* ── Room view ─────────────────────────────────────────────── */
          <motion.div key="room" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="lobby-card" style={S.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'white', margin: 0 }}>Room Lobby</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Code:</span>
                <span id="room-code" style={{ fontFamily: 'monospace', fontWeight: 700, color: '#a78bfa', fontSize: '1.2rem', letterSpacing: '0.15em', cursor: 'pointer' }}
                  onClick={() => navigator.clipboard?.writeText(room.code)}>
                  {room.code}
                </span>
              </div>
            </div>

            <AnimatePresence>
              {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={S.errBox}>{error}</motion.div>}
            </AnimatePresence>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                PLAYERS ({room.players?.length || 0}/{room.maxPlayers || 4})
              </p>
              {room.players?.map((p, i) => (
                <motion.div key={p.userId || i} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} style={S.playerRow}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color ? COLOR_MAP[p.color] : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  <span style={{ flex: 1, color: 'white', fontWeight: 500 }}>{p.username}</span>
                  {room.hostId && p.userId === room.hostId && <span style={{ fontSize: '0.72rem', color: '#a78bfa', background: 'rgba(108,99,255,0.15)', padding: '0.15rem 0.5rem', borderRadius: 6 }}>HOST</span>}
                  <span style={{ fontSize: '0.8rem', color: p.ready ? '#4ade80' : 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                    {p.ready ? 'Ready' : 'Not Ready'}
                  </span>
                </motion.div>
              ))}
              {Array.from({ length: Math.max(0, (room.maxPlayers || 4) - (room.players?.length || 0)) }).map((_, i) => (
                <div key={'empty-' + i} style={{ ...S.playerRow, opacity: 0.3 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>Waiting for player...</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <motion.button id="btn-toggle-ready" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleToggleReady}
                style={{ ...S.btnPrimary, flex: 1, background: myPlayer?.ready ? 'rgba(74,222,128,0.15)' : 'linear-gradient(135deg, #6C63FF 0%, #8B80FF 100%)', border: myPlayer?.ready ? '1px solid rgba(74,222,128,0.3)' : 'none', color: myPlayer?.ready ? '#4ade80' : 'white' }}>
                {myPlayer?.ready ? 'Unready' : 'Ready Up'}
              </motion.button>
              {isHost && (
                <motion.button id="btn-start-game" whileHover={{ scale: allReady ? 1.03 : 1 }} whileTap={{ scale: allReady ? 0.97 : 1 }}
                  onClick={handleStart} disabled={!allReady}
                  style={{ ...S.btnPrimary, flex: 1, opacity: allReady ? 1 : 0.4, cursor: allReady ? 'pointer' : 'not-allowed' }}>
                  Start Game
                </motion.button>
              )}
            </div>
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center' }}>
              <button onClick={handleLeave} style={{ ...S.btnGhost, fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Leave Room</button>
            </div>
            {!allReady && room.players?.length >= 2 && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem', marginTop: '0.75rem' }}>All players must ready up before the host can start.</p>
            )}
          </motion.div>
        ) : view === 'home' ? (
          /* ── Home view ─────────────────────────────────────────────── */
          <motion.div key="home" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="lobby-card" style={S.card}>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.75rem', color: 'white', marginBottom: '0.4rem' }}>Game Lobby</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2rem', fontSize: '0.9rem' }}>Create a room or join with a code.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <motion.button id="btn-create-room" whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(108,99,255,0.4)' }} whileTap={{ scale: 0.97 }}
                onClick={handleCreate} disabled={loading}
                style={{ ...S.btnPrimary, padding: '1rem', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Creating...' : 'Create Room'}
              </motion.button>
              <motion.button id="btn-join-room-nav" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => setView('join')} style={{ ...S.btnGhost, padding: '1rem', fontSize: '1rem' }}>
                Join with Code
              </motion.button>
            </div>
            {error && <div style={{ ...S.errBox, marginTop: '1rem' }}>{error}</div>}
          </motion.div>
        ) : (
          /* ── Join view ─────────────────────────────────────────────── */
          <motion.div key="join" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="lobby-card" style={S.card}>
            <button onClick={() => { setView('home'); setError('') }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', marginBottom: '1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', padding: 0 }}>
              Back
            </button>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: 'white', marginBottom: '1.5rem' }}>Join a Room</h2>
            {error && <div style={S.errBox}>{error}</div>}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginBottom: '0.4rem' }}>Room Code</label>
              <input id="join-code-input" type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123" maxLength={6} style={S.input} />
            </div>
            <motion.button id="btn-join-room" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleJoin} disabled={loading}
              style={{ ...S.btnPrimary, width: '100%', padding: '0.85rem', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Joining...' : 'Join Room'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
