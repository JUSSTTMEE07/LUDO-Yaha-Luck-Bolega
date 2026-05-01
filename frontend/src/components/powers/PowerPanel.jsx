import { memo } from 'react'
import { motion } from 'framer-motion'

const POWERS = [
  {
    key: 'revive',
    label: 'Revive',
    desc: 'Bring a home token to start. Starts with 1 charge, +1 after 2 captures.',
    icon: 'R',
  },
  {
    key: 'shield',
    label: 'Shield',
    desc: 'Protect one active token for the next opponent turn. Unlocks after your first capture.',
    icon: 'Sh',
  },
  {
    key: 'swap',
    label: 'Swap',
    desc: 'Swap one active token with a non-safe opponent token. Unlocks after one full lap.',
    icon: 'S',
  },
  {
    key: 'doubleDice',
    label: 'x2 Dice',
    desc: 'Arm a one-turn double roll. Unlocks after three total sixes.',
    icon: 'x2',
  },
]

function getPowerState(key, player) {
  const pw = player?.powers || {}
  if (!player) return { label: 'Locked', ready: false, locked: true }

  if (key === 'revive') {
    const count = pw.revive?.count || 0
    const ready = count > 0 && player.tokens.some(t => t === -1)
    return { label: `${count} charge${count === 1 ? '' : 's'}`, ready, locked: count <= 0 }
  }

  if (key === 'shield') {
    if (pw.shield?.active) return { label: 'Active', ready: false, active: true }
    const count = pw.shield?.count || 0
    return {
      label: pw.shield?.unlocked ? `${count} ready` : 'Capture to unlock',
      ready: pw.shield?.unlocked && count > 0,
      locked: !pw.shield?.unlocked,
    }
  }

  if (key === 'swap') {
    return {
      label: pw.swap?.used ? 'Used' : pw.swap?.unlocked ? 'Ready' : 'Full lap to unlock',
      ready: pw.swap?.unlocked && !pw.swap?.used,
      locked: !pw.swap?.unlocked,
      used: pw.swap?.used,
    }
  }

  const count = pw.doubleDice?.count || 0
  return {
    label: pw.doubleDice?.active ? 'Armed' : pw.doubleDice?.unlocked ? `${count} ready` : 'Roll 3 sixes',
    ready: pw.doubleDice?.unlocked && count > 0 && !pw.doubleDice?.active,
    locked: !pw.doubleDice?.unlocked,
    active: pw.doubleDice?.active,
  }
}

function PowerPanel({ gameState, userId, activePower, onSelectPower }) {
  const myPlayer = gameState?.players?.find(p => p.id === userId)
  const isMyTurn = gameState?.players?.[gameState?.currentPlayerIndex]?.id === userId
  const canAct = isMyTurn && !gameState?.diceRolled

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <p style={{ color:'rgba(255,255,255,0.38)', fontSize:'0.68rem', fontWeight:800, letterSpacing:'0.12em', margin:0, fontFamily:'Inter, sans-serif' }}>POWERS</p>
        {activePower && (
          <button
            onClick={() => onSelectPower(null)}
            style={{ border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.55)', borderRadius:8, fontSize:'0.68rem', padding:'0.18rem 0.45rem' }}
          >
            Cancel
          </button>
        )}
      </div>

      {POWERS.map(power => {
        const state = getPowerState(power.key, myPlayer)
        const selected = activePower?.type === power.key
        const canUse = state.ready && canAct
        const disabled = !canUse && !selected
        return (
          <motion.button
            key={power.key}
            title={power.desc}
            disabled={disabled}
            onClick={() => canUse && onSelectPower(power.key)}
            whileHover={canUse ? { scale:1.025, y:-1 } : {}}
            whileTap={canUse ? { scale:0.97 } : {}}
            style={{
              display:'flex',
              alignItems:'center',
              gap:'0.62rem',
              width:'100%',
              minHeight:54,
              textAlign:'left',
              padding:'0.62rem 0.7rem',
              borderRadius:12,
              border:selected
                ? '1px solid rgba(196,181,253,0.55)'
                : state.active
                  ? '1px solid rgba(74,222,128,0.35)'
                  : canUse
                    ? '1px solid rgba(255,255,255,0.15)'
                    : '1px solid rgba(255,255,255,0.06)',
              background:selected
                ? 'linear-gradient(135deg, rgba(124,105,255,0.24), rgba(255,255,255,0.05))'
                : state.active
                  ? 'linear-gradient(135deg, rgba(74,222,128,0.13), rgba(255,255,255,0.04))'
                  : canUse
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.085), rgba(255,255,255,0.035))'
                    : 'rgba(255,255,255,0.025)',
              cursor: canUse ? 'pointer' : 'default',
              opacity: state.used ? 0.48 : 1,
              fontFamily:'Inter, sans-serif',
              position:'relative',
              overflow:'hidden',
            }}
          >
            {(canUse || selected || state.active) && (
              <motion.div
                animate={{ x:['-100%','120%'] }}
                transition={{ duration:2.2, repeat:Infinity, ease:'easeInOut' }}
                style={{ position:'absolute', top:0, bottom:0, width:'45%', background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)' }}
              />
            )}
            <div style={{
              width:30,
              height:30,
              borderRadius:9,
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              flexShrink:0,
              color: canUse || selected || state.active ? '#f8fafc' : 'rgba(255,255,255,0.34)',
              background: canUse || selected || state.active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              border:'1px solid rgba(255,255,255,0.08)',
              fontSize:'0.68rem',
              fontWeight:800,
            }}>
              {power.icon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color: canUse || selected || state.active ? '#fff' : 'rgba(255,255,255,0.48)', fontSize:'0.82rem', fontWeight:700 }}>
                {power.label}
              </div>
              <div style={{ color: selected ? '#c4b5fd' : state.active ? '#86efac' : 'rgba(255,255,255,0.36)', fontSize:'0.66rem', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {selected ? instructionFor(power.key, activePower) : state.label}
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

function instructionFor(key, activePower) {
  if (key === 'revive') return 'Choose home token'
  if (key === 'shield') return 'Choose your token'
  if (key === 'swap') return activePower?.myTokenIndex == null ? 'Choose your token' : 'Choose opponent'
  if (key === 'doubleDice') return 'Arming...'
  return 'Choose target'
}

export default memo(PowerPanel)
