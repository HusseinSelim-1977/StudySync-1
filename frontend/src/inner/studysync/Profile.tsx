import { useState } from 'react'
import { useApp } from './store'
import { PillButton } from './PillButton'

const paces = ['Slow & Thorough', 'Moderate', 'Fast-paced']
const modes = ['Online', 'In-Person', 'Either']
const sizes = ['1-on-1', 'Small Group (3\u20135)', 'Large Group (6+)']
const styles = ['Writing Notes', 'Listening', 'Discussing', 'Quiet Study', 'Problem Solving', 'Other']
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']

export function ProfilePage() {
  const { user, profile, availability, requests, matches, sessions, setSection, updateUser, updateProfile, setAvailability, deleteAccount, signOut } = useApp()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editUni, setEditUni] = useState('')
  const [editYear, setEditYear] = useState('')
  const [editCourses, setEditCourses] = useState<string[]>([])
  const [editTopics, setEditTopics] = useState<string[]>([])
  const [editPace, setEditPace] = useState('')
  const [editMode, setEditMode] = useState('')
  const [editGroupSize, setEditGroupSize] = useState('')
  const [editStyles, setEditStyles] = useState<string[]>([])
  const [editSlots, setEditSlots] = useState<Record<string, boolean>>({})

  const [coursesInput, setCoursesInput] = useState('')
  const [topicsInput, setTopicsInput] = useState('')

  if (!user) return null

  const startEdit = () => {
    setEditName(user.name)
    setEditEmail(user.email)
    setEditUni(user.university)
    setEditYear(user.academicYear)
    setEditCourses([...profile.courses])
    setEditTopics([...profile.topics])
    setEditPace(profile.studyPace)
    setEditMode(profile.studyMode)
    setEditGroupSize(profile.groupSize)
    setEditStyles([...profile.studyStyles])
    const slotMap: Record<string, boolean> = {}
    for (const a of availability) {
      slotMap[`${days[a.dayOfWeek]}-${a.startTime}`] = true
    }
    setEditSlots(slotMap)
    setCoursesInput('')
    setTopicsInput('')
    setEditing(true)
    setDeleting(false)
  }

  const cancelEdit = () => setEditing(false)

  const saveEdit = () => {
    updateUser({ name: editName, email: editEmail, university: editUni, academicYear: editYear })
    updateProfile({
      courses: editCourses,
      topics: editTopics,
      studyPace: editPace,
      studyMode: editMode,
      groupSize: editGroupSize,
      studyStyles: editStyles,
    })
    const slots = Object.entries(editSlots).filter(([, v]) => v).map(([k]) => {
      const [day, time] = k.split('-')
      return { dayOfWeek: days.indexOf(day), startTime: time, endTime: `${parseInt(time) + 2}:00`.padStart(5, '0') }
    })
    setAvailability(slots)
    setEditing(false)
  }

  const confirmDelete = () => {
    deleteAccount()
    setDeleting(false)
  }

  const slotsCount = Object.values(editSlots).filter(Boolean).length

  if (editing) {
    return (
      <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
        <div style={{
          position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          {'PROFILE'.split('').map((c, i) => (
            <span key={i} style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.06)', fontWeight: 500 }}>{c}</span>
          ))}
        </div>

        <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', marginBottom: 10, letterSpacing: '-0.02em' }}>Edit Profile</div>

        <SecTitle>About you</SecTitle>
        <Input value={editName} onChange={setEditName} label="Name" />
        <Input value={editEmail} onChange={setEditEmail} label="Email" />
        <Input value={editUni} onChange={setEditUni} label="University" />
        <Input value={editYear} onChange={setEditYear} label="Academic Year" />

        <SecTitle>Courses</SecTitle>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input value={coursesInput} onChange={e => setCoursesInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (coursesInput.trim() && !editCourses.includes(coursesInput.trim())) { setEditCourses([...editCourses, coursesInput.trim()]); setCoursesInput('') } } }}
            placeholder="Type + Enter"
            style={inp} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 10 }}>
          {editCourses.map(c => <Pill key={c} label={c} onRemove={() => setEditCourses(editCourses.filter(x => x !== c))} />)}
        </div>

        <SecTitle>Topics</SecTitle>
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input value={topicsInput} onChange={e => setTopicsInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (topicsInput.trim() && !editTopics.includes(topicsInput.trim())) { setEditTopics([...editTopics, topicsInput.trim()]); setTopicsInput('') } } }}
            placeholder="Type + Enter"
            style={inp} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 10 }}>
          {editTopics.map(t => <Pill key={t} label={t} onRemove={() => setEditTopics(editTopics.filter(x => x !== t))} />)}
        </div>

        <SecTitle>Study Pace</SecTitle>
        <Row options={paces} sel={editPace} onSel={setEditPace} />

        <SecTitle>Study Mode</SecTitle>
        <Row options={modes} sel={editMode} onSel={setEditMode} />

        <SecTitle>Group Size</SecTitle>
        <Row options={sizes} sel={editGroupSize} onSel={setEditGroupSize} />

        <SecTitle>Study Styles</SecTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 10 }}>
          {styles.map(s => {
            const on = editStyles.includes(s)
            return (
              <div key={s} onClick={() => setEditStyles(on ? editStyles.filter(x => x !== s) : [...editStyles, s])}
                style={{ padding: '2px 8px', borderRadius: 999, border: `1px solid ${on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`, color: on ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.3)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, cursor: 'pointer', transition: 'all 0.15s' }}>
                {s}
              </div>
            )
          })}
        </div>

        <SecTitle>Availability ({slotsCount} slots)</SecTitle>
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', marginBottom: 12 }}>
          {days.map(day => timeSlots.map(time => {
            const key = `${day}-${time}`
            const on = !!editSlots[key]
            return (
              <div key={key} onClick={() => setEditSlots(p => ({ ...p, [key]: !p[key] }))}
                style={{ width: 18, height: 10, borderRadius: 1, cursor: 'pointer', background: on ? 'rgba(255,255,255,0.15)' : 'transparent', border: `1px solid ${on ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, fontSize: 15, color: on ? 'rgba(255,255,255,0.5)' : 'transparent', transition: 'all 0.1s' }}
                title={`${day} ${time}`}>.</div>
            )
          }))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginTop: 4, marginBottom: 20 }}>
          <PillButton size="sm" onClick={saveEdit}>Save</PillButton>
          <PillButton size="sm" variant="ghost" onClick={cancelEdit}>Cancel</PillButton>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
      <div style={{
        position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      }}>
        {'PROFILE'.split('').map((c, i) => (
          <span key={i} style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.06)', fontWeight: 500 }}>{c}</span>
        ))}
      </div>

      <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', marginBottom: 10, letterSpacing: '-0.02em' }}>Profile</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 18, fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 3 }}>{user.name}</div>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1.2, color: 'rgba(255,255,255,0.4)' }}>{user.university} &middot; {user.academicYear}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        <PillButton size="sm" onClick={startEdit}>Edit Profile</PillButton>
        <PillButton size="sm" variant="ghost" onClick={() => { setDeleting(true); setEditing(false) }} style={{ color: 'rgba(255,80,80,0.6)' }}>Delete Account</PillButton>
        <PillButton size="sm" variant="ghost" onClick={signOut}>Sign Out</PillButton>
      </div>

      {profile.courses.length > 0 && <ChipSection title="Courses" items={profile.courses} />}
      {profile.topics.length > 0 && <ChipSection title="Topics" items={profile.topics} />}

      {(profile.studyPace || profile.studyMode || profile.groupSize) && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 4, textTransform: 'uppercase' }}>Preferences</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {profile.studyPace && <Chip>{profile.studyPace}</Chip>}
            {profile.studyMode && <Chip>{profile.studyMode}</Chip>}
            {profile.groupSize && <Chip>{profile.groupSize}</Chip>}
            {profile.studyStyles.map(s => <Chip key={s}>{s}</Chip>)}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 10, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Stat value={matches.length} label="Matches" onClick={() => setSection('matching')} />
        <Stat value={sessions.filter(s => s.participants.some(p => p.userId === user.id && p.status === 'joined')).length} label="Sessions" onClick={() => setSection('sessions')} />
        <Stat value={requests.filter(r => r.status === 'accepted').length} label="Connections" onClick={() => setSection('requests')} />
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <PillButton size="sm" onClick={() => setSection('dashboard')}>Dashboard &rarr;</PillButton>
        <PillButton size="sm" variant="ghost" onClick={() => setSection('matching')}>Find &rarr;</PillButton>
      </div>

      {deleting && (
        <div style={{ marginTop: 14, padding: '12px', border: '1px solid rgba(255,60,60,0.25)', borderRadius: 6, background: 'rgba(255,60,60,0.06)' }}>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 600, color: 'rgba(255,60,60,0.9)', marginBottom: 6 }}>Final Warning</div>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 10, lineHeight: 1.5 }}>
            This account will be <strong style={{ color: 'rgba(255,60,60,0.8)' }}>permanently deleted</strong>. All your data — profile, matches, sessions, and messages — will be removed. This action <strong style={{ color: 'rgba(255,60,60,0.8)' }}>cannot be undone</strong>.
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <PillButton size="sm" variant="primary" onClick={confirmDelete} style={{ background: 'rgba(255,60,60,0.8)', color: '#fff', borderColor: 'rgba(255,60,60,0.8)' }}>Delete</PillButton>
            <PillButton size="sm" variant="ghost" onClick={() => setDeleting(false)}>Cancel</PillButton>
          </div>
        </div>
      )}
    </div>
  )
}

function Input({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 2, textTransform: 'uppercase' }}>{label}</div>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4, padding: '5px 8px',
          fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15,
          color: 'rgba(255,255,255,0.85)', outline: 'none',
        }}
      />
    </div>
  )
}

function Pill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15 }}>
      {label}
      <span onClick={onRemove} style={{ cursor: 'pointer', opacity: 0.5, color: 'rgba(255,255,255,0.4)' }}>&times;</span>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.45)' }}>
      {children}
    </div>
  )
}

function ChipSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 3, textTransform: 'uppercase' }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>{items.map((s, i) => <Chip key={i}>{s}</Chip>)}</div>
    </div>
  )
}

function Stat({ value, label, onClick }: { value: number; label: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ textAlign: 'center', flex: 1, cursor: onClick ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.opacity = '0.7' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.opacity = '1' }}>
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>{value}</div>
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1, color: 'rgba(255,255,255,0.3)' }}>{label}</div>
    </div>
  )
}

function Row({ options, sel, onSel }: { options: string[]; sel: string; onSel: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 6 }}>
      {options.map(o => {
        const active = sel === o
        return (
          <div key={o} onClick={() => onSel(o)}
            style={{ padding: '2px 8px', borderRadius: 999, border: `1px solid ${active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`, color: active ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.3)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, cursor: 'pointer', transition: 'all 0.15s' }}>
            {o}
          </div>
        )
      })}
    </div>
  )
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 4, marginTop: 8, textTransform: 'uppercase' }}>{children}</div>
}

const inp: React.CSSProperties = {
  flex: 1, padding: '5px 0', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 18, fontWeight: 600,
  color: 'rgba(255,255,255,0.85)', outline: 'none',
}
