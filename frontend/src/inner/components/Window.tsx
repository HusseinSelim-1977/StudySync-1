import { useRef, useState, useCallback } from 'react'

interface WindowProps {
  title: string
  icon: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  isMaximized: boolean
  noPadding?: boolean
  onClose: () => void
  onFocus: () => void
  onMinimize: () => void
  onMaximize: () => void
  children: React.ReactNode
}

export function Window({ title, icon, x: initX, y: initY, width, height, zIndex, isMaximized, noPadding = false, onClose, onFocus, onMinimize, onMaximize, children }: WindowProps) {
  const [pos, setPos] = useState({ x: initX, y: initY })
  const drag = useRef({ active: false, startX: 0, startY: 0, posX: 0, posY: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onFocus()
    drag.current.active = true
    drag.current.startX = e.clientX
    drag.current.startY = e.clientY
    drag.current.posX = pos.x
    drag.current.posY = pos.y
    const handleMove = (ev: MouseEvent) => {
      if (!drag.current.active) return
      setPos({
        x: drag.current.posX + ev.clientX - drag.current.startX,
        y: drag.current.posY + ev.clientY - drag.current.startY,
      })
    }
    const handleUp = () => {
      drag.current.active = false
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [pos, onFocus])

  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width,
        height,
        zIndex,
        background: '#c0c0c0',
        border: '2px solid',
        borderColor: '#ffffff #808080 #808080 #ffffff',
        borderRadius: 0,
        overflow: 'hidden',
        boxShadow: '2px 2px 8px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* title bar */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 4px',
          background: 'linear-gradient(90deg, #000080, #1084d0)',
          cursor: 'move',
          userSelect: 'none',
          height: 18,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#ffffff', fontWeight: 'bold' }}>
          <span style={{ fontSize: 12 }}>{icon}</span>
          <span>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <div
            onClick={(e) => { e.stopPropagation(); onMinimize() }}
            style={{
              cursor: 'pointer',
              color: '#000000',
              fontSize: 12,
              fontWeight: 'bold',
              width: 16,
              height: 14,
              lineHeight: '14px',
              textAlign: 'center',
              background: '#c0c0c0',
              border: '1px solid',
              borderColor: '#ffffff #808080 #808080 #ffffff',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e0e0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#c0c0c0' }}
          >
            _
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); onMaximize() }}
            style={{
              cursor: 'pointer',
              color: '#000000',
              fontSize: 12,
              fontWeight: 'bold',
              width: 16,
              height: 14,
              lineHeight: '14px',
              textAlign: 'center',
              background: '#c0c0c0',
              border: '1px solid',
              borderColor: '#ffffff #808080 #808080 #ffffff',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#e0e0e0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#c0c0c0' }}
          >
            {isMaximized ? '\u29C9' : '\u25A1'}
          </div>
          <div
            onClick={(e) => { e.stopPropagation(); onClose() }}
            style={{
              cursor: 'pointer',
              color: '#000000',
              fontSize: 12,
              fontWeight: 'bold',
              width: 16,
              height: 14,
              lineHeight: '14px',
              textAlign: 'center',
              background: '#c0c0c0',
              border: '1px solid',
              borderColor: '#ffffff #808080 #808080 #ffffff',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#ffcccc' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#c0c0c0' }}
          >
            &times;
          </div>
        </div>
      </div>

      {/* body */}
      <div style={{ flex: 1, padding: noPadding ? 0 : '6px 8px', overflow: noPadding ? 'hidden' : 'auto' }}>
        {children}
      </div>
    </div>
  )
}
