# How to Run StudySync Project

**Last Updated:** 2026-04-22  
**Architecture:** Microservices + Kafka + PostgreSQL + GraphQL

---

## Prerequisites

### Required Software

1. **Docker Desktop**
   - Download: https://www.docker.com/products/docker-desktop
   - Version: 20.10 or higher
   - Required for: PostgreSQL, Kafka, Zookeeper, all services

2. **Node.js**
   - Download: https://nodejs.org
   - Version: 18.x or higher
   - Required for: Local development (optional)

3. **Git**
   - Download: https://git-scm.com
   - Required for: Cloning repository

### Optional Tools

- **Postman** or **Insomnia** — For testing GraphQL API
- **DBeaver** or **pgAdmin** — For viewing PostgreSQL databases
- **Kafka UI** — Included in docker-compose (http://localhost:8080)

---

## Quick Start (Docker)

### Step 1: Clone Repository

```bash
git clone https://github.com/HusseinSelim-1977/StudySync-1.git
cd StudySync-1
```

### Step 2: Start All Services

```bash
docker-compose up --build
```

**What this does:**
- Builds all Docker images
- Starts PostgreSQL database
- Starts Kafka + Zookeeper
- Starts all 7 microservices
- Starts GraphQL gateway
- Initializes databases with `init.sql`

**Wait for:** All services to show "ready" messages (2-3 minutes)

### Step 3: Open Frontend

Open your browser and navigate to:
```
file:///C:/Projects/StudySync-1/frontend/index.html
```

Or use a local server:
```bash
cd frontend
npx serve .
# Then open http://localhost:3000
```

### Step 4: Test the Application

1. Click "Get Started" or "Sign Up"
2. Fill registration form
3. Login with credentials
4. Complete profile setup
5. Explore dashboard

---

## Service URLs

Once running, access these endpoints:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | `file:///path/to/frontend/index.html` | Main UI |
| **GraphQL Gateway** | http://localhost:4000/graphql | API endpoint |
| **Kafka UI** | http://localhost:8080 | Monitor Kafka topics |
| **PostgreSQL** | `localhost:5432` | Database (user: `user`, pass: `pass`) |
| **Messaging Service** | http://localhost:4007 | REST API (internal) |

---

## Detailed Setup

### Option 1: Docker Compose (Recommended)

**Advantages:**
- One command to start everything
- No local dependencies needed
- Consistent environment
- Easy cleanup

**Steps:**

1. **Build and start:**
   ```bash
   docker-compose up --build
   ```

2. **Run in background (detached mode):**
   ```bash
   docker-compose up -d --build
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **View specific service logs:**
   ```bash
   docker-compose logs -f gateway
   docker-compose logs -f user-service
   ```

5. **Stop all services:**
   ```bash
   docker-compose down
   ```

6. **Stop and remove volumes (reset databases):**
   ```bash
   docker-compose down -v
   ```

### Option 2: Local Development

**Advantages:**
- Faster iteration
- Better debugging
- Hot reload

**Prerequisites:**
- Node.js 18+
- PostgreSQL running locally or in Docker
- Kafka running locally or in Docker

**Steps:**

1. **Start infrastructure (PostgreSQL + Kafka):**
   ```bash
   docker-compose up postgres kafka zookeeper kafka-ui
   ```

2. **Install dependencies for each service:**
   ```bash
   # Gateway
   cd gateway
   npm install
   
   # User Service
   cd ../services/user-service
   npm install
   
   # Repeat for all services...
   ```

3. **Run Prisma migrations:**
   ```bash
   cd services/user-service
   npx prisma generate
   npx prisma migrate dev
   
   # Repeat for all services with Prisma schemas
   ```

4. **Start services (in separate terminals):**
   ```bash
   # Terminal 1: Gateway
   cd gateway
   npm start
   
   # Terminal 2: User Service
   cd services/user-service
   npm start
   
   # Terminal 3: Profile Service
   cd services/profile-service
   npm start
   
   # ... and so on for all services
   ```

5. **Open frontend:**
   ```bash
   cd frontend
   npx serve .
   ```

---

## Troubleshooting

### Issue: Docker containers won't start

**Solution 1: Check Docker is running**
```bash
docker --version
docker ps
```

**Solution 2: Clean up old containers**
```bash
docker-compose down -v
docker system prune -a
docker-compose up --build
```

**Solution 3: Check port conflicts**
```bash
# Check if ports are in use
netstat -ano | findstr :4000
netstat -ano | findstr :5432
netstat -ano | findstr :9092
```

### Issue: Services can't connect to Kafka

**Symptoms:**
- Services show "Kafka connection failed"
- Timeout errors

**Solution:**
```bash
# Wait longer - Kafka takes 30-60 seconds to start
docker-compose logs kafka

# Restart services after Kafka is ready
docker-compose restart user-service profile-service
```

### Issue: Database connection errors

**Symptoms:**
- "Connection refused" errors
- "Database does not exist" errors

**Solution 1: Check PostgreSQL is running**
```bash
docker-compose logs postgres
```

**Solution 2: Verify databases were created**
```bash
docker exec -it postgres psql -U user -c "\l"
```

**Solution 3: Recreate databases**
```bash
docker-compose down -v
docker-compose up --build
```

### Issue: Frontend can't connect to backend

**Symptoms:**
- "Network error" in browser console
- GraphQL queries fail

**Solution 1: Check gateway is running**
```bash
docker-compose logs gateway
curl http://localhost:4000/graphql
```

**Solution 2: Update frontend API URL**

Edit `frontend/index.html` or set environment variable:
```javascript
window.ENV_API_URL = "http://localhost:4000/graphql";
```

**Solution 3: Check CORS settings**

Gateway should allow all origins in development (already configured).

### Issue: Prisma errors

**Symptoms:**
- "Prisma Client not generated"
- "Unknown field" errors

**Solution:**
```bash
cd services/user-service
npx prisma generate
npm start
```

### Issue: Port already in use

**Symptoms:**
- "Port 4000 is already allocated"
- "Address already in use"

**Solution 1: Stop conflicting services**
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

**Solution 2: Change ports in docker-compose.yml**
```yaml
gateway:
  ports:
    - "4001:4000"  # Change external port
```

---

## Verification Steps

### 1. Check All Containers Running

```bash
docker-compose ps
```

**Expected output:**
```
NAME                    STATUS
postgres                Up
zookeeper               Up
kafka                   Up
kafka-ui                Up
gateway                 Up
user-service            Up
profile-service         Up
availability-service    Up
matching-service        Up
session-service         Up
notification-service    Up
messaging-service       Up
```

### 2. Test GraphQL Gateway

**Using curl:**
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __typename }"}'
```

**Expected response:**
```json
{"data":{"__typename":"Query"}}
```

**Using browser:**
Navigate to http://localhost:4000/graphql and run:
```graphql
query {
  __typename
}
```

### 3. Check Kafka Topics

Navigate to http://localhost:8080 (Kafka UI) and verify topics exist:
- REGISTER_USER
- LOGIN_USER
- GET_USER
- UPDATE_PROFILE
- CREATE_AVAILABILITY
- GET_MATCHES
- CREATE_SESSION
- etc.

### 4. Check Databases

```bash
docker exec -it postgres psql -U user -c "\l"
```

**Expected databases:**
- userdb
- profiledb
- availabilitydb
- matchingdb
- sessiondb
- notificationdb
- messagingdb

### 5. Test Frontend

1. Open `frontend/index.html` in browser
2. Click "Get Started"
3. Fill registration form
4. Should see success toast and redirect to login

---

## Development Workflow

### Making Changes to Services

1. **Edit code** in `services/<service-name>/src/`

2. **Rebuild specific service:**
   ```bash
   docker-compose up -d --build user-service
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f user-service
   ```

### Making Changes to Frontend

1. **Edit code** in `frontend/app.js` or `frontend/index.html`

2. **Refresh browser** (no rebuild needed)

### Making Changes to Database Schema

1. **Edit Prisma schema** in `services/<service>/prisma/schema.prisma`

2. **Generate migration:**
   ```bash
   cd services/user-service
   npx prisma migrate dev --name add_new_field
   ```

3. **Rebuild service:**
   ```bash
   docker-compose up -d --build user-service
   ```

### Adding New Kafka Topics

1. **Add to** `shared/kafka/index.js`:
   ```javascript
   TOPICS: {
     MY_NEW_TOPIC: 'MY_NEW_TOPIC'
   }
   ```

2. **Rebuild all services:**
   ```bash
   docker-compose up -d --build
   ```

---

## Testing

### Manual Testing

1. **Register new user:**
   - Open frontend
   - Click "Get Started"
   - Fill form with test data
   - Submit

2. **Login:**
   - Use registered credentials
   - Should redirect to dashboard

3. **Complete profile setup:**
   - Select courses and topics
   - Set study preferences
   - Mark availability slots
   - Click "Complete Setup"

4. **View matches:**
   - Navigate to "Matching" page
   - Should see compatibility scores

5. **Create session:**
   - Navigate to "Sessions"
   - Click "Create Session"
   - Fill form and submit

6. **Send messages:**
   - Navigate to "Messages"
   - Select conversation
   - Send test message

### API Testing with Postman

**Import this collection:**

```json
{
  "info": { "name": "StudySync API" },
  "item": [
    {
      "name": "Register",
      "request": {
        "method": "POST",
        "url": "http://localhost:4000/graphql",
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation Register($email: String!, $password: String!, $name: String!) {\n  register(email: $email, password: $password, name: $name) {\n    id\n    email\n    name\n  }\n}",
            "variables": "{\"email\":\"test@example.com\",\"password\":\"password123\",\"name\":\"Test User\"}"
          }
        }
      }
    },
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "url": "http://localhost:4000/graphql",
        "body": {
          "mode": "graphql",
          "graphql": {
            "query": "mutation Login($email: String!, $password: String!) {\n  login(email: $email, password: $password) {\n    token\n    userId\n  }\n}",
            "variables": "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
          }
        }
      }
    }
  ]
}
```

---

## Production Deployment

### Environment Variables

Create `.env.production` files for each service:

```env
# Gateway
PORT=4000
JWT_SECRET=<strong-secret-here>
KAFKA_BROKERS=<kafka-url>
MESSAGING_SERVICE_URL=<messaging-url>

# Services
USER_DB_URL=<neondb-connection-string>
KAFKA_BROKERS=<kafka-url>
JWT_SECRET=<strong-secret-here>
```

### Docker Compose Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment

See `k8s/` directory for Kubernetes manifests (if available).

---

## Cleanup

### Stop All Services

```bash
docker-compose down
```

### Remove All Data (Reset)

```bash
docker-compose down -v
```

### Remove All Images

```bash
docker-compose down --rmi all
```

### Complete Cleanup

```bash
docker-compose down -v --rmi all
docker system prune -a --volumes
```

---

## Common Commands Reference

```bash
# Start everything
docker-compose up -d --build

# Stop everything
docker-compose down

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f gateway

# Restart specific service
docker-compose restart user-service

# Rebuild specific service
docker-compose up -d --build user-service

# Execute command in container
docker exec -it postgres psql -U user

# Check container status
docker-compose ps

# Check resource usage
docker stats
```

---

## Support

### Check Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f user-service

# Last 100 lines
docker-compose logs --tail=100 gateway
```

### Access Database

```bash
docker exec -it postgres psql -U user -d userdb
```

### Access Kafka

Navigate to http://localhost:8080 for Kafka UI

---

## Next Steps

1. ✅ Start project with `docker-compose up --build`
2. ✅ Open frontend in browser
3. ✅ Register test account
4. ✅ Complete profile setup
5. ✅ Explore all features
6. ✅ Check Kafka UI for events
7. ✅ View database records

---

**Project Status:** ✅ Ready to run  
**Last Updated:** 2026-04-22  
**Maintained By:** Development Team
