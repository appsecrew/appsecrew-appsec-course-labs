# Local Deployment Guide - Java Inventory Service

## Overview
This guide provides step-by-step instructions for deploying the Java Inventory Service locally using Docker Compose. This setup creates a complete development environment with the application, database, and supporting services.

## Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- Git for cloning the repository
- 8GB+ RAM recommended
- 10GB+ free disk space

## Quick Start

### 1. Clone and Navigate
```bash
git clone <repository-url>
cd labs/lab-01-java-inventory
```

### 2. Start All Services
```bash
docker-compose up -d
```

### 3. Access the Application
- **Application**: http://localhost:8080/inventory
- **Database Admin**: http://localhost:8081 (phpMyAdmin)
- **Application Logs**: `docker-compose logs -f app`

### 4. Default Credentials
- **Admin User**: admin / admin123
- **Manager User**: manager / manager123
- **Employee User**: employee / employee123
- **Database**: inventory_user / inventory_pass

## Detailed Setup

### 1. Environment Configuration

Create `.env` file in the project root:
```bash
# Application Configuration
APP_PORT=8080
APP_PROFILE=local
JAVA_OPTS=-Xms512m -Xmx1024m

# Database Configuration
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=inventory_db
MYSQL_USER=inventory_user
MYSQL_PASSWORD=inventory_pass
MYSQL_PORT=3306

# phpMyAdmin Configuration
PMA_PORT=8081
PMA_HOST=mysql
PMA_USER=root
PMA_PASSWORD=rootpassword

# Security Configuration (Development Only)
JWT_SECRET=dev-secret-key-change-in-production
SESSION_TIMEOUT=30m

# Logging Configuration
LOG_LEVEL=DEBUG
```

### 2. Docker Compose Configuration

The `docker-compose.yml` file defines the following services:

#### Application Service
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: deploy/Dockerfile
    ports:
      - "${APP_PORT:-8080}:8080"
    environment:
      - SPRING_PROFILES_ACTIVE=${APP_PROFILE:-local}
      - SPRING_DATASOURCE_URL=jdbc:mysql://mysql:3306/${MYSQL_DATABASE}
      - SPRING_DATASOURCE_USERNAME=${MYSQL_USER}
      - SPRING_DATASOURCE_PASSWORD=${MYSQL_PASSWORD}
      - JAVA_OPTS=${JAVA_OPTS}
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    networks:
      - inventory-network
    restart: unless-stopped
```

#### MySQL Database Service
```yaml
  mysql:
    image: mysql:8.0
    ports:
      - "${MYSQL_PORT:-3306}:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
      - MYSQL_DATABASE=${MYSQL_DATABASE}
      - MYSQL_USER=${MYSQL_USER}
      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./deploy/mysql/init:/docker-entrypoint-initdb.d
      - ./deploy/mysql/conf:/etc/mysql/conf.d
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
    networks:
      - inventory-network
    restart: unless-stopped
```

#### phpMyAdmin Service
```yaml
  phpmyadmin:
    image: phpmyadmin/phpmyadmin:latest
    ports:
      - "${PMA_PORT:-8081}:80"
    environment:
      - PMA_HOST=${PMA_HOST:-mysql}
      - PMA_USER=${PMA_USER:-root}
      - PMA_PASSWORD=${PMA_PASSWORD}
    depends_on:
      - mysql
    networks:
      - inventory-network
    restart: unless-stopped
```

### 3. Build and Deploy

#### Build Application Image
```bash
# Build the Docker image
docker-compose build app

# Or build with no cache
docker-compose build --no-cache app
```

#### Start Services
```bash
# Start all services in background
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific service
docker-compose up -d mysql
```

#### Verify Deployment
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f mysql

# Check application health
curl http://localhost:8080/inventory/actuator/health
```

## Service Management

### Starting Services
```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d mysql phpmyadmin
docker-compose up -d app
```

### Stopping Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop specific service
docker-compose stop app
```

### Restarting Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart app
```

### Scaling Services
```bash
# Scale application instances
docker-compose up -d --scale app=3
```

## Database Management

### Initial Setup
The database is automatically initialized with:
- Schema creation (tables, indexes, constraints)
- Sample data insertion
- User accounts with different roles
- Audit logging configuration

### Database Access
```bash
# Connect via Docker
docker-compose exec mysql mysql -u inventory_user -p inventory_db

# Connect via host
mysql -h localhost -P 3306 -u inventory_user -p inventory_db

# Root access
docker-compose exec mysql mysql -u root -p
```

### Database Operations
```bash
# Backup database
docker-compose exec mysql mysqldump -u root -p inventory_db > backup.sql

# Restore database
docker-compose exec -T mysql mysql -u root -p inventory_db < backup.sql

# Reset database
docker-compose exec mysql mysql -u root -p -e "DROP DATABASE inventory_db; CREATE DATABASE inventory_db;"
docker-compose restart app
```

### Sample Data
The application includes sample data for testing:

