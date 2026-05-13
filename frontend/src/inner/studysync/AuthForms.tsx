import { useState } from 'react'
import { useApp } from './store'
import { PillButton } from './PillButton'

export function AuthForms({ mode }: { mode: 'login' | 'register' }) {
  const { setSection, login, register } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [university, setUniversity] = useState('GIU Cairo')
  const [year, setYear] = useState('Year 3')
  const [phone, setPhone] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const handleSubmit = async () => {
    setError(''); setLoading(true)
    if (!email) { setError('Email is required'); setLoading(false); return }
    if (!isValidEmail(email)) { setError('Please enter a valid email address'); setLoading(false); return }
    if (mode === 'login') {
      if (!password) { setError('Password is required'); setLoading(false); return }
      const ok = await login(email, password)
      if (ok) setSection('dashboard')
      else setError('Invalid credentials')
    } else {
      if (!name || !password || !university) { setError('Fill required fields'); setLoading(false); return }
      try {
        const ok = await register(name, email, password, university, year)
        if (ok) setSection('setup-profile')
        else setError('Registration failed')
      } catch (e: any) {
        setError(e.message)
      }
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
      <div style={{ width: 260 }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontStyle: 'italic', color: 'rgba(255,255,255,0.92)', marginBottom: 4, letterSpacing: '-0.02em' }}>
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </div>
        <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.72)', marginBottom: 12, textTransform: 'uppercase' }}>
          {mode === 'login' ? 'Sign In' : 'Join StudySync'}
        </div>

        {mode === 'register' && <Input placeholder="Full Name" value={name} onChange={setName} />}
        <Input placeholder="Email" value={email} onChange={setEmail} type="email" />
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <Input placeholder="Password" value={password} onChange={setPassword} type={showPw ? 'text' : 'password'} />
          <div onClick={() => setShowPw(!showPw)}
            style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {showPw ? 'hide' : 'show'}
          </div>
        </div>
        {mode === 'register' && (
          <>
            <Input placeholder="University" value={university} onChange={setUniversity} />
            <select value={year} onChange={e => setYear(e.target.value)}
              style={{ ...selStyle, marginBottom: 8 }}>
              {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Graduate'].map(y => (
                <option key={y} value={y} style={{ background: '#000000', color: 'rgba(255,255,255,0.72)' }}>{y}</option>
              ))}
            </select>
            <Input placeholder="Phone (optional)" value={phone} onChange={setPhone} />
          </>
        )}

        {error && <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, color: 'rgba(239,222,217,0.7)', marginBottom: 6 }}>{error}</div>}

        <PillButton onClick={handleSubmit} style={{ width: '100%', marginTop: 2 }}>
          {loading ? '...' : mode === 'login' ? 'Sign In \u2198' : 'Register \u2198'}
        </PillButton>

        <div style={{         fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 8, cursor: 'pointer' }}
          onClick={() => setSection(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'New here? Create account' : 'Already have an account? Sign in'}
        </div>
      </div>
    </div>
  )
}

function Input({ placeholder, value, onChange, type }: { placeholder: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      placeholder={placeholder}
      type={type || 'text'}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        display: 'block', width: '100%', boxSizing: 'border-box', padding: '6px 0', marginBottom: 8,
        border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'transparent', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 600,
        color: 'rgba(255,255,255,0.9)', outline: 'none',
      }}
    />
  )
}

const selStyle: React.CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box', padding: '6px 0',
  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.08)',
  background: 'transparent', fontFamily: 'system-ui, -apple-system, sans-serif', fontSize: 14, fontWeight: 600,
  color: 'rgba(255,255,255,0.9)', outline: 'none', cursor: 'pointer',
}
