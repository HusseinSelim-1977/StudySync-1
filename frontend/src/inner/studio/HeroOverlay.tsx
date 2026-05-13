import { useState } from 'react'
import { useStudio } from './store'
import { PillButton } from './PillButton'
import { useStore } from '../../store'

export function HeroOverlay() {
  const { setView } = useStudio()
  const setActiveView = useStore((s) => s.setActiveView)
  const [reveal, setReveal] = useState(false)

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: 24,
        transform: 'translateY(-50%)',
        zIndex: 10,
        maxWidth: 280,
      }}
    >
      <div
        style={{
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 28,
          fontWeight: 700,
          color: '#1a1a1a',
          lineHeight: 1.15,
          letterSpacing: '-0.5px',
          marginBottom: 10,
        }}
      >
        Creative
        <br />
        Studio
      </div>
      <div
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: 9,
          color: 'rgba(26,26,26,0.55)',
          lineHeight: 1.6,
          letterSpacing: 0.5,
          marginBottom: 16,
          maxWidth: 200,
        }}
      >
        Digital experiences crafted at the intersection of design, technology, and imagination.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <PillButton onClick={() => setView('contact')}>
          GET IN TOUCH
        </PillButton>
        <PillButton
          variant="outline"
          onClick={() => {
            setReveal(true)
            setActiveView('overview')
          }}
        >
          EXPLORE
        </PillButton>
      </div>
    </div>
  )
}
