import { useMemo, useRef, useEffect, useState } from 'react'
import { AppProvider, useApp } from './store'
import { SceneBackground } from './SceneBackground'
import { TopBar } from './TopBar'
import { BottomHUD } from './BottomHUD'
import { LandingPage } from './LandingPage'
import { AuthForms } from './AuthForms'
import { SetupFlow } from './SetupFlow'
import { Dashboard } from './Dashboard'
import { Matching } from './Matching'
import { MatchDetail } from './MatchDetail'
import { StudySessions } from './StudySessions'
import { NotificationsPage } from './Notifications'
import { ProfilePage } from './Profile'
import { RequestsPage } from './Requests'

const BACK_PAGES = new Set(['login', 'register', 'setup-profile', 'setup-preferences', 'setup-availability', 'dashboard', 'matching', 'match-detail', 'sessions', 'create-session', 'session-detail', 'requests', 'notifications', 'profile', 'chat'])

const TOAST_DURATION = 4000

function StudySyncInner() {
  const { section, setSection, user, notifications } = useApp()
  const rootRef = useRef<HTMLDivElement>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const unread = notifications.filter(n => !n.isRead)
    if (unread.length === 0) return
    const latest = unread[0]
    setToastMsg(latest.title)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), TOAST_DURATION)
  }, [notifications])

  useMemo(() => {
    const css = document.createElement('style')
    css.id = 'ss-page-anim'
    css.textContent = `
      @keyframes ss-page-in {
        0% { opacity: 0; transform: scale(0.93); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes ss-toast-in {
        0% { opacity: 0; transform: translateY(-16px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes ss-toast-out {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-16px) scale(0.95); }
      }
    `
    document.head.appendChild(css)
  }, [])

  const showBack = section !== 'landing'

  const renderSection = () => {
    switch (section) {
      case 'landing': return <LandingPage />
      case 'login': return <AuthForms mode="login" />
      case 'register': return <AuthForms mode="register" />
      case 'setup-profile': return <SetupFlow step={1} />
      case 'setup-preferences': return <SetupFlow step={2} />
      case 'setup-availability': return <SetupFlow step={3} />
      case 'dashboard': return <Dashboard />
      case 'matching': return <Matching />
      case 'match-detail': return <MatchDetail />
      case 'sessions':
      case 'create-session':
      case 'session-detail': return <StudySessions />
      case 'requests': return <RequestsPage />
      case 'notifications': return <NotificationsPage />
      case 'profile': return <ProfilePage />
      default: return <LandingPage />
    }
  }

  return (
    <div
      ref={rootRef}
      style={{
        width: '100%', height: '100%', position: 'relative', overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        WebkitFontSmoothing: 'antialiased', textRendering: 'optimizeLegibility',
        transform: 'scale(0.92)',
        transformOrigin: 'center center',
      }}
    >
      <SceneBackground />

      {/* Back arrow */}
      {showBack && (
        <div
          onClick={() => {
            if (user && (section === 'login' || section === 'register')) { setSection('landing'); return }
            if (section === 'match-detail') { setSection('matching'); return }
            if (section === 'create-session' || section === 'session-detail') { setSection('sessions'); return }
            if (user) setSection('dashboard')
            else setSection('landing')
          }}
          style={{
            position: 'absolute', top: 14, left: 10, zIndex: 25,
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 15, lineHeight: 1,
            transition: 'all 0.25s cubic-bezier(.16,1,.3,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
        >
          &#11164;
        </div>
      )}

      <TopBar />

      <div
        key={section}
        style={{
          width: '100%', height: '100%',
          animation: 'ss-page-in 450ms cubic-bezier(.16,1,.3,1) both',
        }}
      >
        {renderSection()}
      </div>

      <BottomHUD />

      {/* Toast notification */}
      {toastMsg && (
        <div
          style={{
            position: 'absolute', top: 36, left: '50%', transform: 'translateX(-50%)',
            zIndex: 60, pointerEvents: 'none',
            animation: 'ss-toast-in 350ms cubic-bezier(.16,1,.3,1) both',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            padding: '7px 16px',
            borderRadius: 999,
            border: '1px solid rgba(239,222,217,0.12)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 15, fontWeight: 600,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: 0.2,
            whiteSpace: 'nowrap',
            maxWidth: '80%',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  )
}

export function StudySync() {
  return (
    <AppProvider>
      <StudySyncInner />
    </AppProvider>
  )
}
