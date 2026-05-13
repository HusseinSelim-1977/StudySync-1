import { useState } from 'react'
import { useApp } from './store'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Discover' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'requests', label: 'Requests' },
]

export function TopBar() {
  const { user, section, setSection, notifications } = useApp()
  const unread = notifications.filter(n => !n.isRead).length
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)

  const goTo = () => {
    if (section === 'landing') return
    user ? setSection('dashboard') : setSection('landing')
  }

  const sectionToNav: Record<string, string> = {
    dashboard: 'dashboard', matching: 'dashboard', 'match-detail': 'dashboard',
    sessions: 'sessions', 'create-session': 'sessions', 'session-detail': 'sessions',
    requests: 'requests',
  }
  const activeNav = sectionToNav[section] || ''

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 18px', zIndex: 20,
    }}>
      <div
        onClick={goTo}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 1 }}
      >
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)' }}>
          study
        </span>
        <span style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.3 }}>
          sync
        </span>
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {NAV_ITEMS.map(item => (
            <div
              key={item.key}
              onClick={() => setSection(item.key as any)}
              onMouseEnter={() => setHoveredNav(item.key)}
              onMouseLeave={() => setHoveredNav(null)}
              style={{
                position: 'relative', cursor: 'pointer', height: 16, overflow: 'hidden',
              }}
            >
              {/* Primary text */}
              <span style={{
                display: 'block',
                fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 600,
                color: activeNav === item.key ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                letterSpacing: 0.5, textTransform: 'uppercase',
                transform: hoveredNav === item.key ? 'translateY(-100%)' : 'translateY(0)',
                transition: 'transform 0.35s cubic-bezier(.16,1,.3,1), color 0.3s ease',
              }}>
                {item.label}
              </span>
              {/* Dual text layer - slides in from below */}
              <span style={{
                position: 'absolute', left: 0, top: '100%',
                display: 'block',
                fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 700,
                color: '#ffffff',
                letterSpacing: 0.5, textTransform: 'uppercase',
                transform: hoveredNav === item.key ? 'translateY(-100%)' : 'translateY(0)',
                transition: 'transform 0.35s cubic-bezier(.16,1,.3,1)',
              }}>
                {item.label}
              </span>
            </div>
          ))}

          <div
            onClick={() => setSection('notifications')}
            style={{ position: 'relative', cursor: 'pointer', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && (
              <div style={{ position: 'absolute', top: -1, right: -1, width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
            )}
          </div>
          <div
            onClick={() => setSection('profile')}
            style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  )
}
