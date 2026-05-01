/**
 * FairnessBar.jsx - Real-time roll distribution and luck score
 */
import { motion } from 'framer-motion'
import { computeLuckScore, rollDistribution } from '../../utils/fairness'

const BAR_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7']

export default function FairnessBar({ diceHistory = [], userId }) {
  const myRolls = diceHistory.filter(d => d.playerId === userId).map(d => d.roll)
  const luck = computeLuckScore(myRolls)
  const dist = rollDistribution(myRolls)
  const maxCount = Math.max(...Object.values(dist), 1)
  const luckColor = luck > 55 ? '#4ade80' : luck < 45 ? '#f87171' : '#a78bfa'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.4rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.68rem', fontWeight:600, letterSpacing:'0.08em', margin:0 }}>LUCK</p>
        <span style={{ fontSize:'0.72rem', fontWeight:700, color:luckColor }}>{luck}%</span>
      </div>
      <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:3, overflow:'hidden' }}>
        <motion.div
          animate={{ width:`${luck}%` }}
          transition={{ duration:0.8, ease:'easeOut' }}
          style={{ height:'100%', background:`linear-gradient(90deg,${luckColor},${luckColor}99)`, borderRadius:3 }}
        />
      </div>
      {myRolls.length > 0 && (
        <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:28, marginTop:'0.2rem' }}>
          {[1,2,3,4,5,6].map(face => (
            <div key={face} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <motion.div
                animate={{ height:Math.max(3,(dist[face]/maxCount)*24) }}
                transition={{ duration:0.6, ease:'easeOut' }}
                style={{ width:'100%', background:BAR_COLORS[face-1], borderRadius:'2px 2px 0 0', minHeight:3 }}
              />
              <span style={{ fontSize:'0.55rem', color:'rgba(255,255,255,0.3)', fontWeight:600 }}>{face}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
