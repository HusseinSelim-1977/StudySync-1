// Seed script: populates StudySync with real users, profiles, buddy requests, and sessions.
// Run AFTER docker compose up — requires gateway at localhost:4000.
// Usage: node scripts/seed.js

const GATEWAY = process.env.GATEWAY_URL || 'http://localhost:4000';

const gql = async (query, variables = {}) => {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map(e => e.message).join(', '));
  return json.data;
};

const users = [
  { name: 'Emma Chen', email: 'emma@uni.edu', password: 'pass123', university: 'GIU Cairo', year: 'Year 3', courses: ['Calculus II', 'Linear Algebra', 'Data Structures', 'Physics I'], topics: ['Machine Learning', 'Algorithms', 'Quantum Physics'], pace: 'Moderate', mode: 'Online', size: 'Small Group (3\u20135)', styles: ['Discussing', 'Problem Solving'], knowledgeLevel: 70 },
  { name: 'Omar Hassan', email: 'omar@uni.edu', password: 'pass123', university: 'GIU Cairo', year: 'Year 2', courses: ['Calculus I', 'Programming Fundamentals', 'Discrete Math', 'Physics I'], topics: ['Web Development', 'Algorithms', 'Database'], pace: 'Fast-paced', mode: 'In-Person', size: '1-on-1', styles: ['Writing Notes', 'Quiet Study'], knowledgeLevel: 45 },
  { name: 'Lena Weber', email: 'lena@uni.edu', password: 'pass123', university: 'GIU Cairo', year: 'Year 4', courses: ['Machine Learning', 'Data Structures', 'Linear Algebra', 'Algorithms'], topics: ['Machine Learning', 'Computer Vision', 'NLP'], pace: 'Moderate', mode: 'Either', size: 'Small Group (3\u20135)', styles: ['Problem Solving', 'Discussing', 'Listening'], knowledgeLevel: 85 },
  { name: 'Ali Rahman', email: 'ali@uni.edu', password: 'pass123', university: 'GIU Cairo', year: 'Graduate', courses: ['Machine Learning', 'Advanced Algorithms', 'Research Methods', 'Quantum Computing'], topics: ['Machine Learning', 'Quantum Physics', 'Algorithms', 'AI Ethics'], pace: 'Slow & Thorough', mode: 'Online', size: 'Large Group (6+)', styles: ['Discussing', 'Problem Solving', 'Writing Notes'], knowledgeLevel: 90 },
  { name: 'Sara Kim', email: 'sara@uni.edu', password: 'pass123', university: 'GIU Cairo', year: 'Year 3', courses: ['Data Structures', 'Algorithms', 'Computer Networks', 'Operating Systems'], topics: ['Backend', 'Distributed Systems', 'Cyber Security'], pace: 'Fast-paced', mode: 'Online', size: 'Small Group (3\u20135)', styles: ['Problem Solving', 'Quiet Study'], knowledgeLevel: 60 },
  { name: 'Yuki Tanaka', email: 'yuki@uni.edu', password: 'pass123', university: 'GIU Cairo', year: 'Year 2', courses: ['Calculus I', 'Linear Algebra', 'Programming Fundamentals', 'Physics I'], topics: ['Game Development', 'Algorithms', 'Computer Graphics'], pace: 'Moderate', mode: 'In-Person', size: '1-on-1', styles: ['Listening', 'Writing Notes'], knowledgeLevel: 35 },
];

const days = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

const availSlots = [
  [{ day: 1, start: '10:00', end: '12:00' }, { day: 3, start: '14:00', end: '16:00' }, { day: 5, start: '09:00', end: '11:00' }],
  [{ day: 0, start: '08:00', end: '10:00' }, { day: 2, start: '10:00', end: '12:00' }, { day: 4, start: '13:00', end: '15:00' }],
  [{ day: 1, start: '09:00', end: '11:00' }, { day: 3, start: '15:00', end: '17:00' }, { day: 6, start: '10:00', end: '14:00' }],
  [{ day: 2, start: '14:00', end: '16:00' }, { day: 4, start: '10:00', end: '12:00' }, { day: 5, start: '14:00', end: '18:00' }],
  [{ day: 0, start: '10:00', end: '12:00' }, { day: 2, start: '13:00', end: '15:00' }, { day: 4, start: '09:00', end: '11:00' }],
  [{ day: 1, start: '14:00', end: '16:00' }, { day: 3, start: '08:00', end: '10:00' }, { day: 5, start: '11:00', end: '13:00' }],
];

const dayNames = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];