#### Users
| Username | Password | Role | Description |
|----------|----------|------|-------------|
| admin | admin123 | ADMIN | Full system access |
| manager | manager123 | MANAGER | Product and inventory management |
| employee | employee123 | EMPLOYEE | Basic operations |
| viewer | viewer123 | VIEWER | Read-only access |

#### Products
- Electronics: Laptops, Smartphones, Tablets
- Clothing: Shirts, Pants, Shoes
- Books: Technical, Fiction, Non-fiction
- Home & Garden: Furniture, Tools, Appliances

## Monitoring and Logging

### Application Logs
```bash
# View real-time logs
docker-compose logs -f app

# View last 100 lines
docker-compose logs --tail=100 app

# View logs since timestamp
docker-compose logs --since="2023-01-01T00:00:00" app
```

### Database Logs
```bash
# View MySQL logs
docker-compose logs -f mysql

# View slow query log
docker-compose exec mysql tail -f /var/log/mysql/slow.log
```

### System Monitoring
```bash
# View resource usage
docker stats

# View container details
docker-compose ps
docker inspect inventory_app
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check port usage
lsof -i :8080
lsof -i :3306

# Use different ports
export APP_PORT=8081
export MYSQL_PORT=3307
docker-compose up -d
```

#### Database Connection Issues
```bash
# Check MySQL status
docker-compose exec mysql mysqladmin -u root -p status

# Test connection
docker-compose exec app nc -zv mysql 3306

# Reset database
docker-compose down -v
docker-compose up -d mysql
```

#### Application Startup Issues
```bash
# Check application logs
docker-compose logs app

# Check Java process
docker-compose exec app ps aux | grep java

# Restart application
docker-compose restart app
```

#### Memory Issues
```bash
# Increase memory limits
export JAVA_OPTS="-Xms1024m -Xmx2048m"
docker-compose up -d app

# Check memory usage
docker stats inventory_app
```

### Log Analysis
```bash
# Search for errors
docker-compose logs app | grep ERROR

# Search for SQL injection attempts
docker-compose logs app | grep -i "sql\|injection\|union\|select"

# Monitor authentication attempts
docker-compose logs app | grep -i "login\|auth\|session"
```

## Security Testing Setup

### Burp Suite Configuration
1. Configure browser proxy: 127.0.0.1:8080
2. Add localhost:8080 to scope
3. Disable proxy for phpMyAdmin: localhost:8081

### Testing Commands
```bash
# Test SQL injection
curl "http://localhost:8080/inventory/products/search?q=test' OR '1'='1"

# Test authentication bypass
curl -X POST http://localhost:8080/inventory/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin' OR '1'='1' --&password=anything"

# Test error handling
curl "http://localhost:8080/inventory/products/search?q=test'; DROP TABLE products; --"
```

## Performance Optimization

### Database Optimization
```sql
-- Connect to database
docker-compose exec mysql mysql -u root -p inventory_db

-- Check slow queries
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';

-- Analyze table performance
ANALYZE TABLE products;
ANALYZE TABLE users;

-- Check indexes
SHOW INDEX FROM products;
SHOW INDEX FROM users;
```

### Application Optimization
```bash
# Monitor JVM performance
docker-compose exec app jstat -gc 1

# Check thread usage
docker-compose exec app jstack 1

# Monitor HTTP connections
docker-compose exec app netstat -an | grep :8080
```

## Development Workflow

### Code Changes
```bash
# Rebuild and restart after code changes
docker-compose build app
docker-compose up -d app

# Or use development mode with volume mounting
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Database Schema Changes
```bash
# Apply new migrations
docker-compose exec app mvn flyway:migrate

# Reset and reapply all migrations
docker-compose exec app mvn flyway:clean flyway:migrate
```

### Testing
```bash
# Run tests in container
docker-compose exec app mvn test

# Run security tests
docker-compose exec app mvn test -Dtest=*SecurityTest
```

## Cleanup

### Remove Services
```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all
```

### Clean Docker System
```bash
# Remove unused containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Clean everything
docker system prune -a
```

## Next Steps

After successful local deployment:

1. **Explore the Application**: Navigate through different features
2. **Review Logs**: Check application and database logs
3. **Test Vulnerabilities**: Use the security testing commands
4. **Practice Exploitation**: Follow the SECURITY_REVIEW.md guide
5. **Implement Fixes**: Apply remediation techniques
6. **Deploy to AWS**: Follow DEPLOY_AWS.md for cloud deployment

## Support

### Getting Help
- Check logs: `docker-compose logs -f`
- Verify services: `docker-compose ps`
- Test connectivity: `curl http://localhost:8080/inventory/actuator/health`
- Database access: phpMyAdmin at http://localhost:8081

### Common Commands Reference
```bash
# Essential commands
docker-compose up -d          # Start services
docker-compose down           # Stop services
docker-compose logs -f app    # View logs
docker-compose restart app    # Restart application
docker-compose ps             # Check status
