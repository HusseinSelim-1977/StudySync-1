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
  if (!res) throw new Error("Service unavailable");
  if (!res.success) throw new Error(res.error || "Unknown error");
  return res.data;
};

const withTimeout = (promise, ms = 5000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), ms)
    )
  ]);

// ------------------ SCHEMA ------------------

const typeDefs = `#graphql
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

  type Query {
    me: User
    myProfile: Profile
    myAvailability: [AvailabilitySlot]
    myMatches: [Match]
  }

  type Mutation {
    register(email: String!, password: String!, name: String!): User
    login(email: String!, password: String!): AuthPayload
  }
`;

// ------------------ RESOLVERS ------------------

const resolvers = {
  Query: {
    me: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");

      const res = await withTimeout(
        request(TOPICS.GET_USER, { userId: context.user.id })
      );

      return unwrap(res).user;
    },

    myProfile: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");

      const res = await withTimeout(
        request(TOPICS.GET_PROFILE, { userId: context.user.id })
      );

      return unwrap(res).profile;
    },

    myAvailability: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");

      const res = await withTimeout(
        request(TOPICS.GET_AVAILABILITY, { userId: context.user.id })
      );

      return unwrap(res).slots || [];
    },

    myMatches: async (_, __, context) => {
      if (!context.user) throw new Error("Unauthorized");

      const res = await withTimeout(
        request(TOPICS.GET_MATCHES, { userId: context.user.id })
      );

      return unwrap(res).matches || [];
    }
  },

  Mutation: {
    register: async (_, args) => {
      const res = await withTimeout(
        request(TOPICS.REGISTER_USER, args)
      );

      return unwrap(res).user;
    },

    login: async (_, args) => {
      const res = await withTimeout(
        request(TOPICS.LOGIN_USER, args)
      );

      return unwrap(res);
    }
  }
};

// ------------------ SERVER ------------------

const startServer = async () => {
  // 🔥 Initialize Kafka first
  await initKafka();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: PORT },
    context: async ({ req }) => {
      const authHeader = req.headers.authorization || '';
      let user = null;

      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        try {
          user = jwt.verify(token, JWT_SECRET);
        } catch (e) {
          console.error("Invalid token:", e.message);
        }
      }

      return { user };
    },
  });

  console.log(`🚀 Gateway running at ${url}`);
};

startServer();