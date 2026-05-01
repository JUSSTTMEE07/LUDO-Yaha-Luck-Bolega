import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { gsap } from 'gsap'
import {
  getCell, isSafe, COLOR_STYLES, HOME_BASE_CELLS, HOME_BASE_POINTS, OUTER_RING,
  START_OUTER_INDEX, SAFE_OUTER_INDICES, HOME_COLS,
} from '../../utils/boardPaths'

const GRID = 15

// ── Helpers ─────────────────────────────────────────────────────────────────

function toPoint(cs, row, col, size, ox = 0, oy = 0) {
  return {
    top:  row * cs + cs / 2 - size / 2 + oy,
    left: col * cs + cs / 2 - size / 2 + ox,
  }
}

// Small stack offsets so stacked tokens are slightly offset
const STACK_OFFSETS = [
  [-3, -3], [3, -3], [-3, 3], [3, 3],
]

// ── Star SVG ────────────────────────────────────────────────────────────────
const StarIcon = ({ size = 14, color = 'rgba(255,255,255,0.7)' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <polygon
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      fill={color}
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1"
    />
  </svg>
)

// ── Arrow SVG ───────────────────────────────────────────────────────────────
const Arrow = ({ rot, color = '#fff', size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    style={{ transform: `rotate(${rot}deg)`, display: 'block' }}>
    <path d="M4 11h12.17l-5.59-5.59L12 4l8 8-8 8-1.41-1.41L16.17 13H4v-2z" fill={color} />
  </svg>
)

// ── Token Node ───────────────────────────────────────────────────────────────
const TokenNode = memo(function TokenNode({
  player, tokenIdx, pos, isSelectable, isPowerTarget, isPowerSource, shielded,
  activePower, cs, onMove, onPowerTarget, setTokenRef,
}) {
  // Home-base tokens are larger (fill the slot); on-path tokens slightly smaller + stacked
  const isHome = pos === -1
  const size = isHome ? cs * 0.82 : cs * 0.62
  const homeBase = HOME_BASE_POINTS[player.color]?.[tokenIdx] ?? HOME_BASE_CELLS[player.color]?.[tokenIdx]
  const [row, col] = isHome
    ? (homeBase ?? [7, 7])
    : (getCell(player.color, pos) ?? [7, 7])

  const [ox, oy] = isHome ? [0, 0] : (STACK_OFFSETS[tokenIdx] ?? [0, 0])
  const pt = isHome
    ? { top: row * cs - size / 2, left: col * cs - size / 2 }
    : toPoint(cs, row, col, size, ox, oy)
  const initial = player.username?.charAt(0)?.toUpperCase() ?? '?'
  const c = COLOR_STYLES[player.color]

  return (
    <motion.button
      ref={el => setTokenRef(`${player.id}:${tokenIdx}`, el)}
      style={{
        position: 'absolute',
        top: pt.top,
        left: pt.left,
        width: size,
        height: size,
        borderRadius: '50%',
        background: isSelectable
          ? `radial-gradient(circle at 35% 35%, ${c.light}, ${c.bg})`
          : `radial-gradient(circle at 35% 35%, ${c.light}99, ${c.bg}cc)`,
        border: `2px solid ${isPowerTarget || isPowerSource ? '#c4b5fd' : isSelectable ? 'rgba(255,255,255,0.7)' : shielded ? '#86efac' : 'rgba(255,255,255,0.25)'}`,
        boxShadow: isPowerTarget
          ? `0 0 0 4px rgba(196,181,253,0.2), 0 8px 20px rgba(0,0,0,0.55), 0 0 22px rgba(196,181,253,0.55)`
          : isPowerSource
            ? `0 0 0 4px rgba(124,105,255,0.28), 0 8px 20px rgba(0,0,0,0.55)`
            : shielded
              ? `0 0 0 3px rgba(134,239,172,0.2), 0 0 20px rgba(74,222,128,0.38), 0 4px 10px rgba(0,0,0,0.5)`
              : isSelectable
                ? `0 0 0 3px rgba(255,255,255,0.15), 0 6px 16px rgba(0,0,0,0.5), 0 0 18px ${c.glow}`
                : `0 4px 10px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.35)`,
        color: 'rgba(255,255,255,0.95)',
        fontSize: size * 0.42,
        fontWeight: 800,
        fontFamily: 'Outfit, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: isPowerTarget || isPowerSource ? 34 : isSelectable ? 30 : 20,
        cursor: isPowerTarget || isSelectable ? 'pointer' : 'default',
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
      animate={isPowerTarget ? { scale: [1, 1.12, 1] } : isSelectable ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
      whileHover={isPowerTarget || isSelectable ? { scale: 1.18 } : {}}
      onClick={() => {
        if (activePower && isPowerTarget) {
          onPowerTarget?.({ playerId: player.id, tokenIndex: tokenIdx, pos, color: player.color })
          return
        }
        if (isSelectable) onMove(tokenIdx)
      }}
    >
      {initial}
    </motion.button>
  )
})

// ── Main Component ───────────────────────────────────────────────────────────
function LudoBoard({
  gameState,
  validMoves = [],
  userId,
  onMove,
  isMobile = false,
  animationQueue = [],
  activePower = null,
  onPowerTarget,
}) {
  const containerRef = useRef(null)
  const boardRef     = useRef(null)
  const tokenRefs    = useRef(new Map())
  const [boardSize, setBoardSize] = useState(480)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver(([e]) => {
      const max = isMobile
        ? Math.min(e.contentRect.width - 4, e.contentRect.height, 560)
        : Math.min(e.contentRect.width, e.contentRect.height, 540)
      setBoardSize(Math.max(max, 280))
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [isMobile])

  const cs = boardSize / GRID   // cell size in px

  const selectableSet = useMemo(
    () => new Set(validMoves.map(m => m.tokenIndex)),
    [validMoves],
  )

  const setTokenRef = (key, el) => {
    if (el) tokenRefs.current.set(key, el)
    else     tokenRefs.current.delete(key)
  }

  const isPowerTarget = (player, tokenIdx, pos) => {
    if (!activePower) return false
    const isMine = player.id === userId
    if (activePower.type === 'revive') return isMine && pos === -1
    if (activePower.type === 'shield') return isMine && pos >= 0 && pos < 57
    if (activePower.type === 'swap') {
      if (activePower.myTokenIndex == null) return isMine && pos >= 0 && pos < 57
      return !isMine && pos >= 0 && pos < 51 && !isSafe(player.color, pos)
    }
    return false
  }

  // ── Animation handling ────────────────────────────────────────────────────
  useEffect(() => {
    if (!animationQueue?.length) return
    const latest = animationQueue[animationQueue.length - 1]
    if (!latest) return

    if (latest.type === 'MOVE' && latest.tokenKey && Array.isArray(latest.path)) {
      const el = tokenRefs.current.get(latest.tokenKey)
      if (el) {
        const baseTop  = parseFloat(el.style.top  || '0')
        const baseLeft = parseFloat(el.style.left || '0')
        const sz       = parseFloat(el.style.width || `${cs * 0.62}`)
        const tl = gsap.timeline()
        latest.path.forEach(([r, c], i) => {
          const pt = toPoint(cs, r, c, sz)
          tl.to(el, {
            x: pt.left - baseLeft,
            y: pt.top  - baseTop,
            duration: i === 0 ? 0.08 : Math.max((latest.duration ?? 0.6) / latest.path.length, 0.05),
            ease: 'power2.out',
          })
        })
      }
    }

    if (latest.type === 'CAPTURE') {
      const atk = tokenRefs.current.get(latest.attackerTokenKey)
      const vic = tokenRefs.current.get(latest.victimTokenKey)
      if (atk) gsap.fromTo(atk, { scale: 1 }, { scale: 1.2, yoyo: true, repeat: 1, duration: 0.12 })
      if (vic) gsap.to(vic, { scale: 0.2, opacity: 0, duration: 0.25 })
    }
  }, [animationQueue, cs])

  // Clear GSAP transforms after each turn to avoid stale offsets
  useEffect(() => {
    tokenRefs.current.forEach(n => gsap.set(n, { clearProps: 'transform,opacity' }))
  }, [gameState?.turnIndex, gameState?.diceHistory?.length])

  // ── Board cells ───────────────────────────────────────────────────────────

  // Which absolute outer-ring indices are star cells
  const starAbsIndices = new Set([8, 21, 34, 47])

  // Which cells are start cells (absolute index is a color's START)
  const startAbsIdx = { green: 0, red: 13, blue: 26, yellow: 39 }
  // Arrow rotation for each color's start cell
  const startArrow = { green: 0, red: 90, blue: 180, yellow: 270 }

  // Build a lookup: "row,col" → type info
  const cellInfo = useMemo(() => {
    const map = new Map()

    // Home column cells
    Object.entries(HOME_COLS).forEach(([color, cells]) => {
      cells.forEach(([r, c]) => map.set(`${r},${c}`, { type: 'homecol', color }))
    })

    // Outer ring cells
    OUTER_RING.forEach(([r, c], idx) => {
      const key = `${r},${c}`
      // Determine which color's start this is (if any)
      let startColor = null
      for (const [col, absI] of Object.entries(startAbsIdx)) {
        if (absI === idx) { startColor = col; break }
      }
      const isStar = starAbsIndices.has(idx)
      map.set(key, { type: 'outer', idx, startColor, isStar })
    })

    return map
  }, [cs])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Corner home-base areas ────────────────────────────────────────────────
  // Each corner occupies a 6×6 block
  const corners = {
    green:  { top: 0, left: 0 },
    red:    { top: 0, left: 9 },
    blue:   { top: 9, left: 9 },
    yellow: { top: 9, left: 0 },
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: isMobile ? '100%' : 540,
        aspectRatio: '1',
        position: 'relative',
      }}
    >
      <div
        ref={boardRef}
        style={{
          position: 'relative',
          width: boardSize,
          height: boardSize,
          borderRadius: 18,
          overflow: 'hidden',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.07), rgba(255,255,255,0.015))',
          boxShadow: '0 28px 80px rgba(0,0,0,0.68), 0 0 0 1px rgba(255,255,255,0.09), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* ── Background ─────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 45%, #202940 0%, #171d2e 48%, #101622 100%)',
        }} />

        {/* ── Corner bases (6×6 colored squares) ─────────────────────────── */}
        {Object.entries(corners).map(([color, { top, left }]) => {
          const c = COLOR_STYLES[color]
          return (
            <div key={color} style={{
              position: 'absolute',
              top: top * cs, left: left * cs,
              width: 6 * cs, height: 6 * cs,
              background: `radial-gradient(circle at 50% 38%, ${c.light}22, ${c.bg}72 54%, ${c.bg}4d 100%)`,
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: `inset 0 0 28px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 28px ${c.glow}`,
            }}>
              {/* Large inner lighter area */}
              <div style={{
                position: 'absolute',
                top: cs * 1.05, left: cs * 1.05,
                width: 3.9 * cs, height: 3.9 * cs,
                background: 'radial-gradient(circle at 50% 38%, rgba(255,255,255,0.08), rgba(3,8,14,0.68) 68%)',
                borderRadius: cs * 0.22,
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: 'inset 0 8px 18px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)',
              }} />
              {/* 4 large slots, one balanced token position per corner */}
              {HOME_BASE_POINTS[color].map(([r, c2], i) => {
                const slotSize = cs * 1.02
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    top:  (r - top) * cs - slotSize / 2,
                    left: (c2 - left) * cs - slotSize / 2,
                    width: slotSize, height: slotSize,
                    borderRadius: '50%',
                    background: 'rgba(4,10,18,0.45)',
                    border: `2.5px solid ${c.light}`,
                    boxShadow: `inset 0 2px 6px rgba(0,0,0,0.45), 0 0 10px ${c.glow}`,
                  }} />
                )
              })}
            </div>
          )
        })}

        {/* ── Cross path background ───────────────────────────────────────── */}
        {/* Horizontal bar */}
        <div style={{
          position: 'absolute',
          top: 6 * cs, left: 0,
          width: '100%', height: 3 * cs,
          background: 'rgba(255,255,255,0.04)',
        }} />
        {/* Vertical bar */}
        <div style={{
          position: 'absolute',
          top: 0, left: 6 * cs,
          width: 3 * cs, height: '100%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        {/* ── Outer ring path cells ───────────────────────────────────────── */}
        {OUTER_RING.map(([r, c2], idx) => {
          const key = `${r},${c2}`
          const info = cellInfo.get(key)
          const isStart = info?.startColor != null
          const isStar  = info?.isStar

          if (isStart) {
            const sc = info.startColor
            return (
              <div key={key} style={{
                position: 'absolute',
                top: r * cs + 1, left: c2 * cs + 1,
                width: cs - 2, height: cs - 2,
                borderRadius: cs * 0.14,
                background: `linear-gradient(135deg, ${COLOR_STYLES[sc].bg}e6, ${COLOR_STYLES[sc].light}66)`,
                border: `1px solid ${COLOR_STYLES[sc].light}66`,
                boxShadow: `inset 0 0 8px rgba(0,0,0,0.4), 0 0 12px ${COLOR_STYLES[sc].glow}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Arrow rot={startArrow[sc]} color="#fff" size={cs * 0.45} />
              </div>
            )
          }

          return (
            <div key={key} style={{
              position: 'absolute',
              top: r * cs + 1, left: c2 * cs + 1,
              width: cs - 2, height: cs - 2,
              borderRadius: cs * 0.14,
              background: 'linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))',
              border: '1px solid rgba(255,255,255,0.045)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isStar && (
                <StarIcon size={cs * 0.52} color="rgba(255,255,255,0.55)" />
              )}
            </div>
          )
        })}

        {/* ── Home column colored cells ───────────────────────────────────── */}
        {Object.entries(HOME_COLS).map(([color, cells]) =>
          cells.map(([r, c2], i) => {
            const isLast = i === cells.length - 1
            return (
              <div key={`hc-${color}-${i}`} style={{
                position: 'absolute',
                top: r * cs + 1, left: c2 * cs + 1,
                width: cs - 2, height: cs - 2,
                borderRadius: cs * 0.14,
                background: isLast
                  ? `linear-gradient(135deg, ${COLOR_STYLES[color].bg}dd, ${COLOR_STYLES[color].light}66)`
                  : `linear-gradient(135deg, ${COLOR_STYLES[color].bg}76, ${COLOR_STYLES[color].bg}42)`,
                border: `1px solid ${COLOR_STYLES[color].light}22`,
                boxShadow: isLast ? `0 0 14px ${COLOR_STYLES[color].glow}` : 'none',
              }} />
            )
          })
        )}

        {/* ── Grid lines ─────────────────────────────────────────────────── */}
        {Array.from({ length: GRID + 1 }, (_, i) => (
          <div key={`gl-${i}`}>
            <div style={{
              position: 'absolute', top: i * cs, left: 0, right: 0, height: 1,
              background: 'rgba(255,255,255,0.025)',
            }} />
            <div style={{
              position: 'absolute', left: i * cs, top: 0, bottom: 0, width: 1,
              background: 'rgba(255,255,255,0.025)',
            }} />
          </div>
        ))}

        {/* ── Center triangles ────────────────────────────────────────────── */}
        {/* Rendered as 4 triangles pointing to center */}
        <div style={{
          position: 'absolute',
          top: 6 * cs, left: 6 * cs,
          width: 3 * cs, height: 3 * cs,
          overflow: 'hidden',
        }}>
          {/* Green triangle — left */}
          <div style={{
            position: 'absolute',
            width: 0, height: 0,
            borderTop: `${1.5 * cs}px solid transparent`,
            borderBottom: `${1.5 * cs}px solid transparent`,
            borderLeft: `${1.5 * cs}px solid ${COLOR_STYLES.green.bg}`,
          }} />
          {/* Red triangle — top */}
          <div style={{
            position: 'absolute',
            width: 0, height: 0,
            borderLeft: `${1.5 * cs}px solid transparent`,
            borderRight: `${1.5 * cs}px solid transparent`,
            borderTop: `${1.5 * cs}px solid ${COLOR_STYLES.red.bg}`,
            left: 0,
          }} />
          {/* Blue triangle — right */}
          <div style={{
            position: 'absolute',
            right: 0, top: 0,
            width: 0, height: 0,
            borderTop: `${1.5 * cs}px solid transparent`,
            borderBottom: `${1.5 * cs}px solid transparent`,
            borderRight: `${1.5 * cs}px solid ${COLOR_STYLES.blue.bg}`,
          }} />
          {/* Yellow triangle — bottom */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0,
            width: 0, height: 0,
            borderLeft: `${1.5 * cs}px solid transparent`,
            borderRight: `${1.5 * cs}px solid transparent`,
            borderBottom: `${1.5 * cs}px solid ${COLOR_STYLES.yellow.bg}`,
          }} />
          <motion.div
            animate={{ opacity:[0.82,1,0.82], boxShadow:[
              '0 0 22px rgba(240,201,74,0.3), 0 0 42px rgba(0,0,0,0.9), inset 0 1px 3px rgba(255,255,255,0.5)',
              '0 0 34px rgba(240,201,74,0.55), 0 0 48px rgba(0,0,0,0.9), inset 0 1px 3px rgba(255,255,255,0.5)',
              '0 0 22px rgba(240,201,74,0.3), 0 0 42px rgba(0,0,0,0.9), inset 0 1px 3px rgba(255,255,255,0.5)',
            ] }}
            transition={{ duration:2.4, repeat:Infinity, ease:'easeInOut' }}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: cs * 1.08, height: cs * 1.08,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 32%, #fff7cf 0%, #f0c94a 18%, #43311f 58%, #120f1e 100%)',
              border: '2px solid rgba(255,255,255,0.24)',
              boxShadow: '0 0 28px rgba(240,201,74,0.42), 0 0 42px rgba(0,0,0,0.9), inset 0 1px 3px rgba(255,255,255,0.5)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              color:'#fff7cf',
              fontSize: cs * 0.42,
              fontWeight:900,
              fontFamily:'Outfit, sans-serif',
            }}
          >
            L
          </motion.div>
        </div>

        {/* ── Tokens ─────────────────────────────────────────────────────── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {gameState?.players?.map(player =>
            player.tokens.map((pos, ti) => {
              if (pos === 57) return null
              const isMyPlayer = player.id === userId
              const powerTarget = isPowerTarget(player, ti, pos)
              const powerSource = activePower?.type === 'swap' && isMyPlayer && activePower.myTokenIndex === ti
              const shielded = player.powers?.shield?.active && player.powers?.shield?.activeTokenIndex === ti
              return (
                <TokenNode
                  key={`${player.id}-${ti}`}
                  player={player}
                  tokenIdx={ti}
                  pos={pos}
                  isSelectable={isMyPlayer && selectableSet.has(ti)}
                  isPowerTarget={powerTarget}
                  isPowerSource={powerSource}
                  shielded={shielded}
                  activePower={activePower}
                  cs={cs}
                  onMove={onMove}
                  onPowerTarget={onPowerTarget}
                  setTokenRef={setTokenRef}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(LudoBoard)
