import { useState } from 'react'

interface PillButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'outline'
  size?: 'sm' | 'md'
}

export function PillButton({ children, onClick, variant = 'primary', size = 'md' }: PillButtonProps) {
  const [hover, setHover] = useState(false)
  const pad = size === 'sm' ? '5px 16px' : '8px 24px'
  const fs = size === 'sm' ? 9 : 10
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: pad,
        borderRadius: 20,
        border: variant === 'outline' ? '1px solid rgba(0,0,0,0.15)' : 'none',
        background: variant === 'primary' ? '#1a1a1a' : 'transparent',
        color: variant === 'primary' ? '#ffffff' : '#1a1a1a',
        fontFamily: "'Courier New', monospace",
        fontSize: fs,
        letterSpacing: 1.5,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        opacity: hover ? 0.75 : 1,
      }}
    >
      {children}
    </button>
  )
}
