import { useState, useCallback, useMemo, useEffect } from 'react'
import { createContext, useContext } from 'react'
import { client } from '../../api/client'
import * as O from '../../api/operations'
import * as T from '../../api/transform'
import { Section, User, Profile, AvailabilitySlot, Match, StudySession, Notification, BuddyRequest, Message, Conversation, SearchUserResult } from './types'

const FALLBACK_USERS: User[] = [
  { id: '', name: '', email: '', university: '', academicYear: '', contactEmail: '', contactPhone: '' },
  { id: 'u2', name: 'Emma Chen', email: 'emma@uni.edu', university: 'GIU Cairo', academicYear: 'Year 3', contactEmail: 'emma@uni.edu', contactPhone: '+20 100 200 300' },
  { id: 'u3', name: 'Omar Hassan', email: 'omar@uni.edu', university: 'GIU Cairo', academicYear: 'Year 2', contactEmail: 'omar@uni.edu', contactPhone: '' },
  { id: 'u4', name: 'Lena Weber', email: 'lena@uni.edu', university: 'GIU Cairo', academicYear: 'Year 4', contactEmail: 'lena@uni.edu', contactPhone: '+20 101 202 303' },
  { id: 'u5', name: 'Ali Rahman', email: 'ali@uni.edu', university: 'GIU Cairo', academicYear: 'Graduate', contactEmail: 'ali@uni.edu', contactPhone: '' },
  { id: 'u6', name: 'Sara Kim', email: 'sara@uni.edu', university: 'GIU Cairo', academicYear: 'Year 3', contactEmail: 'sara@uni.edu', contactPhone: '' },
  { id: 'u7', name: 'Yuki Tanaka', email: 'yuki@uni.edu', university: 'GIU Cairo', academicYear: 'Year 2', contactEmail: 'yuki@uni.edu', contactPhone: '' },
]

interface AppState {
  section: Section
  user: User | null
  profile: Profile
  availability: AvailabilitySlot[]
  matches: Match[]
  sessions: StudySession[]
  notifications: Notification[]
  requests: BuddyRequest[]
  conversations: Conversation[]
  searchResults: SearchUserResult[]
  messages: Record<string, Message[]>
  selectedMatchId: string | null
  selectedSessionId: string | null
  notificationFilter: string
  requestsTab: 'incoming' | 'outgoing'
  setSection: (s: Section) => void
  goBack: () => void
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string, university: string, year: string) => Promise<boolean>
  updateProfile: (p: Partial<Profile>) => void
  updateUser: (u: Partial<Pick<User, 'name' | 'email' | 'university' | 'academicYear' | 'contactEmail' | 'contactPhone'>>) => void
  deleteAccount: () => void
  signOut: () => void
  searchUsers: (query: string) => Promise<SearchUserResult[]>
  dismissMatch: (matchedUserId: string) => void
  removeContact: (contactUserId: string) => void
  setAvailability: (a: AvailabilitySlot[]) => void
  setSelectedMatchId: (id: string | null) => void
  setSelectedSessionId: (id: string | null) => void
  setNotificationFilter: (f: string) => void
  setRequestsTab: (t: 'incoming' | 'outgoing') => void
  sendBuddyRequest: (toUserId: string) => void
  acceptBuddyRequest: (reqId: string) => void
  declineBuddyRequest: (reqId: string) => void
  createSession: (topic: string, date: string, time: string, duration: string, type: 'online' | 'in-person', location: string, participantIds: string[], knowledgeLevel?: number) => void
  joinSession: (sessionId: string) => void
  leaveSession: (sessionId: string) => void
  cancelSession: (sessionId: string) => void
  updateSession: (sessionId: string, fields: { title?: string; topic?: string; dateTime?: string; duration?: number; meetingLink?: string; location?: string; invitedUserIds?: string[]; removeUserIds?: string[]; addUserIds?: string[] }) => void
  markNotificationRead: (id: string) => void
  markAllRead: () => void
  sendMessage: (receiverId: string, content: string) => void
}

const defaultProfile: Profile = {
  userId: '', courses: [], topics: [], studyPace: '', studyMode: '', groupSize: '', studyStyles: [],
}

export const AppCtx = createContext<AppState>(null!)

export function useApp() { return useContext(AppCtx) }

