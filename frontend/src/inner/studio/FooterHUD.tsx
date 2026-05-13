export function FooterHUD() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        zIndex: 10,
        borderTop: '1px solid rgba(26,26,26,0.06)',
      }}
    >
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: 'rgba(26,26,26,0.3)', letterSpacing: 1 }}>
        &copy; 2026
      </div>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: 'rgba(26,26,26,0.3)', letterSpacing: 1 }}>
        MADE WITH PURPOSE
      </div>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: 8, color: 'rgba(26,26,26,0.3)', letterSpacing: 1 }}>
        v1.0
      </div>
    </div>
  )
}
