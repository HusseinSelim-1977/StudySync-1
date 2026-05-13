import { useMemo, useState, useEffect, useRef } from 'react'
import { useApp } from './store'

const PRE_BG = '/assets/studysync/pre-bg.jpeg'
const POST_BG = '/assets/studysync/post-bg.jpeg'

const BG_SIZE = 140
const PAN_RANGE = 60

export function SceneBackground() {
  const { user } = useApp()
  const isAuthed = !!user
  const [loaded, setLoaded] = useState({ pre: false, post: false })

  const preRef = useRef<HTMLDivElement>(null)
  const postRef = useRef<HTMLDivElement>(null)
  const ovRef = useRef<HTMLDivElement>(null)
  const glow1Ref = useRef<HTMLDivElement>(null)
  const glow2Ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mouse = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }

    window.addEventListener('mousemove', (e) => {
      const el = ovRef.current?.parentElement
      if (!el) return
      const rect = el.getBoundingClientRect()
      mouse.x = (e.clientX - rect.left) / rect.width - 0.5
      mouse.y = (e.clientY - rect.top) / rect.height - 0.5
    })

    let id: number
    const loop = () => {
      current.x += (mouse.x - current.x) * 0.08
      current.y += (mouse.y - current.y) * 0.08
      const mx = current.x
      const my = current.y

      const bgPos = `${50 + mx * PAN_RANGE}% ${50 + my * PAN_RANGE}%`
      const tilt = `rotateY(${mx * 4}deg) rotateX(${-my * 4}deg)`

      if (preRef.current) {
        preRef.current.style.backgroundPosition = bgPos
        preRef.current.style.transform = tilt
      }
      if (postRef.current) {
        postRef.current.style.backgroundPosition = bgPos
        postRef.current.style.transform = tilt
      }
      if (ovRef.current) {
        const px = mx * 8
        const py = my * 8
        ovRef.current.style.transform = `translate(${px}px, ${py}px)`
      }
      if (glow1Ref.current) {
        glow1Ref.current.style.transform = `translate(${mx * 20}px, ${my * 14}px)`
      }
      if (glow2Ref.current) {
        glow2Ref.current.style.transform = `translate(${mx * -12}px, ${my * -10}px)`
      }
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const pre = new Image(); pre.onload = () => setLoaded(p => ({ ...p, pre: true })); pre.src = PRE_BG
    const post = new Image(); post.onload = () => setLoaded(p => ({ ...p, post: true })); post.src = POST_BG
  }, [])

  useMemo(() => {
    const css = document.createElement('style')
    css.id = 'ss-ukeyframes'
    css.textContent = `@keyframes ss-pulse { 0%,100% { opacity: 0.1; } 50% { opacity: 0.3; } }`
    document.head.appendChild(css)
  }, [])

  const baseBg: React.CSSProperties = {
    position: 'absolute', left: '-30%', top: '-30%', width: '160%', height: '160%',
    backgroundSize: `${BG_SIZE}%`,
    backgroundRepeat: 'no-repeat',
    willChange: 'background-position, transform',
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: '#000000' }} />

      <div style={{ position: 'absolute', inset: 0, perspective: '600px' }}>
        {loaded.pre && (
          <div
            ref={preRef}
            style={{
              ...baseBg,
              backgroundImage: `url(${PRE_BG})`,
              backgroundPosition: '50% 50%',
              opacity: isAuthed ? 0 : 1,
              transition: 'opacity 600ms cubic-bezier(.16,1,.3,1)',
            }}
          />
        )}

        {loaded.post && (
          <div
            ref={postRef}
            style={{
              ...baseBg,
              backgroundImage: `url(${POST_BG})`,
              backgroundPosition: '50% 50%',
              opacity: isAuthed ? 1 : 0,
              transition: 'opacity 600ms cubic-bezier(.16,1,.3,1)',
            }}
          />
        )}
      </div>

      <div ref={ovRef} style={{
        position: 'absolute', inset: 0, willChange: 'transform',
        background: isAuthed
          ? 'linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.15) 100%)'
          : 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.2) 100%)',
        transition: 'background 600ms cubic-bezier(.16,1,.3,1)',
      }} />

      <div ref={glow1Ref} style={{
        position: 'absolute', top: '15%', right: '25%', width: 160, height: 160,
        borderRadius: '50%', background: 'rgba(239,222,217,0.05)', filter: 'blur(60px)',
        animation: 'ss-pulse 6s ease-in-out infinite', willChange: 'transform',
      }} />
      <div ref={glow2Ref} style={{
        position: 'absolute', bottom: '10%', left: '20%', width: 120, height: 120,
        borderRadius: '50%', background: 'rgba(180,200,240,0.03)', filter: 'blur(50px)',
        animation: 'ss-pulse 8s ease-in-out infinite 2s', willChange: 'transform',
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)',
      }} />
    </div>
  )
}
