import { useApp } from './store'
import { PillButton } from './PillButton'

export function LandingPage() {
  const { setSection } = useApp()

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 700,
          color: 'rgba(255,255,255,0.72)', letterSpacing: 3, marginBottom: 10,
          textTransform: 'uppercase',
          animation: 'ss-page-in 500ms cubic-bezier(.16,1,.3,1) 0.6s both',
        }}>
          Real-Time Study Matching
        </div>
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 28, fontStyle: 'italic', fontWeight: 700,
          color: 'rgba(255,255,255,0.92)', lineHeight: 1, marginBottom: 2,
          letterSpacing: '-0.02em',
          animation: 'ss-page-in 500ms cubic-bezier(.16,1,.3,1) 0.8s both',
        }}>
          Find your
        </div>
        <div style={{
          fontFamily: 'Georgia, serif', fontSize: 28, fontStyle: 'italic', fontWeight: 700,
          color: '#ffffff', lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 18,
          animation: 'ss-page-in 500ms cubic-bezier(.16,1,.3,1) 1s both',
        }}>
          Study Buddy
        </div>
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'center',
          animation: 'ss-page-in 500ms cubic-bezier(.16,1,.3,1) 1.2s both',
        }}>
          <PillButton onClick={() => setSection('register')}>
            Get Started &rarr;
          </PillButton>
          <PillButton variant="ghost" onClick={() => setSection('login')}>
            Sign In &rarr;
          </PillButton>
        </div>
      </div>
    </div>
  )
}
