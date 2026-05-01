/**
 * TrapAlert.jsx - Full-screen flash notification for trap events
 */
import { AnimatePresence, motion } from 'framer-motion'

const TRAP_INFO = {
  send_home: { label:'TRAP: Sent Home!',  color:'#ef4444', bg:'rgba(239,68,68,0.12)' },
  freeze:    { label:'TRAP: Frozen!',     color:'#60a5fa', bg:'rgba(96,165,250,0.12)' },
  reverse:   { label:'TRAP: Reversed!',   color:'#fbbf24', bg:'rgba(251,191,36,0.12)' },
}

export default function TrapAlert({ event }) {
  if (!event || event.type !== 'TRAP_TRIGGERED') return null
  const info = TRAP_INFO[event.trapType] || { label:'Trap!', color:'#a78bfa', bg:'rgba(108,99,255,0.1)' }
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:1.1 }}
        style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, pointerEvents:'none' }}>
        <div style={{ background:info.bg, border:`2px solid ${info.color}55`, borderRadius:20, padding:'1.5rem 2.5rem', textAlign:'center', backdropFilter:'blur(8px)' }}>
          <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>!</div>
          <div style={{ fontSize:'1.4rem', fontWeight:800, color:info.color, fontFamily:'Outfit,sans-serif' }}>{info.label}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
