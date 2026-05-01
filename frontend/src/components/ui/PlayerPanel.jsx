/**
 * PlayerPanel.jsx - Compact player stats sidebar row
 */
import { motion } from 'framer-motion'
import { memo } from 'react'

const COLOR_MAP = { green:'#2D7D46', red:'#C0392B', blue:'#1A5276', yellow:'#B7860B' }

function PlayerPanel({ player, isCurrentTurn }) {
  const tokenStatuses = player.tokens.map(pos => {
    if (pos === -1) return 'home'
    if (pos === 57) return 'finished'
    if (pos >= 51) return 'homecol'
    return 'active'
  })
  return (
    <motion.div
      animate={{ background: isCurrentTurn ? 'rgba(255,255,255,0.06)' : 'transparent', borderColor: isCurrentTurn ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)' }}
      transition={{ duration:0.3 }}
      className="panel-glass"
      style={{ border:'1px solid', borderRadius:12, padding:'0.6rem 0.75rem', display:'flex', flexDirection:'column', gap:'0.4rem', fontFamily:'Inter, sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
        <div style={{ width:22, height:22, borderRadius:'50%', background:COLOR_MAP[player.color]||'#888', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.67rem', fontWeight:700, color:'rgba(255,255,255,0.95)', boxShadow:'inset 0 1px 2px rgba(255,255,255,0.2), 0 3px 6px rgba(0,0,0,0.35)' }}>
          {player.username?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <span style={{ flex:1, fontSize:'0.82rem', fontWeight:isCurrentTurn?500:400, color:isCurrentTurn?'white':'rgba(255,255,255,0.6)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {player.username}
        </span>
        {isCurrentTurn && (
          <motion.div animate={{ opacity:[1,0.5,1] }} transition={{ duration:2, repeat:Infinity, ease: "easeInOut" }}
            style={{ width:4, height:4, borderRadius:'50%', background:'#fff' }} />
        )}
      </div>
      <div style={{ display:'flex', gap:4, alignItems: 'center' }}>
        {tokenStatuses.map((status, i) => (
          <div key={i} style={{ width:12, height:12, borderRadius:'50%', background: status==='finished'?COLOR_MAP[player.color]:status==='active'?COLOR_MAP[player.color]:status==='homecol'?COLOR_MAP[player.color]+'88':'rgba(255,255,255,0.08)', border:status==='active'?'1px solid rgba(255,255,255,0.4)':'1px solid rgba(255,255,255,0.05)' }} />
        ))}
        <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.3)', marginLeft:6 }}>{player.finishedTokens||0}/4 Home</span>
      </div>
    </motion.div>
  )
}

export default memo(PlayerPanel)
