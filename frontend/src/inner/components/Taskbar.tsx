interface TaskbarProps {
  windows: { id: string; title: string; icon: string }[]
  onOpen: (id: string) => void
  onFocus: (id: string) => void
  onClose: (id: string) => void
  onMinimize: (id: string) => void
  onMaximize: (id: string) => void
  maximized: Record<string, boolean>
}

export function Taskbar({ windows, onOpen, onFocus, onClose, onMinimize, onMaximize, maximized }: TaskbarProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 28,
        background: '#c0c0c0',
        borderTop: '2px solid #ffffff',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2px',
        gap: 2,
      }}
    >
      {/* start button */}
      <div
        style={{
          padding: '2px 6px',
          background: '#c0c0c0',
          border: '2px solid',
          borderColor: '#ffffff #808080 #808080 #ffffff',
          borderRadius: 0,
          color: '#000000',
          fontSize: 11,
          fontWeight: 'bold',
          cursor: 'pointer',
          fontFamily: "'MS Sans Serif', 'Microsoft Sans Serif', monospace",
          display: 'flex',
          alignItems: 'center',
          gap: 3,
        }}
        onClick={() => {
          if (!windows.find(w => w.id === 'credits')) {
            onOpen('credits')
          }
        }}
      >
        <span style={{ fontSize: 14, lineHeight: '14px' }}>\u2630</span>
        <span>Start</span>
      </div>

      {/* window buttons */}
      <div style={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
        {windows.map((win) => (
          <div
            key={win.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#c0c0c0',
              border: '2px solid',
              borderColor: '#ffffff #808080 #808080 #ffffff',
              fontFamily: "'MS Sans Serif', 'Microsoft Sans Serif', monospace",
              fontSize: 11,
              maxWidth: 110,
            }}
          >
            <div
              onClick={() => onFocus(win.id)}
              style={{
                padding: '2px 4px',
                color: '#000000',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 12 }}>{win.icon}</span>
              <span>{win.title}</span>
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); onMinimize(win.id) }}
              style={{
                padding: '2px 2px',
                color: '#000000',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 'bold',
                lineHeight: '12px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e0e0' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              _
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); onMaximize(win.id) }}
              style={{
                padding: '2px 2px',
                color: '#000000',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 'bold',
                lineHeight: '12px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e0e0' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {maximized[win.id] ? '\u29C9' : '\u25A1'}
            </div>
            <div
              onClick={(e) => { e.stopPropagation(); onClose(win.id) }}
              style={{
                padding: '2px 4px',
                color: '#000000',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 'bold',
                lineHeight: '12px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#ffcccc' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              &times;
            </div>
          </div>
        ))}
      </div>

      {/* clock */}
      <div
        style={{
          color: '#000000',
          fontSize: 11,
          fontFamily: "'MS Sans Serif', 'Microsoft Sans Serif', monospace",
          padding: '0 6px',
          border: '2px solid',
          borderColor: '#808080 #ffffff #ffffff #808080',
          height: 22,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}
