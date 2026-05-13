import { useState, useEffect } from 'react'
import { Desktop } from './components/Desktop'

const bootLines = [
  'DevLabBIOS v1.04.2024',
  'CPU: AMD RYZEN 9 · 16 CORES',
  'MEM: 32768MB DETECTED · CHECK OK',
  'GPU: NVIDIA RTX 4090 · DRIVER LOADED',
  'SATA: LINKING... study-sync :3000',
  'SATA: LINKING... like-a-local :8080',
  'SATA: LINKING... dev-lab :5173',
  'BOOT SEQUENCE COMPLETE',
  'LOADING DevLabOS...',
  '',
  '  To Dr.Menna',
  '  Thank you for everything =)',
]

export function InnerOS({ bootComplete }: { bootComplete: boolean }) {
  const [bootPhase, setBootPhase] = useState(0)

  useEffect(() => {
    if (bootComplete) return
    if (bootPhase >= bootLines.length - 1) return
    const t = setTimeout(() => setBootPhase((p) => p + 1), 300 + Math.random() * 200)
    return () => clearTimeout(t)
  }, [bootPhase, bootComplete])

  if (!bootComplete) {
    return (
      <div
        style={{
          width: 512,
          height: 384,
          background: '#000000',
          color: '#00ff44',
          fontFamily: "'Courier New', monospace",
          fontSize: 10,
          lineHeight: 1.6,
          padding: '16px 20px',
          overflow: 'hidden',
        }}
      >
        {bootLines.slice(0, bootPhase + 1).map((line, i) => (
          <div
            key={i}
            style={{
              opacity: i < bootLines.length - 1 ? 0.9 : 0.5,
              whiteSpace: 'pre',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    )
  }

  return <Desktop />
}
