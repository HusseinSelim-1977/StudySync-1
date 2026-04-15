require('dotenv').config({ path: '../.env' });
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const PORT = process.env.GATEWAY_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Service URLs (Docker compose network or localhost)
const USER_URL = process.env.USER_SERVICE_URL || 'http://localhost:4001';
const PROFILE_URL = process.env.PROFILE_SERVICE_URL || 'http://localhost:4002';
const AVAILABILITY_URL = process.env.AVAILABILITY_SERVICE_URL || 'http://localhost:4003';
const MATCHING_URL = process.env.MATCHING_SERVICE_URL || 'http://localhost:4004';
const SESSION_URL = process.env.SESSION_SERVICE_URL || 'http://localhost:4005';
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4006';
const MESSAGING_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:4007';

const typeDefs = `
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

  type AvailabilitySlot {
    id: ID!
    dayOfWeek: String!
    startTime: String!
    endTime: String!
  }

  type Match {
    id: ID!
    userId1: ID!
    userId2: ID!
    score: Int!
    reasons: [String]
  }

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
    status: String!
    participants: [SessionParticipant]
  }

  type SessionParticipant {
    id: ID!
    userId: ID!
    joinedAt: String!
  }

  type Notification {
    id: ID!
    userId: ID!
    type: String!
    title: String!
    body: String!
    isRead: Boolean!
    createdAt: String!
  }

  type Message {
    id: ID!
    senderId: ID!
    content: String!
    isRead: Boolean!
    createdAt: String!
  }

  type Conversation {
    id: ID!
    participantIds: [ID]!
    messages: [Message]
    updatedAt: String!
  }

  type Query {
    me: User
    myProfile: Profile
    myAvailability: [AvailabilitySlot]
    myMatches: [Match]
    sessions(topic: String, type: String): [Session]
    session(id: ID!): Session
    myNotifications: [Notification]
    myConversations: [Conversation]
    conversationMessages(id: ID!): [Message]
  }

  type Mutation {
    register(email: String!, password: String!, name: String!, university: String, academicYear: String, contactEmail: String, contactPhone: String): User
    login(email: String!, password: String!): AuthPayload
    updateProfile(courses: [String], topics: [String], studyPace: String, studyMode: String, groupSize: Int, studyStyle: String): Profile
    createAvailability(dayOfWeek: String!, startTime: String!, endTime: String!): AvailabilitySlot
    deleteAvailability(id: ID!): Boolean
    createSession(title: String!, topic: String!, dateTime: String!, duration: Int!, sessionType: String!, meetingLink: String, location: String, maxParticipants: Int!): Session
    joinSession(id: ID!): SessionParticipant
    leaveSession(id: ID!): Boolean
    markNotificationRead(id: ID!): Notification
    sendMessage(conversationId: ID, targetUserId: ID, content: String!): Message
    createConversation(targetUserId: ID!): Conversation
  }
`;

// Helper to make REST requests with the token
const reqWithAuth = async (context, method, url, data = null) => {
  if (!context.token) throw new Error("Unauthorized");
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: { Authorization: `Bearer ${context.token}` }
    });
    return response.data;
  } catch (err) {
    throw new Error(err.response?.data?.error || err.message);
  }
};

const resolvers = {
  Query: {
    me: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");
      return reqWithAuth(context, 'GET', `${USER_URL}/users/${context.user.id}`);
    },
    myProfile: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");
      return reqWithAuth(context, 'GET', `${PROFILE_URL}/profile/${context.user.id}`);
    },
    myAvailability: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");
      return reqWithAuth(context, 'GET', `${AVAILABILITY_URL}/availability/${context.user.id}`);
    },
    myMatches: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");
      return reqWithAuth(context, 'GET', `${MATCHING_URL}/matches/${context.user.id}`);
    },
    sessions: async (_, { topic, type }, context) => {
      let query = `?`;
      if (topic) query += `topic=${topic}&`;
      if (type) query += `type=${type}`;
      return reqWithAuth(context, 'GET', `${SESSION_URL}/sessions${query}`);
    },
    session: async (_, { id }, context) => {
      return reqWithAuth(context, 'GET', `${SESSION_URL}/sessions/${id}`);
    },
    myNotifications: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");
      return reqWithAuth(context, 'GET', `${NOTIFICATION_URL}/notifications/${context.user.id}`);
    },
    myConversations: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");
      return reqWithAuth(context, 'GET', `${MESSAGING_URL}/conversations`);
    },
    conversationMessages: async (_, { id }, context) => {
      if (!context.user) throw new Error("Unauthorized");
      return reqWithAuth(context, 'GET', `${MESSAGING_URL}/conversations/${id}/messages`);
    }
  },
  Mutation: {
    register: async (_, args) => {
      try {
        const res = await axios.post(`${USER_URL}/auth/register`, args);
        return res.data;
      } catch (err) { throw new Error(err.response?.data?.error || err.message); }
    },
    login: async (_, args) => {
      try {
        const res = await axios.post(`${USER_URL}/auth/login`, args);
        return res.data;
      } catch (err) { throw new Error(err.response?.data?.error || err.message); }
    },
    updateProfile: async (_, args, context) => {
      if (!context.user) throw new Error("Unauthorized");
      return reqWithAuth(context, 'PUT', `${PROFILE_URL}/profile/${context.user.id}`, args);
    },
    createAvailability: async (_, args, context) => {
      return reqWithAuth(context, 'POST', `${AVAILABILITY_URL}/availability`, args);
    },
    deleteAvailability: async (_, { id }, context) => {
      await reqWithAuth(context, 'DELETE', `${AVAILABILITY_URL}/availability/${id}`);
      return true;
    },
    createSession: async (_, args, context) => {
      return reqWithAuth(context, 'POST', `${SESSION_URL}/sessions`, args);
    },
    joinSession: async (_, { id }, context) => {
      return reqWithAuth(context, 'POST', `${SESSION_URL}/sessions/${id}/join`);
    },
    leaveSession: async (_, { id }, context) => {
      await reqWithAuth(context, 'DELETE', `${SESSION_URL}/sessions/${id}/leave`);
      return true;
    },
    markNotificationRead: async (_, { id }, context) => {
      return reqWithAuth(context, 'PUT', `${NOTIFICATION_URL}/notifications/${id}/read`);
    },
    sendMessage: async (_, args, context) => {
      return reqWithAuth(context, 'POST', `${MESSAGING_URL}/messages`, args);
    },
    createConversation: async (_, args, context) => {
      return reqWithAuth(context, 'POST', `${MESSAGING_URL}/conversations`, args);
    }
  }
};

const startServer = async () => {
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();

  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');
        let user = null;
        if (token) {
          try {
            user = jwt.verify(token, JWT_SECRET);
          } catch (e) {
            console.error("Invalid token:", e.message);
          }
        }
        return { user, token };
      },
    }),
  );

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'gateway', timestamp: new Date().toISOString() });
  });

  const httpServer = app.listen(PORT, () => {
    console.log(`GraphQL Gateway running at http://localhost:${PORT}/graphql`);
  });
  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down Gateway...");
    httpServer.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer();
