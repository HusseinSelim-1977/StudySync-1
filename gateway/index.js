require('dotenv').config();

const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const jwt = require('jsonwebtoken');

const { initKafka, request } = require('./kafkaClient');
const { TOPICS } = require('../shared/kafka');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ------------------ HELPERS ------------------

const unwrap = (res) => {
  if (!res) throw new Error('Service unavailable');
  if (!res.success) throw new Error(res.error || 'Unknown error');
  return res.data;
};

const withTimeout = (promise, ms = 30000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    )
  ]);

const requireAuth = (context) => {
  if (!context.user) throw new Error('Unauthorized');
};

// ------------------ SCHEMA ------------------

const typeDefs = `#graphql

  # ── USER ──────────────────────────────────────────────────────
  type User {
    id: ID!
    email: String!
    name: String!
    university: String
    academicYear: String
    contactEmail: String
    contactPhone: String
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    userId: ID!
  }

  # ── BUDDY REQUESTS ────────────────────────────────────────────
  type BuddyRequest {
    id: ID!
    senderId: ID!
    receiverId: ID!
    status: String!
    createdAt: String!
    sender: User
  }

  type Buddy {
    id: ID!
    name: String!
    email: String!
    university: String
    academicYear: String
  }

  # ── PROFILE ───────────────────────────────────────────────────
  type Profile {
    id: ID!
    userId: ID!
    courses: [String]
    topics: [String]
    studyPace: String
    studyMode: String
    groupSize: Int
    studyStyle: String
  }

  # ── AVAILABILITY ──────────────────────────────────────────────
  type AvailabilitySlot {
    id: ID!
    dayOfWeek: String!
    startTime: String!
    endTime: String!
  }

  # ── MATCHING ──────────────────────────────────────────────────
  type Match {
    id: ID!
    userId1: ID!
    userId2: ID!
    score: Int!
    reasons: [String]
  }

  # ── SESSIONS ──────────────────────────────────────────────────
  type Session {
    id: ID!
    title: String!
    topic: String!
    creatorId: ID!
    dateTime: String!
    duration: Int!
    sessionType: String!
    meetingLink: String
    location: String
    maxParticipants: Int!
    knowledgeLevel: Int
    status: String!
    invitedUserIds: [ID!]
    participants: [SessionParticipant]
  }

  type SessionParticipant {
    id: ID!
    sessionId: ID!
    userId: ID!
    joinedAt: String!
    user: User
  }

  # ── MESSAGING ─────────────────────────────────────────────────
  type Conversation {
    id: ID!
    participantIds: [ID!]!
    updatedAt: String!
    lastMessage: Message
  }

  type Message {
    id: ID!
    conversationId: ID!
    senderId: ID!
    content: String!
    isRead: Boolean!
    createdAt: String!
  }

  # ── NOTIFICATIONS ─────────────────────────────────────────────
  type Notification {
    id: ID!
    userId: ID!
    type: String!
    title: String!
    body: String!
    isRead: Boolean!
    createdAt: String!
  }

  type SearchUserResult {
    id: ID!
    name: String!
    email: String!
    university: String
    academicYear: String
  }

  # ── QUERIES ───────────────────────────────────────────────────
  type Query {
    me: User
    getUser(id: ID!): User
    myProfile: Profile
    myAvailability: [AvailabilitySlot]
    myMatches: [Match]
    searchUsers(query: String!): [SearchUserResult]
    mySessions: [Session]
    getSession(id: ID!): Session
    myConversations: [Conversation]
    conversationMessages(conversationId: ID!): [Message]
    myNotifications: [Notification]
    unreadNotificationCount: Int
    myBuddyRequests: [BuddyRequest]
    myBuddies: [Buddy]
  }

  # ── MUTATIONS ─────────────────────────────────────────────────
  type Mutation {
    # auth
    register(
      email: String!
      password: String!
      name: String!
      university: String
      academicYear: String
      contactEmail: String
      contactPhone: String
    ): User

    login(email: String!, password: String!): AuthPayload

    # user
    updateUser(
      name: String
      university: String
      academicYear: String
      contactEmail: String
      contactPhone: String
    ): User

    deleteUser: Boolean

    # profile
    updateProfile(
      courses: [String]
      topics: [String]
      studyPace: String
      studyMode: String
      groupSize: Int
      studyStyle: String
    ): Profile

    # availability
    createAvailability(
      dayOfWeek: String!
      startTime: String!
      endTime: String!
    ): AvailabilitySlot

    deleteAvailability(id: ID!): Boolean

    # sessions
    createSession(
      title: String!
      topic: String!
      dateTime: String!
      duration: Int!
      sessionType: String!
      meetingLink: String
      location: String
      maxParticipants: Int
      invitedUserIds: [ID!]
      knowledgeLevel: Int
    ): Session

    joinSession(sessionId: ID!): SessionParticipant
    leaveSession(sessionId: ID!): Boolean
    cancelSession(sessionId: ID!): Session
    updateSession(
      sessionId: ID!
      title: String
      topic: String
      dateTime: String
      duration: Int
      meetingLink: String
      location: String
      invitedUserIds: [ID!]
      removeUserIds: [ID!]
      addUserIds: [ID!]
    ): Session

    removeBuddy(contactUserId: ID!): Boolean

    # messaging
    createConversation(targetUserId: ID!): Conversation
    sendMessage(conversationId: ID, targetUserId: ID, content: String!): Message

    # notifications
    markNotificationRead(id: ID!): Notification
    markAllNotificationsRead: Boolean

    # buddy requests
    sendBuddyRequest(receiverId: ID!): BuddyRequest
    acceptBuddyRequest(requestId: ID!): BuddyRequest
    declineBuddyRequest(requestId: ID!): BuddyRequest

    dismissMatch(matchedUserId: ID!): Boolean
  }
`;

