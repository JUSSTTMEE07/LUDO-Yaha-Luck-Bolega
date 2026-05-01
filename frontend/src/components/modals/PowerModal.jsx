/**
 * PowerModal.jsx - Confirmation modal for power usage (e.g. swap target selection)
 */
import { motion, AnimatePresence } from 'framer-motion'

export default function PowerModal({ open, title, children, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:60, padding:'1.5rem' }}>
          <motion.div initial={{ scale:0.9, y:24 }} animate={{ scale:1, y:0 }} exit={{ scale:0.9, y:24 }}
            style={{ background:'#1A2235', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'2rem', maxWidth:380, width:'100%' }}>
            <h3 style={{ fontFamily:'Outfit,sans-serif', color:'white', margin:'0 0 1rem', fontWeight:700 }}>{title}</h3>
            <div style={{ marginBottom:'1.5rem' }}>{children}</div>
            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button onClick={onConfirm} style={{ flex:1, background:'linear-gradient(135deg,#6C63FF,#8B80FF)', color:'white', border:'none', borderRadius:10, padding:'0.7rem', fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Confirm</button>
              <button onClick={onCancel} style={{ flex:1, background:'transparent', color:'rgba(255,255,255,0.6)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, padding:'0.7rem', fontWeight:500, cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Cancel</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
