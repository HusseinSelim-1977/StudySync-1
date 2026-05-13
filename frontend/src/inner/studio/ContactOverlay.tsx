import { PillButton } from './PillButton'
import { useStudio } from './store'

export function ContactOverlay() {
  const { setView } = useStudio()
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        background: 'rgba(252,246,236,0.85)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 22,
          fontWeight: 700,
          color: '#1a1a1a',
          marginBottom: 6,
        }}
      >
        Let's Create
      </div>
      <div
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9,
          color: 'rgba(26,26,26,0.5)',
          marginBottom: 20,
          letterSpacing: 1,
        }}
      >
        hello@studio.dev
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <PillButton onClick={() => setView('home')}>
          BACK
        </PillButton>
      </div>
    </div>
  )
}
