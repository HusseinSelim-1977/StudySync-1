import { useState, useCallback } from 'react'
import { Window } from './Window'
import { Taskbar } from './Taskbar'
import { StudySync } from '../studysync/StudySync'

interface AppWindow {
  id: string
  title: string
  icon: string
  content: { title: string; body: string[] }
  zIndex: number
}

const APPS: Omit<AppWindow, 'zIndex'>[] = [
  {
    id: 'about',
    title: 'About Me',
    icon: '\u{1F464}',
    content: {
      title: 'Hussein Selim',
      body: [
        'CS student at GIU Cairo',
        'Software Engineering major',
        '',
        'Passionate about full-stack systems,',
        'AI agents, and immersive UI/UX.',
        'Building tools that connect people',
        'and solve real problems.',
      ],
    },
  },
  {
    id: 'projects',
    title: 'Projects',
    icon: '\u2699',
    content: {
      title: 'Projects \u2014 Ship Log',
      body: [
        'StudySync: Real-time study buddy',
        '  matcher. Node.js microservices,',
        '  Kafka, GraphQL, React frontend.',
        '',
        'LikeALocal: Tourist discovery app.',
        '  Flutter, Gemini AI, Firebase.',
        '  Curated off-grid experiences.',
        '',
        'EvoMap/Evolver: Autonomous self-',
        '  improving AI agent. Node.js,',
        '  vector embeddings, GPT APIs.',
      ],
    },
  },
  {
    id: 'skills',
    title: 'Skills',
    icon: '\u269B',
    content: {
      title: 'Tech Stack',
      body: [
        'React/Next.js    \u2713',
        'Node.js/Express  \u2713',
        'TypeScript       \u2713',
        'Three.js/R3F     \u2713',
        'Flutter/Dart     \u2713',
        'Docker/K8s       \u2713',
        'Kafka            \u2713',
        'GraphQL          \u2713',
        'PostgreSQL       \u2713',
        'Redis            \u2713',
        'Python           \u2713',
        'Firebase         \u2713',
      ],
    },
  },
  {
    id: 'contact',
    title: 'Contact',
    icon: '\u2709',
    content: {
      title: 'Get in Touch',
      body: [
        'GitHub:   HusseinSelim-1977',
        'Email:    husseinsherif2006@gmail.com',
        '',
        'Open to collaborations,',
        'internships, and building',
        'cool things together.',
      ],
    },
  },
  {
    id: 'credits',
    title: 'Credits',
    icon: '\u2B50',
    content: {
      title: 'Credits & Inspiration',
      body: [
        'To Dr.Menna',
        'Thank you for everything =)',
        '',
        'This portfolio experience was',
        'inspired by the incredible work',
        'of Henry Heffernan',
        '(henryheffernan.com).',
        '',
        'His 3D room portfolio concept,',
        'iframe-in-3D technique, and',
        'CSS3DRenderer camera navigation',
        'approach were the creative',
        'foundation for this project.',
        '',
        'Full credit and deep respect to',
        'Henry for pioneering this format.',
        'Visit his work at',
        'henryheffernan.com and',
        'github.com/henryjeff.',
        '',
        'Also inspired by Unseen Studio\'s',
        'spatial navigation and 3D-surround',
        'concept — visit unseen.studio',
        'for mind-bending web experiences.',
      ],
    },
  },
  {
    id: 'studysync',
    title: 'StudySync',
    icon: '\u25C6',
    content: {
      title: 'StudySync',
      body: [],
    },
  },
]

const WINDOW_POSITIONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  about: { x: 20, y: 20, w: 220, h: 150 },
  projects: { x: 250, y: 30, w: 240, h: 180 },
  skills: { x: 40, y: 160, w: 200, h: 200 },
  contact: { x: 270, y: 190, w: 210, h: 150 },
  credits: { x: 110, y: 70, w: 260, h: 210 },
  studysync: { x: 0, y: 0, w: 512, h: 356 },
}

