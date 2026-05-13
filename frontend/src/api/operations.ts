import { gql } from '@apollo/client'

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      refreshToken
      userId
    }
  }
`

export const REGISTER = gql`
  mutation Register(
    $email: String!
    $password: String!
    $name: String!
    $university: String
    $academicYear: String
    $contactEmail: String
    $contactPhone: String
  ) {
    register(
      email: $email
      password: $password
      name: $name
      university: $university
      academicYear: $academicYear
      contactEmail: $contactEmail
      contactPhone: $contactPhone
    ) {
      id
      email
      name
      university
      academicYear
      contactEmail
      contactPhone
    }
  }
`

export const ME = gql`
  query Me {
    me {
      id
      email
      name
      university
      academicYear
      contactEmail
      contactPhone
    }
  }
`

export const GET_USER = gql`
  query GetUser($id: ID!) {
    getUser(id: $id) {
      id
      email
      name
      university
      academicYear
      contactEmail
      contactPhone
    }
  }
`

export const UPDATE_USER = gql`
  mutation UpdateUser(
    $name: String
    $university: String
    $academicYear: String
    $contactEmail: String
    $contactPhone: String
  ) {
    updateUser(
      name: $name
      university: $university
      academicYear: $academicYear
      contactEmail: $contactEmail
      contactPhone: $contactPhone
    ) {
      id
      email
      name
      university
      academicYear
      contactEmail
      contactPhone
    }
  }
`

export const MY_PROFILE = gql`
  query MyProfile {
    myProfile {
      id
      userId
      courses
      topics
      studyPace
      studyMode
      groupSize
      studyStyle
    }
  }
`

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $courses: [String]
    $topics: [String]
    $studyPace: String
    $studyMode: String
    $groupSize: Int
    $studyStyle: String
  ) {
    updateProfile(
      courses: $courses
      topics: $topics
      studyPace: $studyPace
      studyMode: $studyMode
      groupSize: $groupSize
      studyStyle: $studyStyle
    ) {
      id
      userId
      courses
      topics
      studyPace
      studyMode
      groupSize
      studyStyle
    }
  }
`

export const MY_AVAILABILITY = gql`
  query MyAvailability {
    myAvailability {
      id
      dayOfWeek
      startTime
      endTime
    }
  }
`

export const CREATE_AVAILABILITY = gql`
  mutation CreateAvailability($dayOfWeek: String!, $startTime: String!, $endTime: String!) {
    createAvailability(dayOfWeek: $dayOfWeek, startTime: $startTime, endTime: $endTime) {
      id
      dayOfWeek
      startTime
      endTime
    }
  }
`

export const DELETE_AVAILABILITY = gql`
  mutation DeleteAvailability($id: ID!) {
    deleteAvailability(id: $id)
  }
`

export const MY_MATCHES = gql`
  query MyMatches {
    myMatches {
      id
      userId1
      userId2
      score
      reasons
    }
  }
`

export const MY_SESSIONS = gql`
  query MySessions {
    mySessions {
      id
      title
      topic
      creatorId
      dateTime
      duration
      sessionType
      meetingLink
      location
      maxParticipants
      status
      invitedUserIds
      participants {
        id
        sessionId
        userId
        joinedAt
        user {
          id
          name
          email
          university
          academicYear
        }
      }
    }
  }
`

export const CREATE_SESSION = gql`
  mutation CreateSession(
    $title: String!
    $topic: String!
    $dateTime: String!
    $duration: Int!
    $sessionType: String!
    $meetingLink: String
    $location: String
    $maxParticipants: Int
    $invitedUserIds: [ID!]
    $knowledgeLevel: Int
  ) {
    createSession(
      title: $title
      topic: $topic
      dateTime: $dateTime
      duration: $duration
      sessionType: $sessionType
      meetingLink: $meetingLink
      location: $location
      maxParticipants: $maxParticipants
      invitedUserIds: $invitedUserIds
      knowledgeLevel: $knowledgeLevel
    ) {
      id
      title
      topic
      creatorId
      dateTime
      duration
      sessionType
      meetingLink
      location
      maxParticipants
      status
      invitedUserIds
      participants {
        id
        sessionId
        userId
        joinedAt
        user {
          id
          name
          email
          university
          academicYear
        }
      }
    }
  }
`

export const JOIN_SESSION = gql`
  mutation JoinSession($sessionId: ID!) {
    joinSession(sessionId: $sessionId) {
      id
      sessionId
      userId
      joinedAt
    }
  }
`

