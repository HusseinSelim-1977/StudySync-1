import { useMemo } from 'react'

export function Scanlines() {
  const svg = useMemo(() => {
    const lines = []
    for (let i = 0; i < 200; i++) {
      lines.push(`<rect x="0" y="${i * 4}" width="100%" height="1" fill="rgba(0,0,0,${i % 2 === 0 ? 0.06 : 0.03})"/>`)
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${lines.join('')}</svg>`
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
        mixBlendMode: 'soft-light',
        opacity: 0.12,
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundSize: '100% 100%',
      }}
    />
  )
}
