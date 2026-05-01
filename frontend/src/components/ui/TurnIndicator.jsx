/**
 * TurnIndicator.jsx - Who is playing now
 */
import { motion, AnimatePresence } from 'framer-motion'

const COLOR_MAP = { green:'#2D7D46', red:'#C0392B', blue:'#1A5276', yellow:'#B7860B' }

export default function TurnIndicator({ currentPlayer, isMyTurn }) {
  if (!currentPlayer) return null
  return (
    <AnimatePresence mode="wait">
      <motion.div key={currentPlayer.id}
        initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
        style={{
          background: isMyTurn
            ? 'linear-gradient(135deg, rgba(124,105,255,0.24), rgba(255,255,255,0.05))'
            : 'linear-gradient(135deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))',
          border: isMyTurn ? '1px solid rgba(196,181,253,0.35)' : '1px solid rgba(255,255,255,0.08)',
          borderRadius:12,
          padding:'0.7rem 0.8rem',
          boxShadow: isMyTurn ? '0 0 24px rgba(124,105,255,0.18), inset 0 1px 0 rgba(255,255,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.05)',
          position:'relative',
          overflow:'hidden',
        }}>
        {isMyTurn && (
          <motion.div
            animate={{ opacity:[0.15,0.38,0.15] }}
            transition={{ duration:1.6, repeat:Infinity, ease:'easeInOut' }}
            style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 20% 0%, rgba(196,181,253,0.28), transparent 62%)', pointerEvents:'none' }}
          />
        )}
        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.65rem', fontWeight:600, letterSpacing:'0.08em', margin:'0 0 0.2rem' }}>TURN</p>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <motion.div
            animate={isMyTurn ? { scale:[1,1.35,1] } : {}}
            transition={{ duration:1.1, repeat:Infinity, ease:'easeInOut' }}
            style={{ width:8, height:8, borderRadius:'50%', background:COLOR_MAP[currentPlayer.color]||'#888', boxShadow:`0 0 12px ${COLOR_MAP[currentPlayer.color]||'#888'}` }}
          />
          <span style={{ fontWeight:600, fontSize:'0.88rem', color:isMyTurn?'#c4b5fd':'white' }}>
            {isMyTurn ? 'Your Turn' : currentPlayer.username}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
