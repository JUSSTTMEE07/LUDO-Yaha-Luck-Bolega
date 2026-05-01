import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'

const DOTS = {
  1:[[50,50]],2:[[25,25],[75,75]],3:[[25,25],[50,50],[75,75]],
  4:[[25,25],[75,25],[25,75],[75,75]],5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
  6:[[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
}

function DieFace({ value=1, size=64 }) {
  const dots = DOTS[value] || DOTS[1]
  return (
    <div style={{ width:size, height:size, background:'#E2E8F0', borderRadius:size*0.15, boxShadow:'0 8px 24px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.5)', position:'relative', flexShrink:0, border: '1px solid rgba(255,255,255,0.4)' }}>
      {dots.map(([x,y],i) => (
        <div key={i} style={{ position:'absolute', left:`${x}%`, top:`${y}%`, transform:'translate(-50%,-50%)', width:size*0.18, height:size*0.18, borderRadius:'50%', background:'#1E293B', boxShadow:'inset 0 1px 2px rgba(0,0,0,0.5)' }} />
      ))}
    </div>
  )
}

export default function DiceRoller({ gameState, isMyTurn, diceResult, onRoll }) {
  const [phase, setPhase] = useState('idle')
  const [displayValue, setDisplayValue] = useState(1)
  const [secondValue, setSecondValue] = useState(null)
  const prevRef = useRef(null)
  const dieRef = useRef(null)

  useEffect(() => {
    if (!diceResult || diceResult === prevRef.current) return
    prevRef.current = diceResult
    setPhase('rolling')

    if (dieRef.current) {
      const tl = gsap.timeline({
        onComplete: () => {
          setDisplayValue(diceResult.diceValue || 1)
          setSecondValue(diceResult.secondDiceValue || null)
          setPhase('landing')
          gsap.to(dieRef.current, {
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.26,
            ease: 'power2.out',
            onComplete: () => setPhase('idle'),
          })
        },
      })
      tl.to(dieRef.current, {
        y: -26,
        rotation: 220,
        scale: 1.12,
        duration: 0.32,
        ease: 'power2.out',
      }).to(dieRef.current, {
        y: -8,
        rotation: 340,
        scale: 0.94,
        duration: 0.28,
        ease: 'power2.inOut',
      })
    }
  }, [diceResult])

  // Fallback to prevent stuck rolling state if socket response fails
  useEffect(() => {
    if (phase === 'rolling') {
      const fallback = setTimeout(() => setPhase('idle'), 3000)
      return () => clearTimeout(fallback)
    }
  }, [phase])

  const canRoll = isMyTurn && !gameState?.diceRolled && phase === 'idle'

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.75rem' }}>
      <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.7rem', fontWeight:600, letterSpacing:'0.08em', margin:0, fontFamily:'Inter, sans-serif' }}>DICE</p>

      <div style={{ position:'relative', padding:'0.35rem', borderRadius:18, background:'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1), rgba(255,255,255,0.025) 58%)', border:'1px solid rgba(255,255,255,0.08)', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
        <motion.div
          ref={dieRef}
          animate={phase==='rolling'?{ y:[-10, -40, -10], rotate:[0, 10, -10, 0], scale:[1,1.1,1] }:phase==='landing'?{ y:[0,-5,0], scale:[1,0.95,1] }:{ y:0, rotate:0, scale:1 }}
          transition={{ duration:phase==='rolling'?0.6:0.4, ease:'easeInOut' }}
          style={{ cursor:canRoll?'pointer':'default' }}
          onClick={() => { if(canRoll){ setPhase('rolling'); onRoll() } }}
          whileHover={canRoll?{ scale:1.05, y:-2 }:{}}
        >
          <DieFace value={phase==='rolling'?Math.ceil(Math.random()*6):displayValue} size={64} />
        </motion.div>
        {secondValue && (
          <div style={{ position:'absolute', right:-8, bottom:-8, transform:'scale(0.58)', transformOrigin:'bottom right' }}>
            <DieFace value={secondValue} size={52} />
          </div>
        )}
      </div>



      <motion.button id="btn-roll-dice" onClick={() => { if(canRoll){ setPhase('rolling'); onRoll() } }} disabled={!canRoll}
        whileHover={canRoll?{ scale:1.04 }:{}} whileTap={canRoll?{ scale:0.96 }:{}}
        style={{ background:canRoll?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.03)', color:canRoll?'white':'rgba(255,255,255,0.25)', border:canRoll?'1px solid rgba(255,255,255,0.2)':'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'0.6rem 1rem', fontWeight:500, fontSize:'0.85rem', cursor:canRoll?'pointer':'not-allowed', fontFamily:'Inter,sans-serif', width:'100%', transition:'all 0.2s' }}>
        {phase==='rolling'?'Rolling..':!isMyTurn?'Wait':gameState?.diceRolled?'Pick Token':'Roll Dice'}
      </motion.button>
    </div>
  )
}
