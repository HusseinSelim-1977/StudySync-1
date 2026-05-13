import { useApp } from './store'
import { PillButton } from './PillButton'

export function MatchDetail() {
  const { matches, selectedMatchId, setSection, profile, sendBuddyRequest } = useApp()
  const match = matches.find(m => m.matchedUserId === selectedMatchId)
  if (!match) return <div style={{ padding: 40, fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.3)' }}>Not found</div>

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '34px 14px 28px', zIndex: 10, overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 17, fontWeight: 600, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {match.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>{match.user.name}</div>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)' }}>{match.user.university} &middot; {match.user.academicYear}</div>
          <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{match.user.email}</div>
        </div>
        <div style={{ position: 'relative', width: 36, height: 36 }}>
          <svg width="36" height="36" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(239,222,217,0.5)" strokeWidth="2.5" strokeDasharray={`${match.compatibilityScore}, 100`} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{match.compatibilityScore}%</div>
        </div>
      </div>

      <Detail title="Shared Courses" items={match.sharedCourses.length > 0 ? match.sharedCourses : ['None']} />
      <Detail title="Shared Topics" items={match.sharedTopics.length > 0 ? match.sharedTopics : ['None']} />
      <Detail title="Availability Overlap" items={match.overlappingSlots.length > 0 ? match.overlappingSlots : ['None']} />

      {profile.studyStyles.length > 0 && <Detail title="Study Styles" items={profile.studyStyles} />}

      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 10, lineHeight: 1.3, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {match.explanation}
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <PillButton size="sm" onClick={() => { sendBuddyRequest(match.matchedUserId); setSection('matching') }}>Confirm Match</PillButton>
        <PillButton size="sm" variant="ghost" onClick={() => setSection('matching')}>Back</PillButton>
      </div>
    </div>
  )
}

function Detail({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, letterSpacing: 1.5, color: 'rgba(255,255,255,0.45)', marginBottom: 3, textTransform: 'uppercase' }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {items.map((s, i) => (
          <span key={i} style={{ padding: '2px 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>{s}</span>
        ))}
      </div>
    </div>
  )
}
