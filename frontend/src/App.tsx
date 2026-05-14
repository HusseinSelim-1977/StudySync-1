import { useEffect, useRef, useState } from 'react'
import { Scene } from './components/Scene'
import { useStore } from './store'

function LoadingScreen({ onStart, bootStarted }: { onStart: () => void, bootStarted: boolean }) {
  const [showHeader, setShowHeader] = useState(false)
  const [doneRam, setDoneRam] = useState(false)
  const [loadedResources, setLoadedResources] = useState<string[]>([])
  const [bootMsg, setBootMsg] = useState(false)
  const [showStart, setShowStart] = useState(false)

  const resourceNames = [
    'keyboardKeydown2', 'keyboardKeydown4', 'keyboardKeydown6',
    'ccType', 'keyboardKeydown3', 'keyboardKeydown5',
    'startup', 'office',
  ]

  useEffect(() => {
    const t = setTimeout(() => setShowHeader(true), 600)
    const t2 = setTimeout(() => setDoneRam(true), 1800)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (!doneRam) return
    if (loadedResources.length < resourceNames.length) {
      const t = setTimeout(() => {
        setLoadedResources(prev => [...prev, resourceNames[prev.length]])
      }, 400 + Math.random() * 500)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setBootMsg(true), 600)
      return () => clearTimeout(t)
    }
  }, [doneRam, loadedResources])

  useEffect(() => {
    if (bootMsg) {
      const t = setTimeout(() => setShowStart(true), 800)
      return () => clearTimeout(t)
    }
  }, [bootMsg])

  const handleStart = () => onStart()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleStart()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const padResource = (name: string) => {
    const len = 24 - name.length
    return '\u00a0'.repeat(Math.max(0, len))
  }

  const today = new Date()
  const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#000', color: '#00ff00',
      fontFamily: 'monospace',
      fontSize: 14, lineHeight: 1.7,
      opacity: bootStarted ? 0 : 1,
      transition: 'opacity 0.5s ease',
      pointerEvents: bootStarted ? 'none' : 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {showHeader && (
        <>
          {/* HEADER */}
          <div style={{ padding: '48px 48px 24px' }}>
            <div style={{ marginBottom: 2 }}><b>Hussein,</b></div>
            <div style={{ marginBottom: 12 }}><b>Selim Inc.</b></div>
            <div style={{ marginBottom: 2 }}>Released: 05/11/2026</div>
            <div style={{ marginBottom: 2 }}>HSBIOS (C)2026 Selim Hussein Inc.,</div>
            <div style={{ marginBottom: 2 }}>HSP S13 2026-2026 Special UC131S</div>
            <div style={{ marginBottom: 12 }}>HSP Showcase(tm) XX 113</div>
          </div>

          {/* BODY */}
          <div style={{ padding: '0 48px' }}>
            {!doneRam ? (
              <div>Checking RAM : 14000 OK</div>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>Checking RAM : 14000 OK</div>
                <div style={{ marginBottom: 4, color: '#aaa' }}>FINISHED LOADING RESOURCES</div>

                {loadedResources.map((name, i) => (
                  <div key={i} style={{ marginBottom: 1 }}>
                    Loaded {name}{padResource(name)}... {Math.round(((i + 1) / resourceNames.length) * 100)}%
                  </div>
                ))}

                {bootMsg && (
                  <>
                    <div style={{ marginTop: 12, marginBottom: 4 }}>
                      All Content Loaded, launching <b>'Hussein Selim StudySync'</b> V1.0
                    </div>
                    <div style={{ marginTop: 28, color: '#666' }}>
                      Press <b>DEL</b> to enter SETUP , <b>ESC</b> to skip memory test
                    </div>
                    <div style={{ color: '#666' }}>{dateStr}</div>
                  </>
                )}
              </>
            )}
          </div>

          {/* FOOTER */}
          {showStart && (
            <div style={{ padding: '48px 48px 64px', textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 18, marginBottom: 8 }}>
                Hussein Selim Portfolio Showcase 2026
              </div>
              <div style={{ color: '#888', marginBottom: 20, fontSize: 13 }}>
                Click start to begin
              </div>
              <button
                onClick={handleStart}
                className="bios-start-button"
                style={{
                  background: '#000', color: '#00ff00',
                  border: '4px solid #fff',
                  borderWidth: '4px 3px',
                  fontFamily: 'monospace', fontSize: 14,
                  cursor: 'pointer', padding: 0,
                }}
              >
                <p style={{ padding: '8px 16px', margin: 0 }}>START</p>
              </button>
            </div>
          )}

          {/* Blinking cursor */}
          {!bootMsg && (
            <div style={{ padding: '0 48px' }}>
              <span className="blinking-cursor" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function App() {
  const [bootStarted, setBootStarted] = useState(false)
  const setBootComplete = useStore((s) => s.setBootComplete)
  const activeView = useStore((s) => s.activeView)
  const audioRef = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    if (!bootStarted) return
    let ctx: AudioContext | null = null
    let audioEl: HTMLAudioElement | null = null
    let cancelled = false
    
    const play = async () => {
      // Create audio element — browser handles range requests automatically
      audioEl = new Audio('/assets/studysync/retro-jazz.mp3')
      audioEl.loop = true
      audioEl.preload = 'metadata' // only fetch duration on load, not the whole file
    
      // Wire through AudioContext for gain control
      ctx = new AudioContext()
      const source = ctx.createMediaElementSource(audioEl)
      const gain = ctx.createGain()
      gain.gain.value = 0.4
      source.connect(gain)
      gain.connect(ctx.destination)
    
      if (cancelled) { ctx.close(); return }
    
      // Starts playing immediately — no waiting for full download
      await audioEl.play()
    }
    
    play()
    
    audioRef.current = {
      stop: () => {
        cancelled = true
        audioEl?.pause()
        audioEl?.remove()
        ctx?.close()
      },
    }
    
    return () => {
      cancelled = true
      audioEl?.pause()
      audioEl?.remove()
      ctx?.close()
    }
  }, [bootStarted])

  // After user clicks START, set loading=false (hide loading, show scene)
  // Then after a moment set bootComplete=true (InnerOS boot)
  const handleStart = () => {
    setBootStarted(true)
    setTimeout(() => setBootComplete(true), 1500)
  }

  return (
    <>
      {/* BIOS loading screen */}
      <LoadingScreen onStart={handleStart} bootStarted={bootStarted} />

      {/* 3D scene */}
      <Scene />

      {/* UI overlay - only visible after boot */}
      {bootStarted && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {/* top bar */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%)',
            }}
          >
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 11,
                color: '#00ff44',
                letterSpacing: 2,
              }}
            >
              StudySync
            </div>
            <div style={{ display: 'flex', gap: 12, fontFamily: "'Courier New', monospace", fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
              <span><span style={{ color: '#555' }}>1</span> OVERVIEW</span>
              <span><span style={{ color: '#555' }}>2</span> MONITOR</span>
              <span><span style={{ color: '#555' }}>3</span> DESK</span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>ESC BACK</span>
            </div>
          </div>

          {/* view label */}
          <div
            style={{
              position: 'fixed',
              bottom: 60,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: "'Courier New', monospace",
              fontSize: 10,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: 1,
            }}
          >
            {activeView.toUpperCase()}
          </div>


        </div>
      )}
    </>
  )
}
