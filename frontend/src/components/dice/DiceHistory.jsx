import { motion, AnimatePresence } from 'framer-motion'

const DOT_COLOR = { 1:'#ef4444',2:'#f97316',3:'#eab308',4:'#22c55e',5:'#3b82f6',6:'#a855f7' }

export default function DiceHistory({ diceHistory = [], userId }) {
  const myRolls = diceHistory.filter(d => d.playerId === userId).slice(-10)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
      <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.68rem', fontWeight:600, letterSpacing:'0.08em', margin:0 }}>ROLL HISTORY</p>
      <div style={{ display:'flex', gap:'0.25rem', flexWrap:'wrap' }}>
        {myRolls.length === 0 && (
          <span style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.72rem' }}>No rolls yet</span>
        )}
        <AnimatePresence>
          {myRolls.map((e, i) => (
            <motion.div key={e.turnIndex}
              initial={{ opacity:0, scale:0.5 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              style={{ width:22, height:22, borderRadius:5, background:DOT_COLOR[e.roll]||'#6C63FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.65rem', fontWeight:700, color:'white', opacity:0.5+(i/myRolls.length)*0.5 }}>
              {e.roll}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
