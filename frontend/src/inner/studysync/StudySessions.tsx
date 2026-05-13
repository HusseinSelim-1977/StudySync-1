import { useState } from 'react'
import { useApp } from './store'
import { PillButton } from './PillButton'

export function StudySessions() {
  const { sessions, setSection, createSession, cancelSession, joinSession, leaveSession, updateSession, user, selectedSessionId, setSelectedSessionId, searchUsers } = useApp()
  const { section } = useApp()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [topic, setTopic] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('1hr')
  const [sessType, setSessType] = useState<'online' | 'in-person'>('online')
  const [location, setLocation] = useState('')
  const [knowledgeLevel, setKnowledgeLevel] = useState(50)
  const [selectedBuddies, setSelectedBuddies] = useState<string[]>([])
  const [editing, setEditing] = useState(false)
  const [editTopic, setEditTopic] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editDuration, setEditDuration] = useState('1hr')
  const [editLocation, setEditLocation] = useState('')
  const [editParticipants, setEditParticipants] = useState<any[]>([])
  const [showAddSearch, setShowAddSearch] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const [addResults, setAddResults] = useState<any[]>([])

  const buddyNames: Record<string, string> = { u2: 'Emma Chen', u3: 'Omar Hassan', u4: 'Lena Weber' }

  if (section === 'session-detail') {
    const session = sessions.find(s => s.id === selectedSessionId)
    if (!session) return <div style={{ padding: 34, fontFamily: 'system-ui, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)' }}>Session not found</div>

    const isCreator = session.creatorId === user?.id
    const isJoined = session.participants.some(p => p.userId === user?.id && p.status === 'joined')

    const doAddSearch = async () => {
      if (addQuery.trim().length < 2) return
      const res = await searchUsers(addQuery.trim())
      setAddResults(res.filter(r => !editParticipants.some(p => p.userId === r.id)))
    }

    return (
      <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', marginBottom: 10, letterSpacing: '-0.02em' }}>
          {editing ? 'Edit Session' : session.topic}
        </div>

        {editing ? (
          <>
            <SecTitle>Topic</SecTitle>
            <input value={editTopic} onChange={e => setEditTopic(e.target.value)} style={inp} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <div style={{ flex: 1 }}><SecTitle>Date</SecTitle><input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inp} /></div>
              <div style={{ flex: 1 }}><SecTitle>Time</SecTitle><input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} style={inp} /></div>
            </div>
            <SecTitle>Duration</SecTitle>
            <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
              {['30min', '1hr', '1.5hr', '2hr', '3hr'].map(d => (
                <div key={d} onClick={() => setEditDuration(d)}
                  style={{ padding: '2px 7px', borderRadius: 999, border: `1px solid ${editDuration === d ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: editDuration === d ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)', fontFamily: 'system-ui, sans-serif', fontSize: 12, cursor: 'pointer' }}>{d}</div>
              ))}
            </div>
            <SecTitle>Location / Link</SecTitle>
            <input value={editLocation} onChange={e => setEditLocation(e.target.value)} style={inp} />

            <SecTitle>Participants ({editParticipants.length})</SecTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
              {editParticipants.map(p => (
                <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'system-ui, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.6)', position: 'relative' }}>
                  {p.user.name || p.userId.slice(0, 8)}
                  {p.userId !== user?.id && (
                    <span onClick={() => setEditParticipants(editParticipants.filter(x => x.userId !== p.userId))}
                      style={{ cursor: 'pointer', marginLeft: 4, fontSize: 16, fontWeight: 700, color: 'rgba(255,60,60,0.9)', lineHeight: '16px', transition: 'color 0.15s' }}
                      onMouseEnter={e => { (e.target as HTMLElement).style.color = 'rgba(255,40,40,1)' }}
                      onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,60,60,0.9)' }}>&times;</span>
                  )}
                </div>
              ))}
            </div>

            <PillButton size="sm" variant="ghost" onClick={() => setShowAddSearch(!showAddSearch)} style={{ marginBottom: 6 }}>
              {showAddSearch ? 'Close' : '+ Add User'}
            </PillButton>
            {showAddSearch && (
              <div style={{ marginBottom: 8, padding: '6px 8px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input value={addQuery} onChange={e => setAddQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    onKeyDown={e => { if (e.key === 'Enter') doAddSearch() }}
                    style={{ flex: 1, padding: '4px 6px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, background: 'rgba(255,255,255,0.04)', fontFamily: 'system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.85)', outline: 'none' }} />
                  <PillButton size="sm" onClick={doAddSearch}>Find</PillButton>
                </div>
                {addResults.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{r.name}</span>
                    <PillButton size="sm" onClick={() => { setEditParticipants([...editParticipants, { userId: r.id, user: { id: r.id, name: r.name, email: '', university: '', academicYear: '', contactEmail: '', contactPhone: '' }, status: 'invited' as const }]); setAddResults(addResults.filter(x => x.id !== r.id)) }}>
                      + Add
                    </PillButton>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <PillButton size="sm" onClick={() => {
                const origIds = session.participants.map(p => p.userId)
                const newIds = editParticipants.map(p => p.userId)
                const removed = origIds.filter(id => !newIds.includes(id) && id !== user?.id)
                const added = newIds.filter(id => !origIds.includes(id))
                const dateTime = editDate && editTime ? `${editDate}T${editTime}:00` : undefined
                updateSession(session.id, {
                  title: editTopic !== session.topic ? editTopic : undefined,
                  dateTime,
                  duration: editDuration !== session.duration ? parseInt(editDuration) || 60 : undefined,
                  location: editLocation !== session.location ? editLocation : undefined,
                  removeUserIds: removed.length > 0 ? removed : undefined,
                  addUserIds: added.length > 0 ? added : undefined,
                })
                setEditing(false)
              }}>Save</PillButton>
              <PillButton size="sm" variant="ghost" onClick={() => { setEditing(false); setEditTopic(session.topic); setEditDate(session.date); setEditTime(session.time); setEditDuration(session.duration); setEditLocation(session.location || ''); setEditParticipants(session.participants) }}>Cancel</PillButton>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <SecTitle>Date & Time</SecTitle>
              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>{session.date} at {session.time}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <SecTitle>Duration</SecTitle>
              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>{session.duration}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <SecTitle>Type</SecTitle>
              <div style={{ display: 'flex', gap: 3 }}>
                <Tag>{session.sessionType}</Tag>
                {session.location && <Tag>{session.location}</Tag>}
                {session.knowledgeLevel != null && <Tag>KL:{session.knowledgeLevel}%</Tag>}
              </div>
            </div>

            <SecTitle>Participants ({session.participants.length})</SecTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
              {session.participants.map(p => (
                <div key={p.userId} style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'system-ui, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>
                  {p.user.name || p.userId.slice(0, 8)} <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15 }}>({p.status})</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {isJoined ? (
                <PillButton size="sm" variant="ghost" onClick={() => { leaveSession(session.id); setSection('sessions') }} style={{ color: 'rgba(255,180,100,0.7)' }}>Leave</PillButton>
              ) : (
                <PillButton size="sm" onClick={() => { joinSession(session.id); setSection('sessions') }}>Join</PillButton>
              )}
              {isCreator && (
                <>
                  <PillButton size="sm" variant="ghost" onClick={() => { setEditTopic(session.topic); setEditDate(session.date); setEditTime(session.time); setEditDuration(session.duration); setEditLocation(session.location || ''); setEditParticipants(session.participants); setEditing(true) }}>Edit</PillButton>
                  <PillButton size="sm" variant="ghost" onClick={() => { cancelSession(session.id); setSection('sessions') }} style={{ color: 'rgba(255,80,80,0.6)' }}>Cancel Session</PillButton>
                </>
              )}
            </div>
          </>
        )}
      </div>
    )
  }

  if (section === 'create-session') {
    return (
      <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
        <div style={{ maxWidth: 280 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', marginBottom: 2, letterSpacing: '-0.02em' }}>New Session</div>
          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 8, textTransform: 'uppercase' }}>Schedule a study session</div>

          <input placeholder="Topic" value={topic} onChange={e => setTopic(e.target.value)} style={inp} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inp, flex: 1 }} />
            <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ ...inp, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
            {['30min', '1hr', '1.5hr', '2hr', '3hr'].map(d => (
              <div key={d} onClick={() => setDuration(d)}
                style={{ padding: '2px 7px', borderRadius: 999, border: `1px solid ${duration === d ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: duration === d ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)', fontFamily: 'system-ui, sans-serif', fontSize: 12, cursor: 'pointer' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {(['online', 'in-person'] as const).map(t => (
              <div key={t} onClick={() => { setSessType(t); if (t === 'online') setLocation('') }}
                style={{ padding: '2px 8px', borderRadius: 999, border: `1px solid ${sessType === t ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: sessType === t ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)', fontFamily: 'system-ui, sans-serif', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</div>
            ))}
          </div>
          {sessType === 'in-person' && <input placeholder="Room / Location" value={location} onChange={e => setLocation(e.target.value)} style={inp} />}

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.45)', marginBottom: 2, textTransform: 'uppercase' }}>Knowledge Level: {knowledgeLevel}%</div>
            <input type="range" min={0} max={100} step={5} value={knowledgeLevel} onChange={e => setKnowledgeLevel(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'rgba(239,222,217,0.6)', height: 4 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
              <span>Beginner</span><span>Intermediate</span><span>Expert</span>
            </div>
          </div>

          <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, letterSpacing: 1, color: 'rgba(255,255,255,0.45)', marginBottom: 4, textTransform: 'uppercase' }}>Invite</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
            {['u2', 'u3', 'u4'].map(b => (
              <div key={b} onClick={() => setSelectedBuddies(p => p.includes(b) ? p.filter(x => x !== b) : [...p, b])}
                style={{ padding: '2px 8px', borderRadius: 999, border: `1px solid ${selectedBuddies.includes(b) ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: selectedBuddies.includes(b) ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)', fontFamily: 'system-ui, sans-serif', fontSize: 12, cursor: 'pointer' }}>
                {buddyNames[b]}
              </div>
            ))}
          </div>

          <PillButton onClick={() => { if (topic && date && time) { createSession(topic, date, time, duration, sessType, location, selectedBuddies, knowledgeLevel); setSection('sessions') } }} style={{ width: '100%' }}>Create &rarr;</PillButton>
        </div>
      </div>
    )
  }

  const filtered = sessions.filter(s => {
    const isPast = s.status === 'cancelled' || new Date(`${s.date}T${s.time}`) < new Date()
    return tab === 'upcoming' ? !isPast : isPast
  })

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>Sessions</div>
        <PillButton size="sm" onClick={() => setSection('create-session')}>+ New</PillButton>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {(['upcoming', 'past'] as const).map(t => (
          <div key={t} onClick={() => setTab(t)}
            style={{ padding: '2px 10px', borderRadius: 999, border: `1px solid ${tab === t ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, color: tab === t ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)', fontFamily: 'system-ui, sans-serif', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: 16 }}>No {tab} sessions</div>
      ) : filtered.map(s => {
        const isCreator = s.creatorId === user?.id
        const isJoined = s.participants.some(p => p.userId === user?.id && p.status === 'joined')
        return (
          <div key={s.id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{s.topic}</div>
                <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{s.date} {s.time} &middot; {s.duration}</div>
                <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                  <Tag>{s.sessionType}</Tag>
                  {s.location && <Tag>{s.location}</Tag>}
                  {s.knowledgeLevel != null && <Tag>KL:{s.knowledgeLevel}%</Tag>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{s.participants.length} participants</span>
                <div style={{ display: 'flex', gap: 2 }}>
                  <PillButton size="sm" onClick={() => { setSelectedSessionId(s.id); setSection('session-detail') }}>View</PillButton>
                  {isJoined && !isCreator && (
                    <PillButton size="sm" variant="ghost" onClick={() => leaveSession(s.id)} style={{ color: 'rgba(255,180,100,0.6)' }}>Leave</PillButton>
                  )}
                  {isCreator && (
                    <PillButton size="sm" variant="ghost" onClick={() => cancelSession(s.id)} style={{ color: 'rgba(255,80,80,0.5)' }}>Delete</PillButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 3, marginTop: 6, textTransform: 'uppercase' }}>{children}</div>
}

function Tag({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '2px 6px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{children}</div>
}

const inp: React.CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box', padding: '6px 0', marginBottom: 6,
  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent', fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: 600,
  color: 'rgba(255,255,255,0.85)', outline: 'none',
}