function calcCompatibility(a: Profile, b: Profile, aAvail: AvailabilitySlot[], bAvail: AvailabilitySlot[]): { score: number, sharedCourses: string[], sharedTopics: string[], overlappingSlots: string[], explanation: string } {
  const sharedCourses = a.courses.filter(c => b.courses.includes(c))
  const sharedTopics = a.topics.filter(t => b.topics.includes(t))
  let score = 0
  score += Math.min(sharedCourses.length * 30, 40)
  score += Math.min(sharedTopics.length * 20, 30)
  const overlaps: string[] = []
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (const sa of aAvail) {
    for (const sb of bAvail) {
      if (sa.dayOfWeek === sb.dayOfWeek && sa.startTime < sb.endTime && sb.startTime < sa.endTime) {
        overlaps.push(`${days[sa.dayOfWeek]} ${sa.startTime}-${sa.endTime}`)
      }
    }
  }
  score += Math.min(overlaps.length * 5, 20)
  if (a.studyMode && b.studyMode && a.studyMode === b.studyMode) score += 5
  if (a.studyPace && b.studyPace && a.studyPace === b.studyPace) score += 3
  if (a.groupSize && b.groupSize && a.groupSize === b.groupSize) score += 2
  score = Math.min(score, 100)
  const parts: string[] = []
  if (sharedCourses.length) parts.push(`shared ${sharedCourses.length} courses`)
  if (sharedTopics.length) parts.push(`${sharedTopics.length} matching topics`)
  if (overlaps.length) parts.push(`${overlaps.length} overlapping slots`)
  return { score, sharedCourses, sharedTopics, overlappingSlots: overlaps, explanation: `Matched because: ${parts.join(', ')}.` }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [section, setSectionState] = useState<Section>('landing')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfileState] = useState<Profile>(defaultProfile)
  const [availability, setAvailabilityState] = useState<AvailabilitySlot[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [requests, setRequests] = useState<BuddyRequest[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [notificationFilter, setNotificationFilter] = useState('all')
  const [requestsTab, setRequestsTab] = useState<'incoming' | 'outgoing'>('incoming')

  const setSection = useCallback((s: Section) => {
    setSectionState(s)
  }, [])

  const goBack = useCallback(() => {
    setSectionState('landing')
  }, [])

  const fetchAllData = useCallback(async (userId: string) => {
    try {
      const [meRes, profileRes, availRes, matchesRes, sessionsRes, notifRes, requestsRes, buddiesRes, convRes] = await Promise.allSettled([
        client.query({ query: O.ME }),
        client.query({ query: O.MY_PROFILE }),
        client.query({ query: O.MY_AVAILABILITY }),
        client.query({ query: O.MY_MATCHES }),
        client.query({ query: O.MY_SESSIONS }),
        client.query({ query: O.MY_NOTIFICATIONS }),
        client.query({ query: O.MY_BUDDY_REQUESTS }),
        client.query({ query: O.MY_BUDDIES }),
        client.query({ query: O.MY_CONVERSATIONS }),
      ])

      if (meRes.status === 'fulfilled') {
        setUser(T.transformUser(meRes.value.data.me))
      }

      if (profileRes.status === 'fulfilled' && profileRes.value.data.myProfile) {
        setProfileState(T.transformProfile(profileRes.value.data.myProfile))
      }

      if (availRes.status === 'fulfilled') {
        setAvailabilityState((availRes.value.data.myAvailability || []).map(T.transformAvailabilitySlot))
      }

      if (sessionsRes.status === 'fulfilled') {
        setSessions((sessionsRes.value.data.mySessions || []).map(T.transformSession))
      }

      if (notifRes.status === 'fulfilled') {
        setNotifications((notifRes.value.data.myNotifications || []).map(T.transformNotification))
      }

      if (requestsRes.status === 'fulfilled') {
        setRequests((requestsRes.value.data.myBuddyRequests || []).map((r: any) => T.transformBuddyRequest(r, userId)))
      }

      if (matchesRes.status === 'fulfilled') {
        const backendMatches = matchesRes.value.data.myMatches || []
        const userIds = new Set<string>()
        for (const m of backendMatches) {
          userIds.add(m.userId1)
          userIds.add(m.userId2)
        }
        const userMap: Record<string, any> = {}
        if (buddiesRes.status === 'fulfilled') {
          for (const b of (buddiesRes.value.data.myBuddies || [])) {
            userMap[b.id] = b
          }
        }
        userMap[userId] = meRes.status === 'fulfilled' ? meRes.value.data.me : null
        for (const uid of userIds) {
          if (!userMap[uid] && uid !== userId) {
            try {
              const res = await client.query({ query: O.GET_USER, variables: { id: uid } })
              if (res.data?.getUser) userMap[uid] = res.data.getUser
            } catch {}
          }
        }
        setMatches(backendMatches.map((m: any) => T.transformMatch(m, userMap, userId)))
      }

      if (convRes.status === 'fulfilled') {
        const backendConvs = convRes.value.data.myConversations || []
        const userMap: Record<string, any> = {}
        if (meRes.status === 'fulfilled') userMap[userId] = meRes.value.data.me
        if (buddiesRes.status === 'fulfilled') {
          for (const b of (buddiesRes.value.data.myBuddies || [])) {
            userMap[b.id] = b
          }
        }
        setConversations(backendConvs.map((c: any) => T.transformConversation(c, userId, userMap)))
      }
    } catch (err) {
      console.error('Failed to load initial data:', err)
    }
  }, [])

  // Auto-login from stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      client.query({ query: O.ME }).then(res => {
        if (res.data?.me) {
          const u = T.transformUser(res.data.me)
          setUser(u)
          fetchAllData(u.id)
        }
      }).catch(() => {
        localStorage.removeItem('auth_token')
      })
    }
  }, [fetchAllData])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await client.mutate({ mutation: O.LOGIN, variables: { email, password } })
      if (!res.data?.login) return false
      const { token, userId } = res.data.login
      localStorage.setItem('auth_token', token)
      await fetchAllData(userId)
      return true
    } catch (err) {
      console.error('Login failed:', err)
      return false
    }
  }, [fetchAllData])

  const register = useCallback(async (name: string, email: string, password: string, university: string, year: string) => {
    try {
      const res = await client.mutate({
        mutation: O.REGISTER,
        variables: { email, password, name, university, academicYear: year, contactEmail: email }
      })
      if (!res.data?.register) throw new Error('Registration failed')
      return await login(email, password)
    } catch (err: any) {
      const msg = err?.message?.replace(/^GraphQL error:\s*/, '') || 'Registration failed'
      throw new Error(msg)
    }
  }, [login])

  const updateProfile = useCallback((p: Partial<Profile>) => {
    const uid = user?.id
    setProfileState(prev => {
      const updated = { ...prev, ...p }
      const backend = T.toBackendProfile(updated)
      client.mutate({ mutation: O.UPDATE_PROFILE, variables: backend })
        .then(() => client.query({ query: O.MY_MATCHES }))
        .then(res => {
          if (res.data?.myMatches?.length && uid) {
            setMatches(res.data.myMatches.map((m: any) => T.transformMatch(m, {}, uid)))
          }
        })
        .catch((err: any) => console.error('Update profile / refetch matches failed:', err))
      return updated
    })
  }, [user])

  const updateUser = useCallback((u: Partial<Pick<User, 'name' | 'email' | 'university' | 'academicYear' | 'contactEmail' | 'contactPhone'>>) => {
    client.mutate({ mutation: O.UPDATE_USER, variables: { ...u } })
      .then(res => {
        if (res.data?.updateUser) {
          setUser(T.transformUser(res.data.updateUser))
        }
      })
      .catch((err: any) => console.error('updateUser failed:', err))
    setUser(prev => prev ? { ...prev, ...u } : prev)
  }, [])

  const deleteAccount = useCallback(() => {
    client.mutate({ mutation: O.DELETE_USER })
      .then(() => {
        localStorage.removeItem('auth_token')
        setUser(null)
        setProfileState(defaultProfile)
        setAvailabilityState([])
        setMatches([])
        setSessions([])
        setNotifications([])
        setRequests([])
        setConversations([])
        setMessages({})
        setSection('landing')
      })
      .catch((err: any) => console.error('deleteAccount failed:', err))
  }, [setSection])

  const signOut = useCallback(() => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setProfileState(defaultProfile)
    setAvailabilityState([])
    setMatches([])
    setSessions([])
    setNotifications([])
    setRequests([])
    setConversations([])
    setMessages({})
    setSearchResults([])
    setSection('landing')
  }, [setSection])

  const searchUsers = useCallback(async (query: string) => {
    try {
      const res = await client.query({ query: O.SEARCH_USERS, variables: { query } })
      const users = (res.data?.searchUsers || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        university: u.university || '',
        academicYear: u.academicYear || '',
      }))
      setSearchResults(users)
      return users
    } catch (err) {
      console.error('searchUsers failed:', err)
      return []
    }
  }, [])

  const dismissMatch = useCallback((matchedUserId: string) => {
    client.mutate({ mutation: O.DISMISS_MATCH, variables: { matchedUserId } }).catch((err: any) => console.error('dismissMatch failed:', err))
    setMatches(prev => prev.filter(m => m.matchedUserId !== matchedUserId))
  }, [])

  const removeContact = useCallback((contactUserId: string) => {
    client.mutate({ mutation: O.REMOVE_BUDDY, variables: { contactUserId } }).catch((err: any) => console.error('removeContact failed:', err))
    setRequests(prev => prev.map(r => {
      if ((r.fromUserId === user?.id || r.toUserId === user?.id) && r.status === 'accepted') {
        const otherId = r.fromUserId === user?.id ? r.toUserId : r.fromUserId
        if (otherId === contactUserId) return { ...r, status: 'declined' }
      }
      return r
    }))
  }, [user])

  const setAvailability = useCallback(async (slots: AvailabilitySlot[]) => {
    setAvailabilityState(slots)

    try {
      const existingRes = await client.query({ query: O.MY_AVAILABILITY })
      const existing = existingRes.data?.myAvailability || []
      for (const slot of existing) {
        await client.mutate({ mutation: O.DELETE_AVAILABILITY, variables: { id: slot.id } }).catch(() => {})
      }
      for (const slot of slots) {
        await client.mutate({ mutation: O.CREATE_AVAILABILITY, variables: T.toBackendAvailability(slot) }).catch(() => {})
      }
    } catch (err) {
      console.error('Failed to sync availability:', err)
    }
  }, [])

  const sendBuddyRequest = useCallback((toUserId: string) => {
    client.mutate({ mutation: O.SEND_BUDDY_REQUEST, variables: { receiverId: toUserId } }).catch((err: any) => console.error('sendBuddyRequest failed:', err))
    const match = matches.find(m => m.matchedUserId === toUserId)
    if (!match) return
    const req: BuddyRequest = { id: `req-${Date.now()}`, fromUserId: user?.id || '', toUserId, status: 'pending', fromUser: user!, toUser: match.user, compatibilityScore: match.compatibilityScore }
    setRequests(prev => [...prev, req])
    const nt: Notification = { id: `nt-${Date.now()}`, type: 'SYSTEM', title: 'Buddy Request Sent', body: `Buddy request sent to ${match.user.name}`, isRead: false, createdAt: new Date().toISOString() }
    setNotifications(prev => [nt, ...prev])
  }, [matches, user])

  const acceptBuddyRequest = useCallback((reqId: string) => {
    client.mutate({ mutation: O.ACCEPT_BUDDY_REQUEST, variables: { requestId: reqId } }).catch((err: any) => console.error('acceptBuddyRequest failed:', err))
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'accepted' } : r))
  }, [])

  const declineBuddyRequest = useCallback((reqId: string) => {
    client.mutate({ mutation: O.DECLINE_BUDDY_REQUEST, variables: { requestId: reqId } }).catch((err: any) => console.error('declineBuddyRequest failed:', err))
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'declined' } : r))
  }, [])

  const createSession = useCallback((topic: string, date: string, time: string, duration: string, sessionType: 'online' | 'in-person', location: string, participantIds: string[], knowledgeLevel?: number) => {
    const dateTime = `${date}T${time}:00`
    const tempId = `sess-${Date.now()}`
    const sessionData = {
      title: topic,
      topic,
      dateTime,
      duration: parseInt(duration, 10) || 60,
      sessionType: sessionType === 'in-person' ? 'INPERSON' : 'ONLINE',
      location: sessionType === 'in-person' ? location : undefined,
      meetingLink: sessionType === 'online' ? location : undefined,
      maxParticipants: 10,
      invitedUserIds: participantIds.length > 0 ? participantIds : undefined,
      knowledgeLevel: knowledgeLevel || null,
    }

    const optimistic: StudySession = {
      id: tempId, creatorId: user?.id || '', topic, date, time, duration, sessionType, location,
      status: 'confirmed', participants: [...participantIds.map(pid => ({ userId: pid, user: FALLBACK_USERS.find(u => u.id === pid) || user!, status: 'invited' as const })), { userId: user?.id || '', user: user!, status: 'joined' as const }],
      createdAt: new Date().toISOString(),
    }
    setSessions(prev => [optimistic, ...prev])

    client.mutate({ mutation: O.CREATE_SESSION, variables: sessionData })
      .then(res => {
        if (res.data?.createSession) {
          setSessions(prev => prev.map(s => s.id === tempId ? T.transformSession(res.data.createSession) : s))
        }
      })
      .catch((err: any) => console.error('createSession failed:', err))

    const nt: Notification = { id: `nt-${Date.now()}`, type: 'SESSION', title: 'Session Created', body: `Study session "${topic}" created`, isRead: false, createdAt: new Date().toISOString() }
    setNotifications(prev => [nt, ...prev])
  }, [user])

  const joinSession = useCallback((sessionId: string) => {
    client.mutate({ mutation: O.JOIN_SESSION, variables: { sessionId } }).catch((err: any) => console.error('joinSession failed:', err))
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, participants: s.participants.map(p => p.userId === user?.id ? { ...p, status: 'joined' } : p) } : s))
  }, [user])

  const leaveSession = useCallback((sessionId: string) => {
    client.mutate({ mutation: O.LEAVE_SESSION, variables: { sessionId } }).catch((err: any) => console.error('leaveSession failed:', err))
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, participants: s.participants.filter(p => p.userId !== user?.id) } : s))
  }, [user])

  const cancelSession = useCallback((sessionId: string) => {
    client.mutate({ mutation: O.CANCEL_SESSION, variables: { sessionId } }).catch((err: any) => console.error('cancelSession failed:', err))
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'cancelled' } : s))
  }, [])

  const updateSession = useCallback((sessionId: string, fields: any) => {
    client.mutate({ mutation: O.UPDATE_SESSION, variables: { sessionId, ...fields } })
      .then(res => {
        if (res.data?.updateSession) {
          setSessions(prev => prev.map(s => s.id === sessionId ? T.transformSession(res.data.updateSession) : s))
        }
      })
      .catch((err: any) => console.error('updateSession failed:', err))
  }, [])

  const markNotificationRead = useCallback((id: string) => {
    client.mutate({ mutation: O.MARK_NOTIFICATION_READ, variables: { id } }).catch((err: any) => console.error('markNotificationRead failed:', err))
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    client.mutate({ mutation: O.MARK_ALL_NOTIFICATIONS_READ }).catch((err: any) => console.error('markAllRead failed:', err))
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }, [])

  const sendMessage = useCallback((receiverId: string, content: string) => {
    client.mutate({ mutation: O.SEND_MESSAGE, variables: { targetUserId: receiverId, content } }).catch((err: any) => console.error('sendMessage failed:', err))
    const msg: Message = { id: `msg-${Date.now()}`, senderId: user?.id || '', receiverId, content, timestamp: new Date().toISOString(), read: false }
    setMessages(prev => {
      const key = [user?.id, receiverId].sort().join('-')
      return { ...prev, [key]: [...(prev[key] || []), msg] }
    })
    const recipient = FALLBACK_USERS.find(u => u.id === receiverId)
    if (recipient) {
      setConversations(prev => {
        const existing = prev.findIndex(c => c.userId === receiverId)
        const conv: Conversation = { userId: receiverId, user: recipient, lastMessage: content, timestamp: msg.timestamp, unread: 0 }
        if (existing >= 0) {
          const next = [...prev]; next[existing] = conv; return next
        }
        return [conv, ...prev]
      })
    }
  }, [user])

  const ctx = useMemo(() => ({
    section, user, profile, availability, matches, sessions, notifications, requests, conversations, searchResults, messages,
    selectedMatchId, selectedSessionId, notificationFilter, requestsTab,
    setSection, goBack, login, register, updateProfile, updateUser, deleteAccount, signOut, searchUsers, dismissMatch, removeContact,
    setAvailability, setSelectedMatchId, setSelectedSessionId,
    setNotificationFilter, setRequestsTab,
    sendBuddyRequest, acceptBuddyRequest, declineBuddyRequest,
    createSession, joinSession, leaveSession, cancelSession, updateSession,
    markNotificationRead, markAllRead, sendMessage,
  } as AppState), [section, user, profile, availability, matches, sessions, notifications, requests, conversations, searchResults, messages, selectedMatchId, selectedSessionId, notificationFilter, requestsTab, login, register, goBack, setSection, updateProfile, updateUser, deleteAccount, signOut, searchUsers, dismissMatch, removeContact, setAvailability, sendBuddyRequest, acceptBuddyRequest, declineBuddyRequest, createSession, joinSession, leaveSession, cancelSession, updateSession, markNotificationRead, markAllRead, sendMessage])

  return <AppCtx.Provider value={ctx}>{children}</AppCtx.Provider>
}