// ------------------ MESSAGING REST HELPER ------------------

const MESSAGING_URL = process.env.MESSAGING_SERVICE_URL || 'http://messaging-service:4007';

const messagingFetch = async (path, method = 'GET', token, body = null) => {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${MESSAGING_URL}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// ------------------ NOTIFICATION KAFKA HELPER ------------------
// Notification service is event-driven only; we query its DB via a
// dedicated GET_NOTIFICATIONS topic added below.

// ------------------ RESOLVERS ------------------

const resolvers = {
  Query: {
    // ── USER ──
    me: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_USER, { userId: ctx.user.id }));
      return unwrap(res).user;
    },

    getUser: async (_, { id }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_USER, { userId: id }));
      return unwrap(res).user;
    },

    // ── PROFILE ──
    myProfile: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_PROFILE, { userId: ctx.user.id }));
      return unwrap(res).profile;
    },

    // ── AVAILABILITY ──
    myAvailability: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_AVAILABILITY, { userId: ctx.user.id }));
      return unwrap(res).slots || [];
    },

    // ── MATCHES ──
    myMatches: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_MATCHES, { userId: ctx.user.id }));
      return unwrap(res).matches || [];
    },

    // ── SEARCH USERS ──
    searchUsers: async (_, { query }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.SEARCH_USERS, { query }));
      return unwrap(res).users || [];
    },

    // ── SESSIONS ──
    mySessions: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_SESSIONS, { userId: ctx.user.id }));
      return unwrap(res).sessions || [];
    },

    // ── MESSAGING (REST proxy) ──
    getSession: async (_, { id }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_SESSION, { sessionId: id }));
      return unwrap(res).session;
    },

    myConversations: async (_, __, ctx) => {
      requireAuth(ctx);
      const conversations = await messagingFetch('/conversations', 'GET', ctx.rawToken);
      return (conversations || []).map(c => ({
        ...c,
        lastMessage: c.messages?.[0] || null,
        messages: undefined
      }));
    },

    conversationMessages: async (_, { conversationId }, ctx) => {
      requireAuth(ctx);
      return messagingFetch(`/conversations/${conversationId}/messages`, 'GET', ctx.rawToken);
    },

    // ── NOTIFICATIONS ──
    myNotifications: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_NOTIFICATIONS, { userId: ctx.user.id }));
      return unwrap(res).notifications || [];
    },

    unreadNotificationCount: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_NOTIFICATIONS, { userId: ctx.user.id, unreadOnly: true }));
      return (unwrap(res).notifications || []).length;
    },

    // ── BUDDY REQUESTS ──
    myBuddyRequests: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_BUDDY_REQUESTS, { userId: ctx.user.id }));
      return unwrap(res).requests || [];
    },

    myBuddies: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.GET_BUDDIES, { userId: ctx.user.id }));
      return unwrap(res).buddies || [];
    },
  },

  Mutation: {
    // ── AUTH ──
    register: async (_, args) => {
      const res = await withTimeout(request(TOPICS.REGISTER_USER, args));
      return unwrap(res).user;
    },

    login: async (_, args) => {
      const res = await withTimeout(request(TOPICS.LOGIN_USER, args));
      return unwrap(res);
    },

    // ── USER UPDATE ──
    updateUser: async (_, args, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.UPDATE_USER, { userId: ctx.user.id, ...args }));
      return unwrap(res).user;
    },

    // ── USER DELETE ──
    deleteUser: async (_, __, ctx) => {
      requireAuth(ctx);
      await withTimeout(request(TOPICS.DELETE_USER, { userId: ctx.user.id }));
      return true;
    },

    // ── PROFILE ──
    updateProfile: async (_, args, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.UPDATE_PROFILE, { userId: ctx.user.id, ...args }));
      return unwrap(res).profile;
    },

    // ── AVAILABILITY ──
    createAvailability: async (_, args, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.CREATE_AVAILABILITY, { userId: ctx.user.id, ...args }));
      return unwrap(res).slot;
    },

    deleteAvailability: async (_, { id }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.DELETE_AVAILABILITY, { id, userId: ctx.user.id }));
      unwrap(res);
      return true;
    },

    // ── SESSIONS ──
    createSession: async (_, args, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.CREATE_SESSION, { creatorId: ctx.user.id, ...args }));
      return unwrap(res).session;
    },

    // ── DISMISS MATCH ──
    dismissMatch: async (_, { matchedUserId }, ctx) => {
      requireAuth(ctx);
      await withTimeout(request(TOPICS.DELETE_MATCH, { userId1: ctx.user.id, userId2: matchedUserId }));
      return true;
    },

    joinSession: async (_, { sessionId }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.JOIN_SESSION, { sessionId, userId: ctx.user.id }));
      return unwrap(res).participant;
    },

    leaveSession: async (_, { sessionId }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.LEAVE_SESSION, { sessionId, userId: ctx.user.id }));
      unwrap(res);
      return true;
    },

    cancelSession: async (_, { sessionId }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.CANCEL_SESSION, { sessionId, userId: ctx.user.id }));
      return unwrap(res).session;
    },

    updateSession: async (_, args, ctx) => {
      requireAuth(ctx);
      const { sessionId, ...fields } = args;
      const res = await withTimeout(request(TOPICS.UPDATE_SESSION, { sessionId, userId: ctx.user.id, ...fields }));
      return unwrap(res).session;
    },

    removeBuddy: async (_, { contactUserId }, ctx) => {
      requireAuth(ctx);
      await withTimeout(request(TOPICS.REMOVE_BUDDY, { userId: ctx.user.id, contactUserId }));
      return true;
    },

    // ── MESSAGING (REST proxy) ──
    createConversation: async (_, { targetUserId }, ctx) => {
      requireAuth(ctx);
      return messagingFetch('/conversations', 'POST', ctx.rawToken, { targetUserId });
    },

    sendMessage: async (_, { conversationId, targetUserId, content }, ctx) => {
      requireAuth(ctx);
      return messagingFetch('/messages', 'POST', ctx.rawToken, {
        conversationId,
        targetUserId,
        content,
      });
    },

    // ── NOTIFICATIONS ──
    markNotificationRead: async (_, { id }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.MARK_NOTIFICATION_READ, { id, userId: ctx.user.id }));
      return unwrap(res).notification;
    },

    markAllNotificationsRead: async (_, __, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.MARK_ALL_NOTIFICATIONS_READ, { userId: ctx.user.id }));
      unwrap(res);
      return true;
    },

    // ── BUDDY REQUESTS ──
    sendBuddyRequest: async (_, { receiverId }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.SEND_BUDDY_REQUEST, { senderId: ctx.user.id, receiverId }));
      return unwrap(res).request;
    },

    acceptBuddyRequest: async (_, { requestId }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.ACCEPT_BUDDY_REQUEST, { requestId, userId: ctx.user.id }));
      return unwrap(res).request;
    },

    declineBuddyRequest: async (_, { requestId }, ctx) => {
      requireAuth(ctx);
      const res = await withTimeout(request(TOPICS.DECLINE_BUDDY_REQUEST, { requestId, userId: ctx.user.id }));
      return unwrap(res).request;
    },
  },

  SessionParticipant: {
    user: async (parent, _, ctx) => {
      try {
        const res = await withTimeout(request(TOPICS.GET_USER, { userId: parent.userId }));
        return unwrap(res).user;
      } catch {
        return null;
      }
    },
  },
};

// ------------------ SERVER ------------------

const startServer = async () => {
  await initKafka();

  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || '';
      let user = null;
      let rawToken = null;

      if (authHeader.startsWith('Bearer ')) {
        rawToken = authHeader.split(' ')[1];
        try {
          user = jwt.verify(rawToken, JWT_SECRET);
        } catch (e) {
          console.error('Invalid token:', e.message);
        }
      }

      return { user, rawToken };
    },
  });

  console.log(`🚀 Gateway running at ${url}`);
};

startServer();
