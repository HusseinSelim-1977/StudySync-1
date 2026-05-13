import { useState } from 'react'
import { useApp } from './store'
import { PillButton } from './PillButton'

export function Matching() {
  const { matches, requests, setSection, sendBuddyRequest, dismissMatch, removeContact, searchUsers, setSelectedMatchId, user } = useApp()
  const [sort, setSort] = useState<'compatibility' | 'availability'>('compatibility')
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({})
  const [searchQ, setSearchQ] = useState('')
  const [searchRes, setSearchRes] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [sentReqs, setSentReqs] = useState<Record<string, boolean>>({})
  const [tab, setTab] = useState<'matches' | 'contacts'>('matches')

  const sorted = [...matches].sort((a, b) => sort === 'availability' ? b.overlappingSlots.length - a.overlappingSlots.length : b.compatibilityScore - a.compatibilityScore)
  const acceptedIds = requests.filter(r => r.status === 'accepted' && (r.fromUserId === user?.id || r.toUserId === user?.id)).map(r => r.fromUserId === user?.id ? r.toUserId : r.fromUserId)
  const contacts = requests.filter(r => r.status === 'accepted' && (r.fromUserId === user?.id || r.toUserId === user?.id))
    .map(r => ({ userId: r.fromUserId === user?.id ? r.toUserId : r.fromUserId, user: r.fromUserId === user?.id ? r.toUser : r.fromUser }))

  const sentIds = Object.keys(sentReqs)

  const doSearch = async () => {
    if (searchQ.trim().length < 2) return
    setSearching(true)
    const res = await searchUsers(searchQ.trim())
    setSearchRes(res)
    setSearching(false)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
      <div style={{
        position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        {'MATCHES'.split('').map((c, i) => (
          <span key={i} style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.06)', fontWeight: 500 }}>{c}</span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>Study Matches</div>
        <PillButton size="sm" variant="ghost" onClick={() => setShowSearch(!showSearch)} style={{ color: 'rgba(255,255,255,0.5)' }}>
          {showSearch ? 'Close' : 'Search'}
        </PillButton>
      </div>
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: showSearch ? 4 : 8, textTransform: 'uppercase' }}>Based on your profile</div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {(['matches', 'contacts'] as const).map(t => (
          <div key={t} onClick={() => setTab(t)}
            style={{ padding: '2px 10px', borderRadius: 999, border: `1px solid ${tab === t ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: tab === t ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
            {t} {t === 'contacts' ? `(${contacts.length})` : `(${sorted.length})`}
          </div>
        ))}
      </div>

      {showSearch && (
        <div style={{ marginBottom: 10, padding: '8px 10px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') doSearch() }}
              placeholder="Search by name or email..."
              style={{
                flex: 1, padding: '5px 8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4,
                background: 'rgba(255,255,255,0.04)', fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 15, color: 'rgba(255,255,255,0.85)', outline: 'none',
              }} />
            <PillButton size="sm" onClick={doSearch} disabled={searching || searchQ.trim().length < 2}>
              {searching ? '...' : 'Find'}
            </PillButton>
          </div>
          {searchRes.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {searchRes.map(u => {
                const alreadySent = sentIds.includes(u.id)
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                      {u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{u.name}</div>
                      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{u.university}</div>
                    </div>
                    <PillButton size="sm" variant={alreadySent ? 'ghost' : 'outline'} disabled={alreadySent}
                      onClick={() => { sendBuddyRequest(u.id); setSentReqs(p => ({ ...p, [u.id]: true })) }}>
                      {alreadySent ? 'Sent' : 'Confirm'}
                    </PillButton>
                  </div>
                )
              })}
            </div>
          )}
          {searchQ.trim().length >= 2 && !searching && searchRes.length === 0 && (
            <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 8 }}>
              No users found
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {(['compatibility', 'availability'] as const).map(s => (
          <div key={s} onClick={() => setSort(s)}
            style={{ padding: '2px 8px', borderRadius: 999, border: `1px solid ${sort === s ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: sort === s ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, cursor: 'pointer' }}>
            {s === 'compatibility' ? 'Compatibility' : 'Availability'}
          </div>
        ))}
      </div>

      {tab === 'contacts' ? (
        contacts.length === 0 ? (
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.2)', padding: 16, textAlign: 'center' }}>No contacts yet</div>
        ) : contacts.map(c => (
          <div key={c.userId} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {c.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{c.user.name}</div>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)' }}>{c.user.university}</div>
              </div>
              <PillButton size="sm" variant="ghost" onClick={() => removeContact(c.userId)} style={{ color: 'rgba(255,80,80,0.5)' }}>Remove</PillButton>
            </div>
          </div>
        ))
      ) : sorted.length === 0 ? (
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.2)', padding: 16, textAlign: 'center' }}>Complete setup to find matches</div>
      ) : sorted.map(m => {
        const isConfirmed = confirmed[m.matchedUserId] || acceptedIds.includes(m.matchedUserId)
        const scoreColor = m.compatibilityScore >= 70 ? 'rgba(239,222,217,0.6)' : m.compatibilityScore >= 40 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'
        return (
          <div key={m.matchedUserId} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 15, fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {m.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setSelectedMatchId(m.matchedUserId); setSection('match-detail') }}>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{m.user.name}</div>
                <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)' }}>{m.user.university}</div>
              </div>
              <div style={{ position: 'relative', width: 26, height: 26 }}>
                <svg width="26" height="26" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={scoreColor} strokeWidth="2.5" strokeDasharray={`${m.compatibilityScore}, 100`} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{m.compatibilityScore}%</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 3 }}>
              {m.sharedCourses.length > 0 && <Tag>{`C:${m.sharedCourses.length}`}</Tag>}
              {m.sharedTopics.length > 0 && <Tag>{`T:${m.sharedTopics.length}`}</Tag>}
              {m.overlappingSlots.length > 0 && <Tag>{`S:${m.overlappingSlots.length}`}</Tag>}
            </div>

            <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)', marginBottom: 4, lineHeight: 1.3 }}>{m.explanation}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <PillButton size="sm" onClick={() => { setSelectedMatchId(m.matchedUserId); setSection('match-detail') }}>View Profile</PillButton>
              <PillButton size="sm" variant={isConfirmed ? 'ghost' : 'outline'} disabled={isConfirmed} onClick={() => { sendBuddyRequest(m.matchedUserId); setConfirmed(p => ({ ...p, [m.matchedUserId]: true })) }}>
                {isConfirmed ? 'Confirmed!' : 'Confirm'}
              </PillButton>
              <PillButton size="sm" variant="ghost" onClick={() => { dismissMatch(m.matchedUserId); setConfirmed(p => ({ ...p, [m.matchedUserId]: false })) }} style={{ color: 'rgba(255,80,80,0.5)' }}>Remove</PillButton>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '2px 6px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)' }}>{children}</div>
}
