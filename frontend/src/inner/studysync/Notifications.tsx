import { useApp } from './store'
import { PillButton } from './PillButton'

export function NotificationsPage() {
  const { notifications, markNotificationRead, markAllRead, notificationFilter, setNotificationFilter } = useApp()
  const filtered = notificationFilter === 'all' ? notifications : notifications.filter(n => n.type.toLowerCase() === notificationFilter)

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>Notifications</div>
        <PillButton size="sm" onClick={markAllRead}>Mark Read</PillButton>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {['all', 'match', 'session', 'message', 'system'].map(f => (
          <div key={f} onClick={() => setNotificationFilter(f)}
            style={{ padding: '2px 8px', borderRadius: 999, border: `1px solid ${notificationFilter === f ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: notificationFilter === f ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, cursor: 'pointer', textTransform: 'capitalize' }}>{f}</div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 16 }}>None</div>
      ) : filtered.map(n => (
        <div key={n.id} onClick={() => markNotificationRead(n.id)}
          style={{
            padding: '6px 0', cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: n.isRead ? 0.5 : 1,
          }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: n.isRead ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)' }}>{n.title}</div>
            <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{n.body}</div>
            <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
              {new Date(n.createdAt).toLocaleDateString()}
            </div>
          </div>
          {!n.isRead && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(239,222,217,0.5)' }} />}
        </div>
      ))}
    </div>
  )
}
