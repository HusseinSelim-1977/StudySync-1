import { useState, useMemo } from 'react'
import { StudioCtx, StudioView } from './store'
import { SceneManager } from './SceneManager'
import { NavBar } from './NavBar'
import { HeroOverlay } from './HeroOverlay'
import { ContactOverlay } from './ContactOverlay'
import { FooterHUD } from './FooterHUD'

export function StudioPortfolio() {
  const [view, setView] = useState<StudioView>('home')
  const ctx = useMemo(() => ({ view, setView }), [view])

  return (
    <StudioCtx.Provider value={ctx}>
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: "'Courier New', 'Georgia', sans-serif",
        }}
      >
        <SceneManager />
        <NavBar />
        {view === 'home' ? <HeroOverlay /> : <ContactOverlay />}
        <FooterHUD />
      </div>
    </StudioCtx.Provider>
  )
}
