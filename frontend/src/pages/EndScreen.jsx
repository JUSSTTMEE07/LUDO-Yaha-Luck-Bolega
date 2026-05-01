/**
 * EndScreen.jsx - Victory screen with standings, luck stats, and seed reveal
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import useGameStore from '../store/gameStore'
import useMediaQuery from '../hooks/useMediaQuery'
import socket from '../socket'
import { verifySeedHash } from '../utils/hashVerify'
import { computeLuckScore, rollDistribution } from '../utils/fairness'

const S = {
  page: { minHeight: '100dvh', background: 'var(--color-bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '3rem 2rem', overflow: 'hidden', position: 'relative' },
  card: { background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2rem', width: '100%', maxWidth: 560, marginBottom: '1.25rem' },
  sectionLabel: { color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '0.75rem', display: 'block' },
  statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  btnPrimary: { background: 'linear-gradient(135deg, #6C63FF 0%, #8B80FF 100%)', color: 'white', border: 'none', borderRadius: 12, padding: '0.75rem 1.75rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 4px 20px rgba(108,99,255,0.35)' },
  btnGhost: { background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '0.75rem 1.75rem', fontWeight: 500, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  hashBox: { background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', wordBreak: 'break-all', lineHeight: 1.6, marginTop: '0.4rem' },
}

const COLOR_MAP = { green: '#2D7D46', red: '#C0392B', blue: '#1A5276', yellow: '#B7860B' }

function LuckBar({ rolls }) {
  const score = computeLuckScore(rolls || [])
  const color = score > 55 ? '#4ade80' : score < 45 ? '#f87171' : '#a78bfa'
  return (
    <div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: '0.2rem' }}>
        <div style={{ height: '100%', width: score + '%', background: color, borderRadius: 3, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontSize: '0.75rem', color }}>{score}% luck</span>
    </div>
  )
}

export default function EndScreen() {
  const navigate = useNavigate()
  const endGameData = useGameStore(s => s.endGameData)
  const user = useGameStore(s => s.user)
  const roomCode = useGameStore(s => s.roomCode)
  const setRoom = useGameStore(s => s.setRoom)

  const [verified, setVerified] = useState(null)
  const [showSeed, setShowSeed] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const isMobile = useMediaQuery('(max-width: 768px)')

  useEffect(() => {
    if (!endGameData) navigate('/lobby')
  }, [endGameData, navigate])

  useEffect(() => {
    if (!endGameData?.seedReveal) return
    const { serverSeed, seedHash } = endGameData.seedReveal
    if (!serverSeed || !seedHash) return
    setVerifying(true)
    verifySeedHash(serverSeed, seedHash).then(ok => {
      setVerified(ok)
      setVerifying(false)
    })
  }, [endGameData])

  const handleRematch = () => {
    if (roomCode) socket.emit('rematch', { roomCode })
    else navigate('/lobby')
  }

  if (!endGameData) return null

  const { winner, stats, seedReveal } = endGameData
  const userId = user?._id || user?.username
  const isWinner = winner === userId
  const winnerStats = stats?.find(p => p.id === winner)

  return (
    <div style={{ ...S.page, padding: isMobile ? '2rem 1rem' : '3rem 2rem' }} className="safe-area-top safe-area-bottom">
      {/* Glow for winner */}
      {isWinner && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <motion.div animate={{ opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 3, repeat: Infinity }}
            style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at top, rgba(251,191,36,0.08) 0%, transparent 60%)' }} />
        </div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -32, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.65, type: 'spring' }}
        style={{ textAlign: 'center', marginBottom: '2.5rem', position: 'relative', zIndex: 5 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: isWinner ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.8rem', fontWeight: 800, color: isWinner ? '#451a03' : 'rgba(255,255,255,0.4)', boxShadow: isWinner ? '0 8px 32px rgba(251,191,36,0.3)' : 'none' }}>
          {isWinner ? 'W' : 'L'}
        </div>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '2.5rem', color: isWinner ? '#fbbf24' : 'rgba(255,255,255,0.85)', margin: '0 0 0.3rem' }}>
          {isWinner ? 'Victory!' : 'Game Over'}
        </h1>
        {!isWinner && winnerStats && (
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', margin: 0 }}>
            <span style={{ color: '#c4b5fd', fontWeight: 600 }}>{winnerStats.username}</span> wins!
          </p>
        )}
      </motion.div>

      {/* Standings */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="end-card" style={{ ...S.card, position: 'relative', zIndex: 5 }}>
        <span style={S.sectionLabel}>FINAL STANDINGS</span>
        {stats?.map((p, i) => {
          const rolls = Array.isArray(p.diceHistory) ? p.diceHistory.map(d => typeof d === 'object' ? d.value : d) : []
          return (
            <div key={p.id} style={S.statRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', width: 16 }}>{i + 1}</span>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_MAP[p.color] || '#888' }} />
                <span style={{ color: 'white', fontWeight: p.id === userId ? 600 : 400, fontSize: '0.9rem' }}>{p.username}</span>
                {p.id === winner && (
                  <span style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', borderRadius: 999, padding: '0.1rem 0.55rem', fontSize: '0.72rem', fontWeight: 600 }}>Winner</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{p.finishedTokens || 0}/4 home</span>
                {rolls.length > 0 && <LuckBar rolls={rolls} />}
              </div>
            </div>
          )
        })}
        {!stats && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>No stats available.</p>}
      </motion.div>

      {/* Provably Fair card */}
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="end-card" style={{ ...S.card, position: 'relative', zIndex: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ ...S.sectionLabel, margin: 0 }}>PROVABLY FAIR</span>
          {verifying && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>Verifying...</span>}
          {!verifying && verified !== null && (
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: verified ? '#4ade80' : '#f87171', background: verified ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (verified ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'), borderRadius: 999, padding: '0.2rem 0.7rem' }}>
              {verified ? 'Seed Verified' : 'Hash Mismatch'}
            </span>
          )}
        </div>
        {seedReveal ? (
          <>
            <div style={S.statRow}>
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>Total Rolls</span>
              <span style={{ color: 'white', fontSize: '0.88rem' }}>{seedReveal.diceHistory?.length || 0}</span>
            </div>
            <button onClick={() => setShowSeed(v => !v)}
              style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'Inter, sans-serif', padding: '0.5rem 0', marginTop: '0.25rem' }}>
              {showSeed ? 'Hide Seed' : 'Show Seed Details'}
            </button>
            {showSeed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', margin: '0.5rem 0 0.15rem' }}>SERVER SEED (revealed after game)</p>
                <div style={S.hashBox}>{seedReveal.serverSeed || 'N/A'}</div>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', margin: '0.75rem 0 0.15rem' }}>SHA-256 HASH (committed before game)</p>
                <div style={S.hashBox}>{seedReveal.seedHash || 'N/A'}</div>
              </motion.div>
            )}
          </>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>Seed data not available.</p>
        )}
      </motion.div>

      {/* Action buttons */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 5 }}>
        <motion.button id="btn-rematch" whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(108,99,255,0.4)' }} whileTap={{ scale: 0.96 }}
          onClick={handleRematch} style={S.btnPrimary}>
          Play Again
        </motion.button>
        <motion.button id="btn-home" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/lobby')} style={S.btnGhost}>
          Back to Lobby
        </motion.button>
      </motion.div>
    </div>
  )
}
