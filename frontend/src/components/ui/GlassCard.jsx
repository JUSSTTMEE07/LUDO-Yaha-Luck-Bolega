/**
 * GlassCard.jsx - Reusable glass panel
 */
export default function GlassCard({ children, style = {}, id }) {
  return (
    <div
      id={id}
      className="panel-glass"
      style={{
        padding: '1.05rem',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.075), rgba(255,255,255,0.03))',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 16px 38px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
