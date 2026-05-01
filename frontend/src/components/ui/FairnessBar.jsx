/**
 * FairnessBar.jsx - Real-time roll distribution and luck score
 */
import { motion } from 'framer-motion'
import { computeLuckScore } from '../../utils/fairness'
import { memo } from 'react'

function FairnessBar({ diceHistory = [], userId }) {
  const myRolls = diceHistory.filter(d => d.playerId === userId).map(d => d.roll)
  const percent = Math.max(0, Math.min(100, computeLuckScore(myRolls) || 50))
  const isLow = percent < 30
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.7rem', fontWeight:600, letterSpacing:'0.08em', margin:0, fontFamily:'Inter, sans-serif' }}>LUCK FAIRNESS</p>
        <span style={{ fontSize:'0.75rem', fontWeight:600, color:isLow?'#A84D4D':'rgba(255,255,255,0.8)' }}>
          {Math.round(percent)}%
        </span>
      </div>
      <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden', position:'relative', border:'1px solid rgba(255,255,255,0.05)' }}>
        <motion.div
          initial={{ width: `${percent}%` }}
          animate={{ width: `${percent}%` }}
          transition={{ type:'spring', bounce:0.2, duration:0.8 }}
          style={{ height:'100%', background:isLow?'#A84D4D':'linear-gradient(90deg, #4A6B8C, #6C63FF)', borderRadius:3, position:'relative', boxShadow:'0 0 12px rgba(108,99,255,0.2)' }}
        >
          <motion.div animate={{ x:['-100%', '200%'] }} transition={{ repeat:Infinity, duration:2, ease:'linear' }}
            style={{ position:'absolute', top:0, left:0, bottom:0, width:'50%', background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
        </motion.div>
      </div>
    </div>
  )
}

export default memo(FairnessBar)