export const LEAVE_SESSION = gql`
  mutation LeaveSession($sessionId: ID!) {
    leaveSession(sessionId: $sessionId)
  }
`

export const CANCEL_SESSION = gql`
  mutation CancelSession($sessionId: ID!) {
    cancelSession(sessionId: $sessionId) {
      id
      title
      topic
      creatorId
      dateTime
      duration
      sessionType
      meetingLink
      location
      maxParticipants
      status
      invitedUserIds
    }
  }
`

export const MY_NOTIFICATIONS = gql`
  query MyNotifications {
    myNotifications {
      id
      userId
      type
      title
      body
      isRead
      createdAt
    }
  }
`

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`

export const MY_BUDDY_REQUESTS = gql`
  query MyBuddyRequests {
    myBuddyRequests {
      id
      senderId
      receiverId
      status
      createdAt
      sender {
        id
        email
        name
        university
        academicYear
      }
    }
  }
`

export const SEND_BUDDY_REQUEST = gql`
  mutation SendBuddyRequest($receiverId: ID!) {
    sendBuddyRequest(receiverId: $receiverId) {
      id
      senderId
      receiverId
      status
      createdAt
    }
  }
`

export const ACCEPT_BUDDY_REQUEST = gql`
  mutation AcceptBuddyRequest($requestId: ID!) {
    acceptBuddyRequest(requestId: $requestId) {
      id
      status
    }
  }
`

export const DECLINE_BUDDY_REQUEST = gql`
  mutation DeclineBuddyRequest($requestId: ID!) {
    declineBuddyRequest(requestId: $requestId) {
      id
      status
    }
  }
`

export const MY_BUDDIES = gql`
  query MyBuddies {
    myBuddies {
      id
      name
      email
      university
      academicYear
    }
  }
`

export const MY_CONVERSATIONS = gql`
  query MyConversations {
    myConversations {
      id
      participantIds
      updatedAt
      lastMessage {
        id
        conversationId
        senderId
        content
        isRead
        createdAt
      }
    }
  }
`

export const CONVERSATION_MESSAGES = gql`
  query ConversationMessages($conversationId: ID!) {
    conversationMessages(conversationId: $conversationId) {
      id
      conversationId
      senderId
      content
      isRead
      createdAt
    }
  }
`

export const CREATE_CONVERSATION = gql`
  mutation CreateConversation($targetUserId: ID!) {
    createConversation(targetUserId: $targetUserId) {
      id
      participantIds
      updatedAt
    }
  }
`

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      id
      name
      email
      university
      academicYear
    }
  }
`

export const DISMISS_MATCH = gql`
  mutation DismissMatch($matchedUserId: ID!) {
    dismissMatch(matchedUserId: $matchedUserId)
  }
`

export const DELETE_USER = gql`
  mutation DeleteUser {
    deleteUser
  }
`

export const UPDATE_SESSION = gql`
  mutation UpdateSession(
    $sessionId: ID!
    $title: String
    $topic: String
    $dateTime: String
    $duration: Int
    $meetingLink: String
    $location: String
    $invitedUserIds: [ID!]
    $removeUserIds: [ID!]
    $addUserIds: [ID!]
  ) {
    updateSession(
      sessionId: $sessionId
      title: $title
      topic: $topic
      dateTime: $dateTime
      duration: $duration
      meetingLink: $meetingLink
      location: $location
      invitedUserIds: $invitedUserIds
      removeUserIds: $removeUserIds
      addUserIds: $addUserIds
    ) {
      id
      title
      topic
      creatorId
      dateTime
      duration
      sessionType
      meetingLink
      location
      maxParticipants
      knowledgeLevel
      status
      invitedUserIds
      participants {
        id
        sessionId
        userId
        joinedAt
        user {
          id
          name
          email
          university
          academicYear
        }
      }
    }
  }
`

export const REMOVE_BUDDY = gql`
  mutation RemoveBuddy($contactUserId: ID!) {
    removeBuddy(contactUserId: $contactUserId)
  }
`

export const SEND_MESSAGE = gql`
  mutation SendMessage($conversationId: ID, $targetUserId: ID, $content: String!) {
    sendMessage(conversationId: $conversationId, targetUserId: $targetUserId, content: $content) {
      id
      conversationId
      senderId
      content
      isRead
      createdAt
    }
  }
`
