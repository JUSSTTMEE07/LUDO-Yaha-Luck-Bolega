/**
 * Landing.jsx - Hero Page
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useAnimation } from 'framer-motion'
import useGameStore from '../store/gameStore'
import useMediaQuery from '../hooks/useMediaQuery'

const FEATURES = [
  { letter: 'D', title: 'Provably Fair Dice', desc: 'SHA-256 seeded RNG. Verify every roll after the game.' },
  { letter: 'P', title: 'Power Mechanics', desc: 'Shield, Revive, Swap, Trap Tiles and Double Dice.' },
  { letter: 'M', title: 'Real-time Multiplayer', desc: 'Socket.IO for 2-4 players with instant synced state.' },
  { letter: 'F', title: 'Live Fairness Score', desc: 'Luck meter and roll distribution shown in real time.' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (d) => ({ opacity: 1, y: 0, transition: { delay: d || 0, duration: 0.6, ease: 'easeOut' } }),
}

const S = {
  btnPrimary: {
    background: 'linear-gradient(135deg, #6C63FF 0%, #8B80FF 100%)',
    color: 'white', border: 'none', borderRadius: 12,
    padding: '0.7rem 1.6rem', fontWeight: 600, fontSize: '0.95rem',
    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    boxShadow: '0 4px 20px rgba(108,99,255,0.35)',
  },
  btnGhost: {
    background: 'transparent', color: 'rgba(255,255,255,0.75)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
    padding: '0.7rem 1.6rem', fontWeight: 500, fontSize: '0.95rem',
    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  },
  glass: {
    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
  },
  badge: {
    display: 'inline-block', background: 'rgba(108,99,255,0.15)',
    border: '1px solid rgba(108,99,255,0.3)', borderRadius: 999,
    padding: '0.35rem 1rem', fontSize: '0.82rem', color: 'rgba(168,155,255,0.9)',
  },
}

export default function Landing() {
  const navigate = useNavigate()
  const user = useGameStore(s => s.user)
  const controls = useAnimation()
  const boardRef = useRef(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  const handleMouseMove = (e) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return
    const rx = ((e.clientY - rect.top  - rect.height / 2) / rect.height) * -12
    const ry = ((e.clientX - rect.left - rect.width  / 2) / rect.width)  *  12
    boardRef.current.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`
  }

  const handleMouseLeave = () => {
    if (boardRef.current) boardRef.current.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'
  }

  useEffect(() => { controls.start('visible') }, [controls])

  const BOARD_CELLS = [
    { bg: '#2D7D46' }, { bg: '#1a2035' }, { bg: '#C0392B' },
    { bg: '#1a2035' }, { bg: 'conic-gradient(#2D7D46 0deg 90deg,#C0392B 90deg 180deg,#1A5276 180deg 270deg,#B7860B 270deg 360deg)' }, { bg: '#1a2035' },
    { bg: '#B7860B' }, { bg: '#1a2035' }, { bg: '#1A5276' },
  ]

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg-deep)', overflowX: 'hidden', position: 'relative' }}>

      {/* Animated gradient orbs */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <motion.div animate={{ scale: [1, 1.3, 1], x: [0, 30, 0] }} transition={{ duration: 8, repeat: Infinity }}
          style={{ position: 'absolute', top: '-10%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)' }} />
        <motion.div animate={{ scale: [1, 1.2, 1], x: [0, -20, 0] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,128,255,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* Nav */}
      <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="safe-area-top"
        style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '0.75rem 1rem' : '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6C63FF,#8B80FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>L</div>
          <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>
            Ludo <span style={{ color: 'var(--color-accent)' }}>-</span> Yaha Luck Bolega
          </span>
        </div>
        <div className="landing-nav-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          {user ? (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/lobby')} style={S.btnPrimary}>
              Back to Lobby
            </motion.button>
          ) : (
            <>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/auth')} style={S.btnGhost}>Sign In</motion.button>
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/auth')} style={S.btnPrimary}>Play Now</motion.button>
            </>
          )}
        </div>
      </motion.nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 5, maxWidth: 960, margin: '0 auto', padding: isMobile ? '3rem 1.25rem 2rem' : '6rem 2rem 3rem', textAlign: 'center' }}>
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate={controls} style={{ marginBottom: '1rem' }}>
          <span style={S.badge}>Real-time Multiplayer Ludo</span>
        </motion.div>
        <motion.h1 custom={0.15} variants={fadeUp} initial="hidden" animate={controls}
          style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 'clamp(2.4rem, 6vw, 4.5rem)', lineHeight: 1.1, background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #6C63FF 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 1rem' }}>
          Yaha Luck Bolega
        </motion.h1>
        <motion.p custom={0.3} variants={fadeUp} initial="hidden" animate={controls}
          style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1.15rem', maxWidth: 540, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          The classic Indian board game reimagined with provably fair dice,
          power-ups, and silky-smooth real-time multiplayer.
        </motion.p>
        <motion.div custom={0.45} variants={fadeUp} initial="hidden" animate={controls}
          style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.button whileHover={{ scale: 1.06, boxShadow: '0 0 32px rgba(108,99,255,0.5)' }} whileTap={{ scale: 0.96 }}
            onClick={() => navigate(user ? '/lobby' : '/auth')}
            style={{ ...S.btnPrimary, fontSize: '1.05rem', padding: '0.85rem 2.2rem', borderRadius: 14 }}>
            Play Now
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ ...S.btnGhost, fontSize: '1.05rem', padding: '0.85rem 2.2rem', borderRadius: 14 }}>
            Learn More
          </motion.button>
        </motion.div>
      </section>

      {/* Mini board preview */}
      <motion.div custom={0.6} variants={fadeUp} initial="hidden" animate={controls}
        style={{ display: 'flex', justifyContent: 'center', padding: '0 2rem 4rem', position: 'relative', zIndex: 5 }}>
        <div ref={boardRef} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
          style={{ ...S.glass, width: 280, height: 280, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridTemplateRows: 'repeat(3,1fr)', gap: 4, padding: 12, transition: 'transform 0.1s ease' }}>
          {BOARD_CELLS.map((c, i) => (
            <div key={i} style={{ background: c.bg, borderRadius: 8 }} />
          ))}
        </div>
      </motion.div>

      {/* Features */}
      <section id="features" style={{ position: 'relative', zIndex: 5, maxWidth: 900, margin: '0 auto', padding: isMobile ? '1.5rem 1rem 3rem' : '2rem 2rem 5rem' }}>
        <motion.h2 initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '2rem', color: 'white', textAlign: 'center', marginBottom: '2.5rem' }}>
          Why Play Here?
        </motion.h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }} whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(108,99,255,0.2)' }}
              style={{ ...S.glass, padding: '1.5rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(108,99,255,0.2)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#a78bfa', fontSize: '1.2rem' }}>
                {f.letter}
              </div>
              <div style={{ fontWeight: 600, color: 'white', marginBottom: '0.3rem' }}>{f.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <div style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem' }}>
        2025 Ludo - Yaha Luck Bolega
      </div>
    </div>
  )
}
