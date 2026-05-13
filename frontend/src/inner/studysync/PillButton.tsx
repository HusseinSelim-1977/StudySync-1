interface PillButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md'
  disabled?: boolean
  style?: React.CSSProperties
}

export function PillButton({ children, onClick, variant = 'outline', size = 'md', disabled, style }: PillButtonProps) {
  const s: React.CSSProperties = {
    padding: size === 'sm' ? '4px 14px' : '6px 20px',
    borderRadius: 999,
    border: variant === 'ghost' ? 'none' : '1px solid rgba(255,255,255,0.25)',
    background: variant === 'primary' ? '#ffffff' : 'transparent',
    color: variant === 'primary' ? '#000000' : variant === 'ghost' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)',
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: size === 'sm' ? 9 : 10,
    fontWeight: 600,
    letterSpacing: 0.3,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.25 : 1,
    transition: 'all 0.25s cubic-bezier(.16,1,.3,1)',
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
    ...style,
  }

  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={s}
      onMouseEnter={(e) => {
        if (disabled) return
        if (variant === 'ghost') return
        if (variant === 'primary') {
          e.currentTarget.style.background = 'rgba(255,255,255,0.85)'
        } else {
          e.currentTarget.style.background = '#ffffff'
          e.currentTarget.style.color = '#000000'
          e.currentTarget.style.borderColor = '#ffffff'
        }
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        if (variant === 'ghost') return
        if (variant === 'primary') {
          e.currentTarget.style.background = '#ffffff'
        } else {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
        }
      }}
    >
      {children}
    </button>
  )
}
