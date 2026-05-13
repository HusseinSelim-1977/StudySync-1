import { useState } from 'react'
import { useApp } from './store'
import { PillButton } from './PillButton'

const paces = ['Slow & Thorough', 'Moderate', 'Fast-paced']
const modes = ['Online', 'In-Person', 'Either']
const sizes = ['1-on-1', 'Small Group (3\u20135)', 'Large Group (6+)']
const styles = ['Writing Notes', 'Listening', 'Discussing', 'Quiet Study', 'Problem Solving', 'Other']
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const timeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']

export function SetupFlow({ step }: { step: number }) {
  const { setSection, updateProfile, setAvailability } = useApp()
  const [coursesInput, setCoursesInput] = useState('')
  const [courses, setCourses] = useState<string[]>([])
  const [topicsInput, setTopicsInput] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [pace, setPace] = useState('')
  const [mode, setMode] = useState('')
  const [groupSize, setGroupSize] = useState('')
  const [studyStyles, setStudyStyles] = useState<string[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const toggleCell = (key: string) => setSelected(p => ({ ...p, [key]: !p[key] }))
  const step1Done = courses.length > 0
  const step2Done = !!pace && !!mode && !!groupSize
  const step3Done = Object.values(selected).filter(Boolean).length > 0

  const dots = (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 10 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: i === step ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)' }} />
      ))}
    </div>
  )

  if (step === 1) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px', zIndex: 10 }}>
        <div style={{ maxWidth: 280, margin: '0 auto', width: '100%' }}>
          {dots}
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', textAlign: 'center', marginBottom: 2, letterSpacing: '-0.02em' }}>About you</div>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' }}>Step 1 &mdash; Academic Profile</div>

          <Label>Courses</Label>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            <input value={coursesInput} onChange={e => setCoursesInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (coursesInput.trim() && !courses.includes(coursesInput.trim())) { setCourses([...courses, coursesInput.trim()]); setCoursesInput('') } } }}
              placeholder="Type + Enter"
              style={inp} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 10 }}>
            {courses.map(c => <Pill key={c} label={c} onRemove={() => setCourses(courses.filter(x => x !== c))} />)}
          </div>

          <Label>Topics</Label>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            <input value={topicsInput} onChange={e => setTopicsInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (topicsInput.trim() && !topics.includes(topicsInput.trim())) { setTopics([...topics, topicsInput.trim()]); setTopicsInput('') } } }}
              placeholder="Type + Enter"
              style={inp} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 14 }}>
            {topics.map(t => <Pill key={t} label={t} onRemove={() => setTopics(topics.filter(x => x !== t))} />)}
          </div>

          <PillButton onClick={() => { updateProfile({ courses, topics }); setSection('setup-preferences') }} disabled={!step1Done} style={{ width: '100%' }}>Continue &rarr;</PillButton>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px', zIndex: 10 }}>
        <div style={{ maxWidth: 300, margin: '0 auto', width: '100%' }}>
          {dots}
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', textAlign: 'center', marginBottom: 2, letterSpacing: '-0.02em' }}>How you study</div>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' }}>Step 2 &mdash; Preferences</div>

          <SecTitle>Study Pace</SecTitle>
          <Row options={paces} sel={pace} onSel={setPace} />

          <SecTitle>Study Mode</SecTitle>
          <Row options={modes} sel={mode} onSel={setMode} />

          <SecTitle>Group Size</SecTitle>
          <Row options={sizes} sel={groupSize} onSel={setGroupSize} />

          <SecTitle>Style (multi)</SecTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginBottom: 10 }}>
            {styles.map(s => {
              const on = studyStyles.includes(s)
              return (
                <div key={s} onClick={() => setStudyStyles(on ? studyStyles.filter(x => x !== s) : [...studyStyles, s])}
                  style={{ padding: '2px 8px', borderRadius: 999, border: `1px solid ${on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`, color: on ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.3)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, cursor: 'pointer', transition: 'all 0.15s' }}>
                  {s}
                </div>
              )
            })}
          </div>

          <PillButton onClick={() => { updateProfile({ studyPace: pace, studyMode: mode, groupSize, studyStyles }); setSection('setup-availability') }} disabled={!step2Done} style={{ width: '100%' }}>Continue &rarr;</PillButton>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 24px', zIndex: 10 }}>
      <div style={{ maxWidth: 300, margin: '0 auto', width: '100%' }}>
        {dots}
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', textAlign: 'center', marginBottom: 2, letterSpacing: '-0.02em' }}>Your availability</div>
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginBottom: 10, textTransform: 'uppercase' }}>Step 3 &mdash; Free Slots</div>

        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 }}>
          {days.map(day => timeSlots.map(time => {
            const key = `${day}-${time}`
            const on = !!selected[key]
            return (
              <div key={key} onClick={() => toggleCell(key)}
                style={{ width: 18, height: 10, borderRadius: 1, cursor: 'pointer', background: on ? 'rgba(255,255,255,0.15)' : 'transparent', border: `1px solid ${on ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: on ? 'rgba(255,255,255,0.5)' : 'transparent', transition: 'all 0.1s' }}
                title={`${day} ${time}`}>.</div>
            )
          }))}
        </div>

        <PillButton onClick={() => {
          const slots = Object.entries(selected).filter(([, v]) => v).map(([k]) => {
            const [day, time] = k.split('-')
            return { dayOfWeek: days.indexOf(day), startTime: time, endTime: `${parseInt(time) + 2}:00`.padStart(5, '0') }
          })
          setAvailability(slots)
          setSection('dashboard')
        }} disabled={!step3Done} style={{ width: '100%' }}>Find My Matches &rarr;</PillButton>
      </div>
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

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 3, marginTop: 4, textTransform: 'uppercase' }}>{children}</div>
}

function SecTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 4, marginTop: 6, textTransform: 'uppercase' }}>{children}</div>
}

function Row({ options, sel, onSel }: { options: string[]; sel: string; onSel: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginBottom: 2 }}>
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

const inp: React.CSSProperties = {
  flex: 1, padding: '5px 0', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 18, fontWeight: 600,
  color: 'rgba(255,255,255,0.85)', outline: 'none',
}