export function Desktop() {
  const [windows, setWindows] = useState<Record<string, AppWindow>>({})
  const [highestZ, setHighestZ] = useState(0)
  const [minimized, setMinimized] = useState<Record<string, boolean>>({})
  const [maximized, setMaximized] = useState<Record<string, boolean>>({})

  const closeApp = useCallback((id: string) => {
    setWindows((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setMinimized((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setMaximized((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const focusApp = useCallback((id: string) => {
    setMinimized((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    setHighestZ((z) => {
      const nextZ = z + 1
      setWindows((prev) => {
        if (!prev[id]) return prev
        return { ...prev, [id]: { ...prev[id], zIndex: nextZ } }
      })
      return nextZ
    })
  }, [])

  const minimizeApp = useCallback((id: string) => {
    setMinimized((prev) => ({ ...prev, [id]: true }))
  }, [])

  const maximizeApp = useCallback((id: string) => {
    setMaximized((prev) => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }, [])

  const openApp = useCallback((id: string) => {
    const app = APPS.find((a) => a.id === id)
    if (!app) return
    if (windows[id]) {
      focusApp(id)
      setMinimized((prev) => {
        if (!prev[id]) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
      return
    }
    setHighestZ((z) => {
      const nextZ = z + 1
      setWindows((prev) => ({
        ...prev,
        [id]: { ...app, zIndex: nextZ, content: { ...app.content } },
      }))
      return nextZ
    })
  }, [windows, focusApp])

  return (
    <div
      style={{
        width: 512,
        height: 384,
        background: '#008080',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'MS Sans Serif', 'Microsoft Sans Serif', 'Courier New', monospace",
        cursor: 'default',
        fontSize: 11,
      }}
    >
      {/* desktop icons */}
      <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {APPS.map((app) => (
          <div
            key={app.id}
            onClick={() => openApp(app.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '4px 6px',
              cursor: 'pointer',
              width: 70,
              color: '#ffffff',
              fontSize: 10,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, lineHeight: 1 }}>{app.icon}</div>
            <div
              style={{
                marginTop: 2,
                background: 'rgba(0,0,0,0.3)',
                padding: '1px 4px',
                borderRadius: 1,
              }}
            >
              {app.title}
            </div>
          </div>
        ))}
      </div>

      {/* windows */}
      {Object.values(windows).map((win) => {
        if (minimized[win.id]) return null
        const pos = WINDOW_POSITIONS[win.id] || { x: 50, y: 50, w: 200, h: 150 }
        const isMax = maximized[win.id]
        return (
          <Window
            key={win.id}
            title={win.title}
            icon={win.icon}
            x={isMax ? 0 : pos.x}
            y={isMax ? 0 : pos.y}
            width={isMax ? 512 : pos.w}
            height={isMax ? 356 : pos.h}
            zIndex={win.zIndex}
            isMaximized={!!isMax}
            noPadding={win.id === 'studysync'}
            onClose={() => closeApp(win.id)}
            onFocus={() => focusApp(win.id)}
            onMinimize={() => minimizeApp(win.id)}
            onMaximize={() => maximizeApp(win.id)}
          >
            {win.id === 'studysync' ? (
              <StudySync />
            ) : (
              <div style={{ fontSize: 11, lineHeight: 1.5, color: '#000000' }}>
                <div style={{ color: '#000080', fontSize: 11, marginBottom: 4, fontWeight: 'bold' }}>
                  {win.content.title}
                </div>
                {win.content.body.map((line, i) => (
                  <div key={i} style={{ whiteSpace: 'pre' }}>
                    {line || '\u00A0'}
                  </div>
                ))}
              </div>
            )}
          </Window>
        )
      })}

      {/* taskbar */}
      <Taskbar
        windows={Object.values(windows)}
        onOpen={openApp}
        onFocus={focusApp}
        onClose={closeApp}
        onMinimize={minimizeApp}
        onMaximize={maximizeApp}
        maximized={maximized}
      />
    </div>
  )
}
