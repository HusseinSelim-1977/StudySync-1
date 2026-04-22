const API_URL = window.ENV_API_URL || "http://localhost:4000/graphql";

const state = {
  token: localStorage.getItem("studySyncToken"),
  user: null,
  profile: null,
  matches: [],
  sessions: [],
  notifications: [],
  conversations: [],
  currentConversationId: null,
  availabilitySlots: [],
  buddyRequests: [],
  buddies: [],
  currentMatchUserId: null
};

// ═══════════════════════════════════════════════════════════════
// GQL CLIENT
// ═══════════════════════════════════════════════════════════════

async function gql(query, variables = {}, requireAuth = true) {
  if (requireAuth && !state.token) throw new Error("Not authenticated");

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(state.token && { Authorization: `Bearer ${state.token}` })
    },
    body: JSON.stringify({ query, variables })
  });

  const json = await res.json();
  if (json.errors) {
    console.error(json.errors);
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

function setToken(token) {
  state.token = token;
  localStorage.setItem("studySyncToken", token);
}

function doLogout() {
  state.token = null;
  localStorage.removeItem("studySyncToken");
  go("login");
  toast("Logged out", "info");
}

async function handleLogin() {
  const container = document.getElementById("pg-login");
  const email = container.querySelector('input[type="email"]').value;
  const password = container.querySelector('input[type="password"]').value;

  try {
    const data = await gql(`
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
          userId
        }
      }
    `, { email, password }, false);

    setToken(data.login.token);
    await loadCurrentUser();
    go("dashboard");
    toast("Logged in successfully", "success");
  } catch (err) {
    toast(err.message, "error");
  }
}

async function handleRegister() {
  const container = document.getElementById("pg-register");
  const inputs = container.querySelectorAll("input, select");

  const firstName = inputs[0].value;
  const lastName = inputs[1].value;
  const email = inputs[2].value;
  const university = inputs[3].value;
  const major = inputs[4].value;
  const academicYear = inputs[5].value;
  const contactPhone = inputs[6].value;
  const password = inputs[7].value;

  try {
    await gql(`
      mutation Register(
        $email: String!
        $password: String!
        $name: String!
        $university: String
        $academicYear: String
        $contactPhone: String
      ) {
        register(
          email: $email
          password: $password
          name: $name
          university: $university
          academicYear: $academicYear
          contactPhone: $contactPhone
        ) {
          id
        }
      }
    `, {
      email,
      password,
      name: `${firstName} ${lastName}`,
      university,
      academicYear,
      contactPhone
    }, false);

    toast("Account created! Please log in", "success");
    go("login");
  } catch (err) {
    toast(err.message, "error");
  }
}

// ═══════════════════════════════════════════════════════════════
// USER
// ═══════════════════════════════════════════════════════════════

async function loadCurrentUser() {
  try {
    const data = await gql(`
      query {
        me {
          id
          name
          email
          university
          academicYear
        }
      }
    `);
    state.user = data.me;
  } catch (err) {
    console.error("Auth failed:", err);
    doLogout();
  }
}

async function loadProfile() {
  try {
    const data = await gql(`
      query {
        myProfile {
          id
          courses
          topics
          studyPace
          studyMode
          groupSize
          studyStyle
        }
      }
    `);
    state.profile = data.myProfile || {};
    return state.profile;
  } catch (err) {
    console.error("Load profile failed:", err);
    state.profile = {};
    return {};
  }
}

async function saveProfileInfo() {
  const tab = document.getElementById("ptab-info");
  if (!tab) return;

  const inputs = tab.querySelectorAll("input, select");
  const name = inputs[0]?.value;
  const university = inputs[1]?.value;
  const academicYear = inputs[2]?.value;
  const contactPhone = inputs[3]?.value;

  try {
    await gql(`
      mutation UpdateUser(
        $name: String
        $university: String
        $academicYear: String
        $contactPhone: String
      ) {
        updateUser(
          name: $name
          university: $university
          academicYear: $academicYear
          contactPhone: $contactPhone
        ) {
          id
        }
      }
    `, { name, university, academicYear, contactPhone });

    toast("Profile info updated successfully", "success");
    await loadCurrentUser();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function saveProfilePreferences() {
  const tab = document.getElementById("ptab-prefs");
  if (!tab) return;

  const paceCard = tab.querySelector(".pref-card.on[onclick*='pace']");
  const pace = paceCard ? paceCard.querySelector(".pref-label")?.textContent.trim() : null;
  
  const modeCard = tab.querySelector(".pref-card.on[onclick*='mode']");
  const mode = modeCard ? modeCard.querySelector(".pref-label")?.textContent.trim() : null;
  
  const groupSize = parseInt(tab.querySelector("#profile-group-sz")?.value || "2");
  
  // Get all selected style cards and take only the first one (backend expects single enum value)
  const styleCard = tab.querySelector(".pref-card.on[onclick*='style']");
  const studyStyle = styleCard ? styleCard.querySelector(".pref-label")?.textContent.trim() : null;

  try {
    await gql(`
      mutation UpdateProfile(
        $studyPace: String
        $studyMode: String
        $groupSize: Int
        $studyStyle: String
      ) {
        updateProfile(
          studyPace: $studyPace
          studyMode: $studyMode
          groupSize: $groupSize
          studyStyle: $studyStyle
        ) {
          id
        }
      }
    `, { studyPace: pace, studyMode: mode, groupSize, studyStyle });

    toast("Study preferences updated successfully", "success");
  } catch (err) {
    toast(err.message, "error");
  }
}

async function saveProfileCourses() {
  const tab = document.getElementById("ptab-courses");
  if (!tab) return;

  const courseChips = tab.querySelectorAll(".chip.on");
  const courses = Array.from(courseChips).map(c => c.textContent.trim());

  try {
    await gql(`
      mutation UpdateProfile($courses: [String]) {
        updateProfile(courses: $courses) {
          id
        }
      }
    `, { courses });

    toast("Courses updated successfully", "success");
  } catch (err) {
    toast(err.message, "error");
  }
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

async function loadDashboard() {
  try {
    await Promise.all([loadMatches(), loadSessions(), loadNotifications()]);
  } catch (err) {
    console.error(err);
    toast("Failed to load dashboard", "error");
  }
}

// ═══════════════════════════════════════════════════════════════
// MATCHES
// ═══════════════════════════════════════════════════════════════

async function loadMatches() {
  try {
    const data = await gql(`
      query {
        myMatches {
          id
          userId1
          userId2
          score
          reasons
        }
      }
    `);
    state.matches = data.myMatches || [];
    
    // Store matches for later use
    return state.matches;
  } catch (err) {
    console.error("Load matches failed:", err);
    state.matches = [];
    return [];
  }
}

async function sendReq(receiverId, name) {
  if (!receiverId) {
    toast("Unable to send request - user ID missing", "error");
    return;
  }

  try {
    await gql(`
      mutation SendBuddyRequest($receiverId: ID!) {
        sendBuddyRequest(receiverId: $receiverId) {
          id
          status
        }
      }
    `, { receiverId });
    
    toast(`Buddy request sent to ${name}`, "success");
  } catch (err) {
    toast(err.message, "error");
  }
}

async function acceptReq(requestId, name) {
  if (!requestId) {
    toast("Unable to accept request - request ID missing", "error");
    return;
  }

  try {
    await gql(`
      mutation AcceptBuddyRequest($requestId: ID!) {
        acceptBuddyRequest(requestId: $requestId) {
          id
          status
        }
      }
    `, { requestId });
    
    toast(`Accepted buddy request from ${name}`, "success");
    await loadBuddyRequests();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function loadBuddyRequests() {
  try {
    const data = await gql(`
      query {
        myBuddyRequests {
          id
          senderId
          status
          createdAt
          sender {
            id
            name
            email
            university
            academicYear
          }
        }
      }
    `);
    state.buddyRequests = data.myBuddyRequests || [];
  } catch (err) {
    console.error("Load buddy requests failed:", err);
    state.buddyRequests = [];
  }
}

async function loadBuddies() {
  try {
    const data = await gql(`
      query {
        myBuddies {
          id
          name
          email
          university
          academicYear
        }
      }
    `);
    state.buddies = data.myBuddies || [];
  } catch (err) {
    console.error("Load buddies failed:", err);
    state.buddies = [];
  }
}

async function loadMatchDetail(userId) {
  if (!userId) {
    toast("User ID missing", "error");
    return null;
  }

  try {
    const data = await gql(`
      query GetUser($id: ID!) {
        getUser(id: $id) {
          id
          name
          email
          university
          academicYear
        }
      }
    `, { id: userId });
    
    return data.getUser;
  } catch (err) {
    console.error("Load match detail failed:", err);
    toast("Failed to load user profile", "error");
    return null;
  }
}

function goToMatchDetail(userId) {
  state.currentMatchUserId = userId;
  go("match-detail");
}

// ═══════════════════════════════════════════════════════════════
// SESSIONS
// ═══════════════════════════════════════════════════════════════

async function loadSessions() {
  try {
    const data = await gql(`
      query {
        mySessions {
          id
          title
          topic
          dateTime
          duration
          sessionType
          meetingLink
          location
          maxParticipants
          status
        }
      }
    `);
    state.sessions = data.mySessions || [];
  } catch (err) {
    console.error("Load sessions failed:", err);
    state.sessions = [];
  }
}

async function createSession() {
  const container = document.getElementById("pg-create-session");
  const inputs = container.querySelectorAll("input, select, textarea");

  const title = inputs[0].value;
  const topic = inputs[1].value;
  const date = inputs[2].value;
  const time = inputs[3].value;
  const duration = parseInt(inputs[4].value.split(" ")[0]) * 60;

  const sessionType = document.getElementById("type-online").classList.contains("on") ? "ONLINE" : "INPERSON";
  const meetingLink = sessionType === "ONLINE" ? inputs[5].value : null;
  const location = sessionType === "INPERSON" ? inputs[6].value : null;

  const dateTime = `${date}T${time}:00Z`;

  // Collect invited buddies
  const inviteCheckboxes = container.querySelectorAll('input[type="checkbox"]:checked');
  const invitedUserIds = Array.from(inviteCheckboxes)
    .map(cb => cb.getAttribute('data-user-id'))
    .filter(Boolean);

  try {
    await gql(`
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
        ) {
          id
        }
      }
    `, { title, topic, dateTime, duration, sessionType, meetingLink, location, maxParticipants: 10, invitedUserIds });

    toast("Session created! Kafka event published", "success");
    go("sessions");
    await loadSessions();
  } catch (err) {
    toast(err.message, "error");
  }
}

function pickSessionType(type) {
  document.getElementById("type-online").classList.toggle("on", type === "online");
  document.getElementById("type-inperson").classList.toggle("on", type === "inperson");
  document.getElementById("f-online").style.display = type === "online" ? "block" : "none";
  document.getElementById("f-location").style.display = type === "inperson" ? "block" : "none";
}

async function finishSetup() {
  let hasErrors = false;

  // Collect profile data from profile-setup page
  const setupPage = document.getElementById("pg-profile-setup");
  if (setupPage) {
    const bio = setupPage.querySelector("textarea")?.value || "";
    const courseChips = setupPage.querySelectorAll("#chips-courses .chip.on");
    const courses = Array.from(courseChips).map(c => c.textContent.trim());
    const topicChips = setupPage.querySelectorAll(".chips .chip.on");
    const topics = Array.from(topicChips).map(c => c.textContent.trim()).filter(t => !courses.includes(t));

    try {
      await gql(`
        mutation UpdateProfile($courses: [String], $topics: [String]) {
          updateProfile(courses: $courses, topics: $topics) {
            id
          }
        }
      `, { courses, topics });
    } catch (err) {
      console.error("Profile update failed:", err);
      toast(`Failed to save profile: ${err.message}`, "error");
      hasErrors = true;
    }
  }

  // Collect study preferences from study-prefs page
  const prefsPage = document.getElementById("pg-study-prefs");
  if (prefsPage) {
    const paceCard = prefsPage.querySelector(".pref-card.on[onclick*='pace']");
    const pace = paceCard ? paceCard.querySelector(".pref-label")?.textContent.trim() : null;
    
    const modeCard = prefsPage.querySelector(".pref-card.on[onclick*='mode']");
    const mode = modeCard ? modeCard.querySelector(".pref-label")?.textContent.trim() : null;
    
    const groupSize = parseInt(prefsPage.querySelector("#group-sz")?.value || "2");
    
    // Get only first selected style (backend expects single enum value)
    const styleCard = prefsPage.querySelector(".pref-card.on[onclick*='style']");
    const studyStyle = styleCard ? styleCard.querySelector(".pref-label")?.textContent.trim() : null;

    try {
      await gql(`
        mutation UpdateProfile(
          $studyPace: String
          $studyMode: String
          $groupSize: Int
          $studyStyle: String
        ) {
          updateProfile(
            studyPace: $studyPace
            studyMode: $studyMode
            groupSize: $groupSize
            studyStyle: $studyStyle
          ) {
            id
          }
        }
      `, { studyPace: pace, studyMode: mode, groupSize, studyStyle });
    } catch (err) {
      console.error("Preferences update failed:", err);
      toast(`Failed to save preferences: ${err.message}`, "error");
      hasErrors = true;
    }
  }

  // Collect availability slots from availability page
  const availPage = document.getElementById("pg-availability");
  if (availPage) {
    const selectedCells = availPage.querySelectorAll(".avail-cell.on");
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayMap = { "Mon": "MONDAY", "Tue": "TUESDAY", "Wed": "WEDNESDAY", "Thu": "THURSDAY", "Fri": "FRIDAY", "Sat": "SATURDAY", "Sun": "SUNDAY" };
    const times = ["8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM", "8PM"];
    const timeMap = {
      "8AM": "08:00", "9AM": "09:00", "10AM": "10:00", "11AM": "11:00",
      "12PM": "12:00", "1PM": "13:00", "2PM": "14:00", "3PM": "15:00",
      "4PM": "16:00", "5PM": "17:00", "6PM": "18:00", "7PM": "19:00",
      "8PM": "20:00", "9PM": "21:00"
    };
    
    const slots = [];
    selectedCells.forEach(cell => {
      const dayIndex = parseInt(cell.getAttribute("data-day-index"));
      const timeIndex = parseInt(cell.getAttribute("data-time-index"));
      
      if (dayIndex >= 0 && dayIndex < days.length && timeIndex >= 0 && timeIndex < times.length) {
        const shortDay = days[dayIndex];
        const startTimeLabel = times[timeIndex];
        const endTimeLabel = times[timeIndex + 1] || "9PM";
        
        slots.push({
          dayOfWeek: dayMap[shortDay],  // Convert to backend enum format
          startTime: timeMap[startTimeLabel],  // Convert to 24-hour format
          endTime: timeMap[endTimeLabel]
        });
      }
    });

    for (const slot of slots) {
      try {
        await gql(`
          mutation CreateAvailability(
            $dayOfWeek: String!
            $startTime: String!
            $endTime: String!
          ) {
            createAvailability(
              dayOfWeek: $dayOfWeek
              startTime: $startTime
              endTime: $endTime
            ) {
              id
            }
          }
        `, slot);
      } catch (err) {
        console.error("Availability slot creation failed:", err);
        toast(`Failed to save availability: ${err.message}`, "error");
        hasErrors = true;
        break; // Stop on first availability error
      }
    }
  }

  if (hasErrors) {
    toast("Setup completed with some errors. Please check your data.", "error");
  } else {
    toast("Profile setup complete! Finding matches...", "success");
  }
  
  go("dashboard");
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

async function loadNotifications() {
  try {
    const data = await gql(`
      query {
        myNotifications {
          id
          type
          title
          body
          isRead
          createdAt
        }
      }
    `);
    state.notifications = data.myNotifications || [];
  } catch (err) {
    console.error("Load notifications failed:", err);
    state.notifications = [];
  }
}

async function markAllRead() {
  try {
    await gql(`
      mutation {
        markAllNotificationsRead
      }
    `);
    toast("All notifications marked as read", "success");
    await loadNotifications();
  } catch (err) {
    toast(err.message, "error");
  }
}

async function markOneRead(btn) {
  const notifItem = btn.closest(".notif-item");
  notifItem.classList.remove("unread");
  toast("Notification dismissed", "info");
}

// ═══════════════════════════════════════════════════════════════
// MESSAGING
// ═══════════════════════════════════════════════════════════════

async function loadConversations() {
  try {
    const data = await gql(`
      query {
        myConversations {
          id
          participantIds
          updatedAt
          lastMessage {
            id
            content
            createdAt
          }
        }
      }
    `);
    state.conversations = data.myConversations || [];
  } catch (err) {
    console.error("Load conversations failed:", err);
    state.conversations = [];
  }
}

async function loadMessages(conversationId) {
  try {
    const data = await gql(`
      query ConversationMessages($conversationId: ID!) {
        conversationMessages(conversationId: $conversationId) {
          id
          senderId
          content
          isRead
          createdAt
        }
      }
    `, { conversationId });
    
    const msgs = document.getElementById("chat-msgs");
    if (msgs) {
      msgs.innerHTML = "";
      (data.conversationMessages || []).forEach(msg => {
        const bubble = document.createElement("div");
        const isMe = msg.senderId === state.user?.id;
        bubble.style.cssText = "display:flex;flex-direction:column;gap:3px;" + (isMe ? "align-items:flex-end" : "align-items:flex-start");
        bubble.innerHTML = `
          <div class="bubble ${isMe ? 'me' : 'them'}">${msg.content}</div>
          <div class="bubble-time" style="text-align:${isMe ? 'right' : 'left'}">${new Date(msg.createdAt).toLocaleTimeString()}</div>
        `;
        msgs.appendChild(bubble);
      });
      msgs.scrollTop = msgs.scrollHeight;
    }
  } catch (err) {
    console.error("Load messages failed:", err);
  }
}

async function sendMsg() {
  const input = document.getElementById("msg-in");
  const content = input.value.trim();
  if (!content) return;

  try {
    await gql(`
      mutation SendMessage($content: String!, $conversationId: ID) {
        sendMessage(content: $content, conversationId: $conversationId) {
          id
        }
      }
    `, { content, conversationId: state.currentConversationId });

    const msgs = document.getElementById("chat-msgs");
    const bubble = document.createElement("div");
    bubble.style.cssText = "display:flex;flex-direction:column;gap:3px;align-items:flex-end";
    bubble.innerHTML = `
      <div class="bubble me">${content}</div>
      <div class="bubble-time" style="text-align:right">${new Date().toLocaleTimeString()}</div>
    `;
    msgs.appendChild(bubble);
    msgs.scrollTop = msgs.scrollHeight;

    input.value = "";
  } catch (err) {
    toast(err.message, "error");
  }
}

// ═══════════════════════════════════════════════════════════════
// AVAILABILITY
// ═══════════════════════════════════════════════════════════════

async function initAvailabilityGrid() {
  const grid = document.getElementById("avail-grid");
  if (!grid) return;

  const days = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const times = ["8AM", "9AM", "10AM", "11AM", "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM", "8PM"];

  grid.innerHTML = "";

  // Create header row
  days.forEach(day => {
    const cell = document.createElement("div");
    cell.className = "avail-cell hdr";
    cell.textContent = day;
    grid.appendChild(cell);
  });

  // Create time rows with cells
  times.forEach((time, timeIndex) => {
    const cell = document.createElement("div");
    cell.className = "avail-cell hdr";
    cell.textContent = time;
    grid.appendChild(cell);

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const slot = document.createElement("div");
      slot.className = "avail-cell";
      slot.setAttribute("data-day-index", dayIndex);
      slot.setAttribute("data-time-index", timeIndex);
      slot.onclick = () => {
        slot.classList.toggle("on");
        updateAvailCount();
      };
      grid.appendChild(slot);
    }
  });

  // Load existing availability slots
  if (state.token) {
    try {
      const data = await gql(`
        query {
          myAvailability {
            id
            dayOfWeek
            startTime
            endTime
          }
        }
      `);

      const slots = data.myAvailability || [];
      
      // Map backend enum format to frontend short format
      const dayMap = { 
        "MONDAY": 0, "TUESDAY": 1, "WEDNESDAY": 2, "THURSDAY": 3, 
        "FRIDAY": 4, "SATURDAY": 5, "SUNDAY": 6,
        // Also support short format in case backend changes
        "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6
      };
      
      // Map backend 24-hour format to frontend labels
      const timeMap = {
        "08:00": 0, "09:00": 1, "10:00": 2, "11:00": 3,
        "12:00": 4, "13:00": 5, "14:00": 6, "15:00": 7,
        "16:00": 8, "17:00": 9, "18:00": 10, "19:00": 11, "20:00": 12
      };
      
      // Mark existing slots as selected
      slots.forEach(slot => {
        const dayIndex = dayMap[slot.dayOfWeek];
        const timeIndex = timeMap[slot.startTime];
        
        if (dayIndex !== undefined && timeIndex !== undefined) {
          const cell = grid.querySelector(`[data-day-index="${dayIndex}"][data-time-index="${timeIndex}"]`);
          if (cell) {
            cell.classList.add("on");
          }
        }
      });
    } catch (err) {
      console.error("Load availability failed:", err);
      toast("Failed to load availability", "error");
    }
  }

  updateAvailCount();
}

function updateAvailCount() {
  const count = document.querySelectorAll(".avail-cell.on").length;
  const el = document.getElementById("avail-count");
  if (el) el.textContent = `${count} slots selected`;
}

function availClear() {
  document.querySelectorAll(".avail-cell.on").forEach(c => c.classList.remove("on"));
  updateAvailCount();
}

function availMornings() {
  document.querySelectorAll(".avail-cell").forEach((c, i) => {
    if (i > 7 && i < 7 + 5 * 8) c.classList.add("on");
  });
  updateAvailCount();
}

function availAfternoons() {
  document.querySelectorAll(".avail-cell").forEach((c, i) => {
    if (i > 7 + 5 * 8) c.classList.add("on");
  });
  updateAvailCount();
}

// ═══════════════════════════════════════════════════════════════
// UI HELPERS
// ═══════════════════════════════════════════════════════════════

function toggleChip(chip) {
  chip.classList.toggle("on");
}

function pickPref(group, card) {
  card.parentElement.querySelectorAll(".pref-card").forEach(c => c.classList.remove("on"));
  card.classList.add("on");
}

function switchTab(btn, tabId) {
  btn.parentElement.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  const parent = btn.closest(".page");
  parent.querySelectorAll("[id^='tb-']").forEach(t => t.style.display = "none");
  const target = document.getElementById(tabId);
  if (target) target.style.display = "block";
}

function showPTab(tab, link) {
  link.parentElement.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
  link.classList.add("active");

  const parent = link.closest(".page");
  parent.querySelectorAll("[id^='ptab-']").forEach(t => t.style.display = "none");
  const target = document.getElementById(`ptab-${tab}`);
  if (target) target.style.display = "block";
}

function updateGrp(val) {
  const labels = ["Solo", "1-on-1 (2 people)", "Small (3)", "Group (4)", "Group (5)", "Large (6)"];
  const el = document.getElementById("grp-lbl");
  if (el) el.textContent = labels[val - 1] || labels[1];
}

function stopProp(e) {
  e.stopPropagation();
}

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════

function go(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const el = document.getElementById("pg-" + page);
  if (el) el.classList.add("active");

  if (page === "dashboard") loadDashboard();
  if (page === "matching") loadMatches();
  if (page === "sessions") loadSessions();
  if (page === "notifications") loadNotifications();
  if (page === "availability") initAvailabilityGrid();
  if (page === "messages") loadConversations();
  if (page === "connections") loadBuddies();
  if (page === "profile") loadProfile();
  if (page === "match-detail" && state.currentMatchUserId) {
    loadMatchDetail(state.currentMatchUserId);
  }
}

// ═══════════════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════════════

function toast(msg, type = "info") {
  const icons = { success: "✓", info: "ℹ", error: "✗" };
  const c = document.getElementById("toasts");
  if (!c) return;

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;

  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

window.onload = async () => {
  if (state.token) {
    try {
      await loadCurrentUser();
      go("dashboard");
    } catch {
      go("landing");
    }
  } else {
    go("landing");
  }
};
