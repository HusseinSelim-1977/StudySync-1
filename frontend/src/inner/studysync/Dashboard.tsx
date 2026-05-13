import { useApp } from './store'
import { PillButton } from './PillButton'

export function Dashboard() {
  const { matches, sessions, notifications, setSection } = useApp()
  const top = matches.slice(0, 3)
  const up = sessions.filter(s => s.status !== 'cancelled').slice(0, 2)
  const recent = notifications.filter(n => !n.isRead).slice(0, 2)

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
      <div style={{
        position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        {'DASHBOARD'.split('').map((c, i) => (
          <span key={i} style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.06)', fontWeight: 500 }}>{c}</span>
        ))}
      </div>

      <div style={{ marginBottom: 8 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', marginBottom: 4, letterSpacing: '-0.02em' }}>Top Matches</div>
        {top.length === 0 ? (
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>None</div>
        ) : (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {top.map(m => (
              <div key={m.matchedUserId} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer' }} onClick={() => setSection('matching')}>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{m.user.name}</div>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{m.compatibilityScore}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 12, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', marginBottom: 4, letterSpacing: '-0.02em' }}>Your Sessions</div>
        {up.length === 0 ? (
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)' }}>
            None &mdash; <span style={{ cursor: 'pointer', textDecoration: 'underline', color: 'rgba(255,255,255,0.7)' }} onClick={() => setSection('create-session')}>Create one &rarr;</span>
          </div>
        ) : up.map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{s.topic}</div>
              <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{s.date} {s.time}</div>
            </div>
            <PillButton size="sm" onClick={() => setSection('sessions')}>View</PillButton>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 4, textTransform: 'uppercase' }}>Notifications</div>
          {recent.map(n => (
            <div key={n.id} style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{n.title}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 }}>
        <PillButton size="sm" onClick={() => setSection('matching')}>Find Buddies &rarr;</PillButton>
        <PillButton size="sm" onClick={() => setSection('sessions')}>Sessions &rarr;</PillButton>
        <PillButton size="sm" onClick={() => setSection('requests')}>Requests &rarr;</PillButton>
        <PillButton size="sm" onClick={() => setSection('profile')}>Profile &rarr;</PillButton>
      </div>
    </div>
  )
}
