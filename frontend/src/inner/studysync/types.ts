export type Section =
  | 'landing' | 'login' | 'register'
  | 'setup-profile' | 'setup-preferences' | 'setup-availability'
  | 'dashboard' | 'matching' | 'match-detail'
  | 'sessions' | 'create-session' | 'session-detail'
  | 'requests' | 'notifications' | 'profile' | 'chat'

export interface User {
  id: string
  name: string
  email: string
  university: string
  academicYear: string
  contactEmail: string
  contactPhone: string
  avatar?: string
}

export interface Profile {
  userId: string
  courses: string[]
  topics: string[]
  studyPace: string
  studyMode: string
  groupSize: string
  studyStyles: string[]
}

export interface AvailabilitySlot {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface Match {
  userId: string
  matchedUserId: string
  user: User
  compatibilityScore: number
  sharedCourses: string[]
  sharedTopics: string[]
  overlappingSlots: string[]
  explanation: string
}

export interface StudySession {
  id: string
  creatorId: string
  topic: string
  date: string
  time: string
  duration: string
  sessionType: 'online' | 'in-person'
  location?: string
  knowledgeLevel?: number
  status: 'confirmed' | 'pending' | 'cancelled'
  participants: SessionParticipant[]
  createdAt: string
}

export interface SessionParticipant {
  userId: string
  user: User
  status: 'joined' | 'invited' | 'declined' | 'left'
}

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

export interface BuddyRequest {
  id: string
  fromUserId: string
  toUserId: string
  status: 'pending' | 'accepted' | 'declined'
  fromUser: User
  toUser: User
  compatibilityScore: number
}

export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  timestamp: string
  read: boolean
}

export interface SearchUserResult {
  id: string
  name: string
  email: string
  university: string
  academicYear: string
}

export interface Conversation {
  userId: string
  user: User
  lastMessage: string
  timestamp: string
  unread: number
}
