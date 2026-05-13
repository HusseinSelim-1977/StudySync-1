import { User, Profile, AvailabilitySlot, Match, StudySession, Notification, BuddyRequest, Conversation, Message } from '../inner/studysync/types'

const DAY_MAP: Record<string, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3,
  FRIDAY: 4, SATURDAY: 5, SUNDAY: 6
}

const DAY_REVERSE: Record<number, string> = {
  0: 'MONDAY', 1: 'TUESDAY', 2: 'WEDNESDAY', 3: 'THURSDAY',
  4: 'FRIDAY', 5: 'SATURDAY', 6: 'SUNDAY'
}

export function transformUser(u: any): User {
  return { ...u }
}

export function transformProfile(p: any): Profile {
  return {
    userId: p.userId || '',
    courses: p.courses || [],
    topics: p.topics || [],
    studyPace: p.studyPace || '',
    studyMode: p.studyMode || '',
    groupSize: p.groupSize != null ? String(p.groupSize) : '',
    studyStyles: p.studyStyle ? [p.studyStyle] : [],
  }
}

export function toBackendProfile(p: Partial<Profile>) {
  return {
    ...p,
    groupSize: p.groupSize ? parseInt(p.groupSize, 10) || null : null,
    studyStyle: p.studyStyles?.[0] || null,
  }
}

export function transformAvailabilitySlot(s: any): AvailabilitySlot {
  return {
    dayOfWeek: DAY_MAP[s.dayOfWeek] ?? 0,
    startTime: s.startTime,
    endTime: s.endTime,
  }
}

export function toBackendAvailability(s: { dayOfWeek: number; startTime: string; endTime: string }) {
  return {
    dayOfWeek: DAY_REVERSE[s.dayOfWeek] || 'MONDAY',
    startTime: s.startTime,
    endTime: s.endTime,
  }
}

export function transformMatch(m: any, userMap: Record<string, any>, currentUserId?: string): Match {
  const matchedUserId = currentUserId
    ? (currentUserId === m.userId1 ? m.userId2 : m.userId1)
    : (m.userId2 || m.userId1)
  const matchedUser = userMap[matchedUserId]
  return {
    userId: currentUserId || m.userId1,
    matchedUserId,
    user: matchedUser || { id: matchedUserId, name: 'Unknown', email: '', university: '', academicYear: '', contactEmail: '', contactPhone: '' },
    compatibilityScore: m.score || 0,
    sharedCourses: [],
    sharedTopics: [],
    overlappingSlots: [],
    explanation: m.reasons?.join(', ') || '',
  }
}

function parseReasons(reasons: string[]) {
  const sharedCourses: string[] = []
  const sharedTopics: string[] = []
  for (const r of reasons) {
    if (r.startsWith('Shared courses:')) {
      sharedCourses.push(...r.replace('Shared courses:', '').split(',').map(s => s.trim()))
    } else if (r.startsWith('Shared topics:')) {
      sharedTopics.push(...r.replace('Shared topics:', '').split(',').map(s => s.trim()))
    }
  }
  return { sharedCourses, sharedTopics }
}

export function transformSession(s: any): StudySession {
  const dt = new Date(s.dateTime)
  const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return {
    id: s.id,
    creatorId: s.creatorId,
    topic: s.topic || s.title,
    date: dateStr,
    time: timeStr,
    duration: String(s.duration || 0),
    sessionType: (s.sessionType || '').toLowerCase() === 'inperson' ? 'in-person' : 'online',
    location: s.location || s.meetingLink || '',
    knowledgeLevel: s.knowledgeLevel || undefined,
    status: (s.status || '').toLowerCase() as any,
    participants: (s.participants || []).map((p: any) => ({
      userId: p.userId,
      user: p.user ? { id: p.user.id, name: p.user.name, email: p.user.email || '', university: p.user.university || '', academicYear: p.user.academicYear || '', contactEmail: '', contactPhone: '' } : { id: p.userId, name: p.userId.slice(0, 8), email: '', university: '', academicYear: '', contactEmail: '', contactPhone: '' },
      status: 'joined' as const,
    })),
    createdAt: s.createdAt || s.dateTime,
  }
}

export function transformNotification(n: any): Notification {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    createdAt: n.createdAt,
  }
}

export function transformBuddyRequest(r: any, currentUserId: string): BuddyRequest {
  const isReceiver = r.receiverId === currentUserId
  return {
    id: r.id,
    fromUserId: r.senderId,
    toUserId: r.receiverId,
    status: (r.status || '').toLowerCase(),
    fromUser: r.sender ? transformUser(r.sender) : { id: r.senderId, name: 'Unknown', email: '', university: '', academicYear: '', contactEmail: '', contactPhone: '' },
    toUser: { id: r.receiverId, name: 'Unknown', email: '', university: '', academicYear: '', contactEmail: '', contactPhone: '' },
    compatibilityScore: 0,
  }
}

export function transformConversation(c: any, currentUserId: string, userMap: Record<string, any>): Conversation {
  const otherId = (c.participantIds || []).find((id: string) => id !== currentUserId) || ''
  const otherUser = userMap[otherId]
  return {
    userId: otherId,
    user: otherUser || { id: otherId, name: 'Unknown', email: '', university: '', academicYear: '', contactEmail: '', contactPhone: '' },
    lastMessage: c.lastMessage?.content || '',
    timestamp: c.lastMessage?.createdAt || c.updatedAt,
    unread: 0,
  }
}

export function transformMessage(m: any, conversationId: string, currentUserId: string): Message {
  const otherId = ''
  return {
    id: m.id,
    senderId: m.senderId,
    receiverId: '',
    content: m.content,
    timestamp: m.createdAt,
    read: m.isRead,
  }
}
