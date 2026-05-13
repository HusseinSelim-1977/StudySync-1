import { useStudio, StudioView } from './store'

const links: { label: string; view: StudioView }[] = [
  { label: 'Home', view: 'home' },
  { label: 'Contact', view: 'contact' },
]

export function NavBar() {
  const { view, setView } = useStudio()
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 10,
          letterSpacing: 3,
          color: '#1a1a1a',
          fontWeight: 600,
        }}
      >
        STUDIO
      </div>
      <div style={{ display: 'flex', gap: 20 }}>
        {links.map((l) => (
          <button
            key={l.view}
            onClick={() => setView(l.view)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              fontFamily: "'Courier New', monospace",
              fontSize: 9,
              letterSpacing: 1.5,
              color: view === l.view ? '#1a1a1a' : 'rgba(26,26,26,0.4)',
              cursor: 'pointer',
              transition: 'color 0.3s ease',
              fontWeight: view === l.view ? 600 : 400,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#1a1a1a' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = view === l.view ? '#1a1a1a' : 'rgba(26,26,26,0.4)' }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
