/**
 * Game.jsx - Main game screen
 * Mobile-first responsive layout:
 *   Mobile  → vertical stack with bottom action bar
 *   Desktop → 3-column layout (players | board | controls)
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import useGameStore from '../store/gameStore'
import useMediaQuery from '../hooks/useMediaQuery'
import socket from '../socket'
import useAudio from '../hooks/useAudio'

// Board
import LudoBoard from '../components/board/LudoBoard'
// Dice
import DiceRoller from '../components/dice/DiceRoller'
import DiceHistory from '../components/dice/DiceHistory'
// Powers
import PowerPanel from '../components/powers/PowerPanel'
// UI
import PlayerPanel from '../components/ui/PlayerPanel'
import TurnIndicator from '../components/ui/TurnIndicator'
import FairnessBar from '../components/ui/FairnessBar'
import GlassCard from '../components/ui/GlassCard'
// Modals
import TrapAlert from '../components/modals/TrapAlert'

const EVENT_LABELS = {
  TOKEN_CUT:        'Token Cut!',
  TOKEN_FINISHED:   'Token Home!',
  TRAP_TRIGGERED:   'Trap!',
  EXTRA_TURN:       'Extra Turn!',
  POWER_REVIVE:     'Revived!',
  POWER_SHIELD:     'Shielded!',
  POWER_SWAP:       'Swapped!',
  POWER_UNLOCKED:   'Power Unlocked!',
  POWER_GAINED:     'Power Gained!',
  SHIELD_BLOCKED_CUT:'Shield Blocked!',
  DOUBLE_DICE_ARMED:'Double Dice Armed!',
  THREE_SIXES_FORFEIT:'3 Sixes - Forfeit!',
  SIX_CHAIN_LIMITED: '2 Sixes Max - Rerolled!',
  NO_VALID_MOVES:   'No Valid Moves',
}

const COLOR_MAP = { green: '#2D7D46', red: '#C0392B', blue: '#1A5276', yellow: '#B7860B' }

const POWER_LABELS = {
  shield: '🛡️',
  revive: '💫',
  swap: '🔄',
  doubleDice: 'x2',
}

export default function Game() {
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const gameState   = useGameStore(s => s.gameState)
  const room        = useGameStore(s => s.room)
  const user        = useGameStore(s => s.user)
  const roomCode    = useGameStore(s => s.roomCode)
  const traps       = useGameStore(s => s.traps)
  const diceResult  = useGameStore(s => s.lastDiceResult)
  const isDanger    = useGameStore(s => s.isDangerMode)
  const pendingEvents = useGameStore(s => s.pendingEvents)
  const shiftEvent  = useGameStore(s => s.shiftEvent)
  const setEndGameData = useGameStore(s => s.setEndGameData)
  const setGameState = useGameStore(s => s.setGameState)
  const setDiceResult = useGameStore(s => s.setDiceResult)
  const pushEvents  = useGameStore(s => s.pushEvents)
  const setDangerMode = useGameStore(s => s.setDangerMode)

  const audio = useAudio()
  const userId = user?._id || user?.username

  const currentPlayer = gameState?.players?.[gameState?.currentPlayerIndex]
  const isMyTurn = currentPlayer?.id === userId
  const validMoves = (isMyTurn && gameState?.diceRolled) ? (diceResult?.validMoves || []) : []

  // Mobile panel toggle
  const [showMobilePanel, setShowMobilePanel] = useState(false)
  const [animationQueue, setAnimationQueue] = useState([])
  const [activePower, setActivePower] = useState(null)
  const rootRef = useRef(null)

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameState && !room) return  // show session-not-found screen instead of blind redirect

    const onRoomUpdate  = ({ room: r }) => useGameStore.getState().setRoom(r)
    const onStateUpdate = ({ state, events }) => {
      setGameState(state)
      if (events?.length) {
        pushEvents(events)
        const hasDanger = events.some(e => e.type === 'danger')
        setDangerMode(hasDanger)
        if (events.some(e => e.type === 'TOKEN_CUT')) { audio.playCut(); }
        else if (events.some(e => e.type === 'TOKEN_MOVED')) { audio.playMove(); }
      }
    }
    const onDiceResult = (data) => {
      setDiceResult(data)
      audio.playDiceRoll()
      if (data.events?.length) pushEvents(data.events)
    }
    const onGameOver = ({ winner, stats, seedReveal }) => {
      setEndGameData({ winner, stats, seedReveal })
      if (winner === userId) audio.playVictory()
      navigate('/end')
    }
    const onAnimationEvent = (data) => {
      const wait = Math.max((data?.playAt || Date.now()) - Date.now(), 0)
      setTimeout(() => {
        setAnimationQueue(q => [...q.slice(-5), data])
      }, wait)
    }

    socket.on('roomUpdate',  onRoomUpdate)
    socket.on('stateUpdate', onStateUpdate)
    socket.on('diceResult',  onDiceResult)
    socket.on('gameOver',    onGameOver)
    socket.on('animationEvent', onAnimationEvent)
    return () => {
      socket.off('roomUpdate',  onRoomUpdate)
      socket.off('stateUpdate', onStateUpdate)
      socket.off('diceResult',  onDiceResult)
      socket.off('gameOver',    onGameOver)
      socket.off('animationEvent', onAnimationEvent)
    }
  }, [navigate, room, gameState, userId, setGameState, setDiceResult, pushEvents, setDangerMode, setEndGameData, audio])

  useEffect(() => {
    if (!rootRef.current) return
    if (!useGameStore.getState().isAlmostCut) return
    gsap.fromTo(
      rootRef.current,
      { boxShadow: 'inset 0 0 0 rgba(188,74,74,0)' },
      { boxShadow: 'inset 0 0 120px rgba(188,74,74,0.12)', duration: 0.26, yoyo: true, repeat: 1, ease: 'power2.inOut' },
    )
  }, [pendingEvents])

  useEffect(() => {
    if (!isMyTurn || gameState?.diceRolled) setActivePower(null)
  }, [isMyTurn, gameState?.diceRolled])

  // ── Event queue consumer (animation timing) ────────────────────────────────
  useEffect(() => {
    if (pendingEvents.length === 0) return
    const t = setTimeout(shiftEvent, 700)
    return () => clearTimeout(t)
  }, [pendingEvents, shiftEvent])

  // ── Danger heartbeat ───────────────────────────────────────────────────────
  const heartbeatRef = useRef(null)
  useEffect(() => {
    if (isDanger) {
      heartbeatRef.current = setInterval(() => audio.playHeartbeat(), 1000)
    } else {
      clearInterval(heartbeatRef.current)
    }
    return () => clearInterval(heartbeatRef.current)
  }, [isDanger, audio])

  const handleRoll = () => {
    if (!isMyTurn || !roomCode) return
    socket.emit('rollDice', { roomCode })
  }

  const handleMove = (tokenIndex) => {
    if (!isMyTurn || !roomCode) return
    socket.emit('moveToken', { roomCode, tokenIndex })
  }

  const handlePowerSelect = (powerType) => {
    if (!powerType) return setActivePower(null)
    if (!isMyTurn || gameState?.diceRolled || !roomCode) return
    if (powerType === 'doubleDice') {
      socket.emit('usePower', { roomCode, powerType: 'doubleDice', payload: {} })
      setActivePower(null)
      return
    }
    setActivePower({ type: powerType, myTokenIndex: null })
  }

  const handlePowerTarget = ({ playerId: targetPlayerId, tokenIndex, pos }) => {
    if (!activePower || !isMyTurn || !roomCode) return
    const isMine = targetPlayerId === userId

    if (activePower.type === 'revive') {
      if (!isMine || pos !== -1) return
      socket.emit('usePower', { roomCode, powerType: 'revive', payload: { tokenIndex } })
      setActivePower(null)
      return
    }

    if (activePower.type === 'shield') {
      if (!isMine || pos < 0 || pos >= 57) return
      socket.emit('usePower', { roomCode, powerType: 'shield', payload: { tokenIndex } })
      setActivePower(null)
      return
    }

    if (activePower.type === 'swap') {
      if (activePower.myTokenIndex == null) {
        if (!isMine || pos < 0 || pos >= 57) return
        setActivePower({ type: 'swap', myTokenIndex: tokenIndex })
        return
      }
      if (isMine || pos < 0 || pos >= 57) return
      socket.emit('usePower', {
        roomCode,
        powerType: 'swap',
        payload: {
          myTokenIndex: activePower.myTokenIndex,
          targetPlayerId,
          targetTokenIndex: tokenIndex,
        },
      })
      setActivePower(null)
    }
  }

  // Current event for toast
  const currentEvent = pendingEvents[0]
  const trapEvent = pendingEvents.find(e => e.type === 'TRAP_TRIGGERED')

  // Get current player's powers for mobile bar
  const myPlayerState = gameState?.players?.find(p => p.id === userId)
  const myPowers = myPlayerState?.powers || {}

  if (!gameState) return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg-deep)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '2rem',
    }}>
      <div style={{ fontSize: '3rem' }}>🎲</div>
      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', fontWeight: 600 }}>
        Session not found
      </p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', textAlign: 'center', maxWidth: 320 }}>
        Your game session ended or the page was refreshed. Please rejoin from the lobby.
      </p>
      <button
        onClick={() => navigate('/lobby')}
        style={{
          marginTop: '0.5rem',
          background: 'linear-gradient(135deg, #6C63FF, #8B80FF)',
          color: 'white', border: 'none', borderRadius: 12,
          padding: '0.75rem 2rem', fontWeight: 600, fontSize: '0.95rem',
          cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        }}
      >
        Go to Lobby
      </button>
    </div>
  )

  return (
    <div ref={rootRef} className="game-layout no-select bg-gradient-ludo" style={{
      background: isDanger
        ? 'radial-gradient(ellipse at center,rgba(239,68,68,0.05) 0%,var(--color-bg-deep) 55%)'
        : 'var(--color-bg-deep)',
      transition: 'background 0.5s',
      paddingBottom: isMobile ? '80px' : 0, // space for mobile action bar
    }}>

      {/* Trap overlay */}
      <AnimatePresence>{trapEvent && <TrapAlert event={trapEvent} />}</AnimatePresence>

      {/* Top bar */}
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
        className="safe-area-top"
        style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.05)', position:'sticky', top:0, zIndex:20, background:'rgba(10,14,26,0.88)', backdropFilter:'blur(12px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <div style={{ width:26, height:26, borderRadius:7, background:'linear-gradient(135deg,#6C63FF,#8B80FF)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'white', fontSize:'0.8rem' }}>L</div>
          <span style={{ fontFamily:'monospace', color:'#a78bfa', fontWeight:700, letterSpacing:'0.12em', fontSize: isMobile ? '0.75rem' : '0.85rem' }}>{roomCode}</span>
        </div>

        {/* Event toast */}
        <AnimatePresence mode="wait">
          {currentEvent && (
            <motion.div key={currentEvent.type + currentEvent.playerId}
              initial={{ opacity:0, y:-6, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:6 }}
              style={{ background:'rgba(108,99,255,0.18)', border:'1px solid rgba(108,99,255,0.3)', borderRadius:20, padding:'0.25rem 0.8rem', color:'#c4b5fd', fontSize:'0.8rem', fontWeight:500, maxWidth: isMobile ? 140 : 'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {EVENT_LABELS[currentEvent.type] || currentEvent.type}
            </motion.div>
          )}
        </AnimatePresence>

        <span style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.82rem' }}>@{user?.username}</span>
      </motion.div>

      {/* ── Mobile: Compact player strip ──────────────────────────── */}
      {isMobile && (
        <div className="mobile-player-strip">
          {gameState.players.map(p => (
            <div key={p.id}
              className={`mobile-player-chip ${currentPlayer?.id === p.id ? 'active' : ''}`}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_MAP[p.color] || '#888', flexShrink: 0 }} />
              <span>{p.username}</span>
              {currentPlayer?.id === p.id && (
                <span style={{ fontSize: '0.6rem', color: '#a78bfa' }}>●</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Main layout ──────────────────────────────────────────── */}
      <div className="game-layout-main" style={!isMobile ? { flex:1, padding:'0.75rem 1rem', maxWidth:1100, margin:'0 auto', width:'100%', boxSizing:'border-box' } : {}}>

        {/* Left sidebar — desktop only */}
        {!isMobile && (
          <motion.div initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1 }}
            className="game-sidebar"
            style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.68rem', fontWeight:600, letterSpacing:'0.08em', margin:'0 0 0.15rem' }}>PLAYERS</p>
            {gameState.players.map(p => (
              <PlayerPanel key={p.id} player={p} isCurrentTurn={currentPlayer?.id === p.id} />
            ))}
            <div style={{ marginTop:'0.25rem' }}>
              <TurnIndicator currentPlayer={currentPlayer} isMyTurn={isMyTurn} />
            </div>
          </motion.div>
        )}

        {/* Center board */}
        <motion.div initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.15 }}
          className="game-board-area"
          style={!isMobile ? { flex:1, display:'flex', alignItems:'center', justifyContent:'center', minWidth:0 } : {}}>
          <LudoBoard
            gameState={gameState}
            traps={traps}
            validMoves={validMoves}
            userId={userId}
            roomCode={roomCode}
            onMove={handleMove}
            isMobile={isMobile}
            animationQueue={animationQueue}
            activePower={activePower}
            onPowerTarget={handlePowerTarget}
          />
        </motion.div>

        {/* Right sidebar — desktop only */}
        {!isMobile && (
          <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1 }}
            className="game-sidebar-right"
            style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {/* Dice */}
            <GlassCard style={{ padding: '1rem' }}>
              <DiceRoller
                gameState={gameState}
                isMyTurn={isMyTurn}
                diceResult={diceResult}
                onRoll={handleRoll}
                userId={userId}
                roomCode={roomCode}
              />
            </GlassCard>

            {/* Dice history */}
            <GlassCard style={{ padding: '0.85rem' }}>
              <DiceHistory diceHistory={gameState.diceHistory || []} userId={userId} />
            </GlassCard>

            {/* Powers */}
            <GlassCard style={{ padding: '0.85rem' }}>
              <PowerPanel
                gameState={gameState}
                userId={userId}
                roomCode={roomCode}
                activePower={activePower}
                onSelectPower={handlePowerSelect}
              />
            </GlassCard>

            {/* Fairness */}
            <GlassCard style={{ padding: '0.85rem' }}>
              <FairnessBar diceHistory={gameState.diceHistory || []} userId={userId} />
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* ── Mobile: Bottom Action Bar ────────────────────────────── */}
      {isMobile && (
        <div className="mobile-action-bar">
          {/* Power buttons */}
          {Object.entries(POWER_LABELS).map(([key, emoji]) => {
            const mobileState = (() => {
              if (key === 'revive') {
                const count = myPowers.revive?.count || 0
                return { ready: count > 0 && myPlayerState?.tokens?.some(t => t === -1), badge: count }
              }
              if (key === 'shield') {
                return { ready: (myPowers.shield?.count || 0) > 0, badge: myPowers.shield?.active ? 'A' : (myPowers.shield?.count || 0) }
              }
              if (key === 'swap') {
                return { ready: myPowers.swap?.unlocked && !myPowers.swap?.used, badge: myPowers.swap?.used ? 0 : 1 }
              }
              const count = myPowers.doubleDice?.count || 0
              return { ready: count > 0 && !myPowers.doubleDice?.active, badge: myPowers.doubleDice?.active ? 'A' : count }
            })()
            const canUseMobile = mobileState.ready && isMyTurn && !gameState?.diceRolled
            return (
              <button
                key={key}
                className={`mobile-power-btn ${mobileState.ready || activePower?.type === key ? 'has-power' : ''}`}
                disabled={!canUseMobile}
                onClick={() => canUseMobile && handlePowerSelect(key)}
              >
                <span style={{ fontSize: '1.1rem' }}>{emoji}</span>
                {mobileState.badge ? (
                  <span style={{ position: 'absolute', top: -2, right: -2, background: '#6C63FF', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{mobileState.badge}</span>
                ) : null}
              </button>
            )
          })}

          {/* Turn label */}
          <div className="mobile-turn-label">
            {isMyTurn ? (
              <span className="highlight">Your Turn!</span>
            ) : (
              <span><span className="highlight">{currentPlayer?.username}</span>'s turn</span>
            )}
          </div>

          {/* Dice button */}
          <button
            className="mobile-dice-btn"
            disabled={!isMyTurn || gameState?.diceRolled}
            onClick={handleRoll}
          >
            {diceResult?.diceValue ? (
              <span className="dice-value">{diceResult.diceValue}</span>
            ) : (
              <span>🎲</span>
            )}
            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
              {isMyTurn && !gameState?.diceRolled ? 'Roll' : 'Dice'}
            </span>
          </button>

          {/* Expand button for more controls */}
          <button
            className="mobile-power-btn"
            onClick={() => setShowMobilePanel(v => !v)}
            style={{ position: 'relative' }}
          >
            <span style={{ fontSize: '1rem' }}>{showMobilePanel ? '✕' : '⋯'}</span>
          </button>
        </div>
      )}

      {/* ── Mobile: Expandable panel (dice history, fairness, etc.) ── */}
      <AnimatePresence>
        {isMobile && showMobilePanel && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '55vh',
              background: 'rgba(10,14,26,0.97)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px 20px 0 0',
              zIndex: 60,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <div style={{ padding: '0 1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Players detail */}
              <div>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', marginBottom: '0.4rem' }}>PLAYERS</p>
                {gameState.players.map(p => (
                  <PlayerPanel key={p.id} player={p} isCurrentTurn={currentPlayer?.id === p.id} />
                ))}
              </div>

              {/* Dice history */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '0.85rem' }}>
                <DiceHistory diceHistory={gameState.diceHistory || []} userId={userId} />
              </div>

              {/* Fairness */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '0.85rem' }}>
                <FairnessBar diceHistory={gameState.diceHistory || []} userId={userId} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