async function main() {
  console.log('Seeding StudySync...\n');
  const created = [];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];

    let userId, token;
    try {
      console.log(`[${i + 1}/${users.length}] Registering ${u.name} (${u.email})...`);
      const registerData = await gql(`
        mutation Register($email: String!, $password: String!, $name: String!, $university: String, $academicYear: String, $contactEmail: String) {
          register(email: $email, password: $password, name: $name, university: $university, academicYear: $academicYear, contactEmail: $contactEmail) {
            id email name university academicYear
          }
        }
      `, {
        email: u.email,
        password: u.password,
        name: u.name,
        university: u.university,
        academicYear: u.year,
        contactEmail: u.email,
      });
      userId = registerData.register.id;
      console.log(`  \u2714 Created user ${userId}`);
    } catch (e) {
      console.log(`  \u2192 User exists, logging in...`);
      const loginData = await gql(`
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) { token userId }
        }
      `, { email: u.email, password: u.password });
      userId = loginData.login.userId;
      token = loginData.login.token;
      created.push(userId);
      continue;
    }

    created.push(userId);

    const loginData = await gql(`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) { token userId }
      }
    `, { email: u.email, password: u.password });
    token = loginData.login.token;

    const authFetch = async (query, variables = {}) => {
      const res = await fetch(GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors.map(e => e.message).join(', '));
      return json.data;
    };

    // Update profile (courses, topics, preferences)
    const studyStyle = u.styles[0] || 'Discussing';
    await authFetch(`
      mutation UpdateProfile($courses: [String], $topics: [String], $studyPace: String, $studyMode: String, $groupSize: Int, $studyStyle: String) {
        updateProfile(courses: $courses, topics: $topics, studyPace: $studyPace, studyMode: $studyMode, groupSize: $groupSize, studyStyle: $studyStyle) { id }
      }
    `, {
      courses: u.courses,
      topics: u.topics,
      studyPace: u.pace,
      studyMode: u.mode,
      groupSize: parseInt(u.size, 10) || 3,
      studyStyle,
    });
    console.log(`  \u2714 Profile set`);

    // Set availability
    const slots = availSlots[i];
    for (const slot of slots) {
      await authFetch(`
        mutation CreateAvailability($dayOfWeek: String!, $startTime: String!, $endTime: String!) {
          createAvailability(dayOfWeek: $dayOfWeek, startTime: $startTime, endTime: $endTime) { id }
        }
      `, {
        dayOfWeek: dayNames[slot.day],
        startTime: slot.start,
        endTime: slot.end,
      });
    }
    console.log(`  \u2714 ${slots.length} availability slots set`);
  }

  // Login as Emma to send buddy requests to others
  console.log('\n--- Sending buddy requests ---');
  const emmaLogin = await gql(`
    mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) { token }
    }
  `, { email: 'emma@uni.edu', password: 'pass123' });
  const emmaToken = emmaLogin.login.token;

  const emmaFetch = async (query, variables = {}) => {
    const res = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${emmaToken}` },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(json.errors.map(e => e.message).join(', '));
    return json.data;
  };

  // Get all users
  const searchData = await emmaFetch(`
    query SearchUsers($query: String!) { searchUsers(query: $query) { id name } }
  `, { query: 'un' });

  const allUsers = searchData.searchUsers.filter(u => u.id !== created[0]);
  for (const u of allUsers) {
    await emmaFetch(`
      mutation SendBuddyRequest($receiverId: ID!) { sendBuddyRequest(receiverId: $receiverId) { id } }
    `, { receiverId: u.id });
    console.log(`  \u2714 Buddy request sent to ${u.name}`);
  }

  // Accept some buddy requests on behalf of other users
  console.log('\n--- Accepting buddy requests ---');
  for (let i = 1; i < Math.min(4, users.length); i++) {
    const u = users[i];
    const loginResp = await gql(`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) { token }
      }
    `, { email: u.email, password: u.password });
    const uToken = loginResp.login.token;

    const uFetch = async (query, variables = {}) => {
      const res = await fetch(GATEWAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${uToken}` },
        body: JSON.stringify({ query, variables }),
      });
      const json = await res.json();
      if (json.errors) throw new Error(json.errors.map(e => e.message).join(', '));
      return json.data;
    };

    const reqData = await uFetch(`
      query MyBuddyRequests { myBuddyRequests { id senderId } }
    `);
    for (const req of (reqData.myBuddyRequests || []).slice(0, 2)) {
      await uFetch(`
        mutation AcceptBuddyRequest($requestId: ID!) { acceptBuddyRequest(requestId: $requestId) { id } }
      `, { requestId: req.id });
      console.log(`  \u2714 ${u.name} accepted request`);
    }
  }

  // Create a study session as Emma
  console.log('\n--- Creating study session ---');
  const buddiesData = await emmaFetch(`
    query MyBuddies { myBuddies { id name } }
  `);
  const buddyIds = (buddiesData.myBuddies || []).slice(0, 2).map(b => b.id);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  await emmaFetch(`
    mutation CreateSession($title: String!, $topic: String!, $dateTime: String!, $duration: Int!, $sessionType: String!, $invitedUserIds: [ID!], $knowledgeLevel: Int) {
      createSession(title: $title, topic: $topic, dateTime: $dateTime, duration: $duration, sessionType: $sessionType, invitedUserIds: $invitedUserIds, knowledgeLevel: $knowledgeLevel) { id }
    }
  `, {
    title: 'Calculus II Review',
    topic: 'Calculus II',
    dateTime: `${dateStr}T14:00:00`,
    duration: 90,
    sessionType: 'ONLINE',
    invitedUserIds: buddyIds,
    knowledgeLevel: 70,
  });
  console.log('  \u2714 Study session created');

  console.log('\n\u2728 Seeding complete!');
  console.log('Users created:');
  users.forEach(u => console.log(`  ${u.email} / ${u.password}`));
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
