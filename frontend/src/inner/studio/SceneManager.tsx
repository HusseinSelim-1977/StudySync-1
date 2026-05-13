import { useMemo } from 'react'

const shapes = [
  { size: 80, top: '10%', left: '5%', color: 'rgba(242,215,213,0.4)', delay: '0s', dur: '20s' },
  { size: 120, top: '50%', left: '70%', color: 'rgba(226,217,240,0.35)', delay: '-3s', dur: '25s' },
  { size: 60, top: '65%', left: '15%', color: 'rgba(252,246,236,0.5)', delay: '-7s', dur: '18s' },
  { size: 100, top: '15%', left: '75%', color: 'rgba(232,221,208,0.3)', delay: '-11s', dur: '22s' },
  { size: 50, top: '80%', left: '55%', color: 'rgba(218,210,230,0.4)', delay: '-5s', dur: '15s' },
  { size: 70, top: '35%', left: '40%', color: 'rgba(240,230,220,0.35)', delay: '-9s', dur: '19s' },
]

export function SceneManager() {
  const styleId = useMemo(() => {
    const id = 'studio-float-' + Math.random().toString(36).slice(2)
    const css = document.createElement('style')
    css.id = id
    css.textContent = `
      @keyframes sf-float {
        0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
        25% { transform: translateY(-12px) rotate(1.5deg) scale(1.02); }
        50% { transform: translateY(4px) rotate(-0.5deg) scale(0.98); }
        75% { transform: translateY(-6px) rotate(0.8deg) scale(1.01); }
      }
      @keyframes sf-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `
    document.head.appendChild(css)
    return id
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #f2d7d5, #e2d9f0, #fcf6ec, #f0e6dc)',
          backgroundSize: '400% 400%',
          animation: 'sf-shift 18s ease infinite',
        }}
      />
      {shapes.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: '50%',
            background: s.color,
            filter: 'blur(20px)',
            animation: `sf-float ${s.dur} ease-in-out infinite`,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  )
}
