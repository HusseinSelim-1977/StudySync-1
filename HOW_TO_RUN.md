# How To Run

## Prerequisites

- Docker + Docker Compose
- Node.js 20+
- All `.env` files must have valid credentials (NeonDB, JWT secret, Kafka brokers)

## Quick Start

### 1. Backend (Docker Compose)

```bash
docker compose build
docker compose up -d
```

This starts 11 containers:

| Container | Role | Port |
|---|---|---|
| `zookeeper` | Kafka coordinator | — |
| `kafka` | Message broker | `9092` |
| `kafka-ui` | Kafka admin UI | `8080` |
| `gateway` | GraphQL API gateway | **`4000`** |
| `user-service` | Auth & users | — |
| `profile-service` | Study profiles | — |
| `availability-service` | Time slots | — |
| `matching-service` | Compatibility scoring | — |
| `session-service` | Study sessions | — |
| `notification-service` | Push notifications | — |
| `messaging-service` | Chat (HTTP) | `4007` |

Each service auto-runs `npx prisma db push` on startup to sync its schema to NeonDB.

### 2. Wait for readiness

Kafka takes ~20s for leader elections. Confirm everything is up:

```bash
docker compose ps                     # all 11 should show "Up"
curl http://localhost:4000/ \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}'      # should return {"data":{"__typename":"Query"}}
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite dev server starts at `http://localhost:5173`. The frontend connects to the GraphQL gateway at `http://localhost:4000/` via Apollo Client.

### 4. Seed data (optional)

```bash
node scripts/seed.js
```

Registers 6 example users (Emma, Omar, Lena, Ali, Sara, Yuki) with courses, topics, study preferences, availability slots, buddy requests, and a sample study session. Login credentials are printed on completion.

### 5. Verify end-to-end

```bash
python3 /tmp/e2e_test.py
```

Runs 56 integration tests through the gateway (auth, profile, availability, matching, sessions, buddy requests, notifications, messaging).

## URLs

| Service | URL |
|---|---|
| GraphQL Gateway | `http://localhost:4000` |
| Kafka UI | `http://localhost:8080` |
| Frontend (Vite) | `http://localhost:5173` |

## Troubleshooting

**Kafka connection errors on startup** — Normal. Services start before Kafka is ready and auto-retry. Check `docker compose logs <service>` — after a few retries they connect.

**Port conflicts** — Change host ports in `docker-compose.yml` (e.g. `"4000:4000"` → `"4001:4000"`).

**Database schema out of sync** — The container CMD already runs `npx prisma db push`. To force a manual sync:

```bash
docker compose exec <service> npx prisma db push
```

**Rebuild after code changes**:

```bash
docker compose build <service>
docker compose up -d <service>
```

Or rebuild everything:

```bash
docker compose build
docker compose up -d
```
