# StudySync — How to Run

## 🐳 Share via Docker (1 command)

### Prerequisites

- Docker + Docker Compose
- **NeonDB databases** (7 databases) — create free at [neon.tech](https://neon.tech)

### 1. Clone the repo

```bash
git clone https://github.com/HusseinSelim-1977/StudySync-1.git
cd StudySync-1
```

### 2. Set up `.env` files

The real `.env` files contain NeonDB credentials and are **not in git** (security).

**Option A — Share your existing DB access** (fastest):  
Send the recipient the 9 `.env` files from your working copy:
- `gateway/.env`
- `shared/.env`
- `services/*/.env`

They drop them into the same paths and skip to step 3.

**Option B — Recipient creates their own NeonDB**:  
Each service needs its own PostgreSQL database on Neon:

| Service | DB Name |
|---------|---------|
| user-service | `userdb` |
| profile-service | `profiledb` |
| availability-service | `availabilitydb` |
| matching-service | `matchingdb` |
| session-service | `sessiondb` |
| notification-service | `notificationdb` |
| messaging-service | `messagingdb` |

Copy each `.env.example` to `.env` and fill in the NeonDB connection strings:

```bash
cp gateway/.env.example gateway/.env
cp shared/.env.example shared/.env
for d in services/*/; do cp "$d.env.example" "$d.env"; done
```

Then edit each `.env` with the real NeonDB URL from the Neon dashboard.

### 3. Start everything

```bash
docker compose build
docker compose up -d
```

This starts **12 containers**:

| Container | Role | Port |
|---|---|---|
| `zookeeper` | Kafka coordinator | — |
| `kafka` | Message broker | `9092` |
| `kafka-ui` | Kafka admin UI | `8080` |
| `gateway` | GraphQL API gateway | `4000` |
| `user-service` | Auth & users | — |
| `profile-service` | Study profiles | — |
| `availability-service` | Time slots | — |
| `matching-service` | Compatibility scoring | — |
| `session-service` | Study sessions | — |
| `notification-service` | Push notifications | — |
| `messaging-service` | Chat (HTTP) | `4007` |
| `frontend` | React + Vite app | `5173` |

Each service auto-runs `npx prisma db push` on startup to sync its schema.

### 4. Open the app

Go to **http://localhost:5173**

### 5. Seed data (optional)

```bash
node scripts/seed.js
```

Creates 6 demo users with profiles, availability, buddy requests, and a sample session.

### 6. Verify

```bash
python3 /tmp/e2e_test.py
```

64 integration tests covering auth, profile, availability, matching, sessions, buddy requests, notifications, messaging.

---

## URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| GraphQL Gateway | http://localhost:4000 |
| Kafka UI | http://localhost:8080 |

## Troubleshooting

- **Kafka connection errors** — Normal on first startup. Services auto-retry. Wait ~20s.
- **Port conflicts** — Change host ports in `docker-compose.yml`.
- **Rebuild after changes** — `docker compose build <service> && docker compose up -d <service>`
