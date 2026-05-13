import { useApp } from './store'
import { PillButton } from './PillButton'

export function RequestsPage() {
  const { requests, user, acceptBuddyRequest, declineBuddyRequest, removeContact, requestsTab, setRequestsTab } = useApp()

  const incoming = requests.filter(r => r.toUserId === user?.id && r.status === 'pending')
  const outgoing = requests.filter(r => r.fromUserId === user?.id)
  const accepted = requests.filter(r => (r.fromUserId === user?.id || r.toUserId === user?.id) && r.status === 'accepted')

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', marginBottom: 6, letterSpacing: '-0.02em' }}>Connections</div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {(['incoming', 'outgoing'] as const).map(t => (
          <div key={t} onClick={() => setRequestsTab(t)}
            style={{ padding: '2px 10px', borderRadius: 999, border: `1px solid ${requestsTab === t ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: requestsTab === t ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {requestsTab === 'incoming' && (
        incoming.length === 0 ? <Empty>No incoming requests</Empty>
        : incoming.map(r => (
          <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Avatar name={r.fromUser.name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{r.fromUser.name}</div>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)' }}>{r.compatibilityScore}% match</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <PillButton size="sm" onClick={() => acceptBuddyRequest(r.id)}>Accept &rarr;</PillButton>
              <PillButton size="sm" variant="ghost" onClick={() => declineBuddyRequest(r.id)}>Decline</PillButton>
            </div>
          </div>
        ))
      )}

      {requestsTab === 'outgoing' && (
        outgoing.length === 0 ? <Empty>No outgoing requests</Empty>
        : outgoing.map(r => (
          <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Avatar name={r.toUser.name} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{r.toUser.name}</div>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)', textTransform: 'capitalize' }}>{r.status}</div>
              </div>
              {r.status === 'pending' && <PillButton size="sm" variant="ghost" onClick={() => declineBuddyRequest(r.id)}>Cancel</PillButton>}
            </div>
          </div>
        ))
      )}

      {accepted.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.72)', marginBottom: 4, letterSpacing: '-0.02em' }}>Connected</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {accepted.map(r => {
              const buddy = r.fromUserId === user?.id ? r.toUser : r.fromUser
              const buddyId = r.fromUserId === user?.id ? r.toUserId : r.fromUserId
              return (
                <div key={r.id} style={{ padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.45)' }}>{buddy.name}</span>
                  <span onClick={() => removeContact(buddyId)} style={{ cursor: 'pointer', opacity: 0.4, fontSize: 15, color: 'rgba(255,80,80,0.6)', lineHeight: '12px' }}>&times;</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.2)', padding: 16, textAlign: 'center' }}>{children}</div>
}
