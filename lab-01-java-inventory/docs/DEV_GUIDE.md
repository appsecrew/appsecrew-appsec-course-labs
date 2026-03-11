# Development Guide - Java Inventory Service

## Prerequisites

### Required Software
- **Java 11 or higher** - OpenJDK or Oracle JDK
- **Maven 3.6+** - Build and dependency management
- **Git** - Version control
- **IDE** - IntelliJ IDEA, Eclipse, or VS Code with Java extensions
- **Docker** - For containerized database (optional)
- **MySQL 8.0+** - Database server (or use Docker)

### Optional Tools
- **Postman** - API testing
- **MySQL Workbench** - Database management
- **Burp Suite Community** - Security testing

## Environment Setup

### 1. Java Installation

#### macOS (using Homebrew)
```bash
brew install openjdk@11
echo 'export PATH="/opt/homebrew/opt/openjdk@11/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install openjdk-11-jdk
```

#### Windows
Download and install from [OpenJDK website](https://openjdk.java.net/install/)

### 2. Maven Installation

#### macOS (using Homebrew)
```bash
brew install maven
```

#### Ubuntu/Debian
```bash
sudo apt install maven
```

#### Windows
Download from [Maven website](https://maven.apache.org/download.cgi) and follow installation instructions.

### 3. Database Setup

#### Option A: Local MySQL Installation

**macOS:**
```bash
brew install mysql
brew services start mysql
mysql_secure_installation
```

**Ubuntu/Debian:**
```bash
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

#### Option B: Docker MySQL (Recommended)
```bash
docker run --name mysql-inventory \
  -e MYSQL_ROOT_PASSWORD=rootpassword \
  -e MYSQL_DATABASE=inventory_db \
  -e MYSQL_USER=inventory_user \
  -e MYSQL_PASSWORD=inventory_pass \
  -p 3306:3306 \
  -d mysql:8.0
```

## Project Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd labs/lab-01-java-inventory
```

### 2. Configure Database Connection

Create `src/main/resources/application-dev.properties`:
```properties
# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/inventory_db
spring.datasource.username=inventory_user
spring.datasource.password=inventory_pass
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

# JPA Configuration
spring.jpa.hibernate.ddl-auto=create-drop
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.database-platform=org.hibernate.dialect.MySQL8Dialect

# Server Configuration
server.port=8080
server.servlet.context-path=/inventory

# Logging Configuration
logging.level.com.secureshop.inventory=DEBUG
logging.level.org.springframework.security=DEBUG
logging.level.org.springframework.web=DEBUG

# Security Configuration (Development Only)
spring.security.user.name=admin
spring.security.user.password=admin123
spring.security.user.roles=ADMIN
```

### 3. Build the Project
```bash
mvn clean compile
```

### 4. Run Database Migrations
```bash
mvn flyway:migrate
```

### 5. Run Tests
```bash
mvn test
```

### 6. Start the Application
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

The application will be available at: `http://localhost:8080/inventory`

## Development Workflow

### 1. Project Structure
```
src/
├── main/
│   ├── java/
│   │   └── com/secureshop/inventory/
│   │       ├── InventoryApplication.java
│   │       ├── config/
│   │       │   ├── SecurityConfig.java
│   │       │   └── DatabaseConfig.java
│   │       ├── controller/
│   │       │   ├── AuthController.java
│   │       │   ├── ProductController.java
│   │       │   └── AdminController.java
│   │       ├── service/
│   │       │   ├── UserService.java
│   │       │   ├── ProductService.java
│   │       │   └── InventoryService.java
│   │       ├── repository/
│   │       │   ├── UserRepository.java
│   │       │   ├── ProductRepository.java
│   │       │   └── InventoryRepository.java
│   │       ├── entity/
│   │       │   ├── User.java
│   │       │   ├── Product.java
│   │       │   ├── Supplier.java
│   │       │   └── InventoryItem.java
│   │       └── dto/
│   │           ├── LoginRequest.java
│   │           ├── ProductSearchRequest.java
│   │           └── InventoryUpdateRequest.java
│   └── resources/
│       ├── application.properties
│       ├── application-dev.properties
│       ├── db/migration/
│       │   ├── V1__Create_users_table.sql
│       │   ├── V2__Create_products_table.sql
│       │   └── V3__Insert_sample_data.sql
│       ├── templates/
│       │   ├── login.html
│       │   ├── dashboard.html
│       │   └── products/
│       │       ├── search.html
│       │       └── list.html
│       └── static/
│           ├── css/
│           ├── js/
│           └── images/
└── test/
    └── java/
        └── com/secureshop/inventory/
            ├── controller/
            ├── service/
            └── repository/
```

### 2. Running in Development Mode

#### Hot Reload Setup
Add to `pom.xml`:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

#### IDE Configuration
**IntelliJ IDEA:**
1. Enable "Build project automatically"
2. Enable "Allow auto-make to start even if developed application is currently running"

**VS Code:**
Install Java Extension Pack and Spring Boot Extension Pack

### 3. Database Management

#### View Database Schema
```bash
mysql -u inventory_user -p inventory_db
SHOW TABLES;
DESCRIBE users;
DESCRIBE products;
```

#### Reset Database
```bash
mvn flyway:clean flyway:migrate
```

#### Seed Test Data
```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--spring.profiles.active=dev,seed-data"
```

## Testing Setup

### 1. Unit Tests
```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=ProductServiceTest

# Run tests with coverage
mvn test jacoco:report
```

### 2. Integration Tests
```bash
# Run integration tests
mvn test -Dtest=*IntegrationTest

# Run with test profile
mvn test -Dspring.profiles.active=test
```

### 3. Security Tests
```bash
# Run security-specific tests
mvn test -Dtest=*SecurityTest
```

## Debugging

### 1. Application Debugging

#### IntelliJ IDEA
1. Set breakpoints in code
2. Run application in debug mode
3. Use "Debug" configuration

#### VS Code
1. Create `.vscode/launch.json`:
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "java",
            "name": "Debug Spring Boot",
            "request": "launch",
            "mainClass": "com.secureshop.inventory.InventoryApplication",
            "projectName": "inventory-service",
            "args": "--spring.profiles.active=dev"
        }
    ]
}
```

### 2. Database Debugging

#### Enable SQL Logging
Add to `application-dev.properties`:
```properties
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
```

#### Monitor Database Connections
```bash
# Show active connections
mysql -u root -p -e "SHOW PROCESSLIST;"

# Monitor slow queries
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query_log';"
```

### 3. Security Debugging

#### Enable Security Logging
```properties
logging.level.org.springframework.security=DEBUG
logging.level.org.springframework.security.web.FilterChainProxy=DEBUG
```

#### Test Authentication
```bash
curl -X POST http://localhost:8080/inventory/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

## Common Development Tasks

### 1. Adding New Entity
```bash
# 1. Create entity class
# 2. Create repository interface
# 3. Create service class
# 4. Create controller
# 5. Create database migration
# 6. Write tests
```

### 2. Adding New Endpoint
```java
@GetMapping("/api/products/{id}")
public ResponseEntity<Product> getProduct(@PathVariable Long id) {
    Product product = productService.findById(id);
    return ResponseEntity.ok(product);
}
```

### 3. Database Migration
Create new file: `src/main/resources/db/migration/V4__Add_new_column.sql`
```sql
ALTER TABLE products ADD COLUMN category_id BIGINT;
ALTER TABLE products ADD FOREIGN KEY (category_id) REFERENCES categories(id);
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>

# Or use different port
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Dserver.port=8081"
```

#### 2. Database Connection Issues
```bash
# Test database connection
mysql -u inventory_user -p -h localhost inventory_db

# Check if MySQL is running
brew services list | grep mysql  # macOS
systemctl status mysql          # Linux
```

#### 3. Maven Build Issues
```bash
# Clean and rebuild
mvn clean install

# Skip tests if needed
mvn clean install -DskipTests

# Update dependencies
mvn dependency:resolve
```

#### 4. Memory Issues
```bash
# Increase JVM memory
export MAVEN_OPTS="-Xmx2048m -XX:MaxPermSize=256m"
mvn spring-boot:run
```

### Logging Configuration

#### Application Logs
```properties
# Log to file
logging.file.name=logs/inventory-app.log
logging.pattern.file=%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n

# Log levels
logging.level.com.secureshop.inventory=DEBUG
logging.level.org.springframework.web=INFO
logging.level.org.hibernate=WARN
```

#### Security Audit Logs
```properties
# Enable security events
logging.level.org.springframework.security.authentication=DEBUG
logging.level.org.springframework.security.authorization=DEBUG
```

## Performance Optimization

### 1. Database Optimization
```properties
# Connection pool settings
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
```

### 2. JVM Tuning
```bash
# Production JVM settings
export JAVA_OPTS="-Xms512m -Xmx2048m -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
```

### 3. Caching Configuration
```java
@EnableCaching
@Configuration
public class CacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("products", "users");
    }
}
```

## Security Testing Setup

### 1. Burp Suite Configuration
1. Start Burp Suite Community Edition
2. Configure browser proxy (127.0.0.1:8080)
3. Navigate to application
4. Intercept and modify requests

### 2. OWASP ZAP Setup
```bash
# Install OWASP ZAP
brew install --cask owasp-zap  # macOS

# Run automated scan
zap-cli quick-scan http://localhost:8080/inventory
```

### 3. Manual Testing Commands
```bash
# Test SQL injection
curl "http://localhost:8080/inventory/products/search?q=test' OR '1'='1"

# Test authentication bypass
curl -X POST http://localhost:8080/inventory/login \
  -d "username=admin' OR '1'='1' --&password=anything"
```

## Next Steps

After setting up the development environment:

1. **Explore the Codebase**: Review the intentionally vulnerable code
2. **Run Security Tests**: Use the provided test cases
3. **Practice Exploitation**: Follow the security review guide
4. **Implement Fixes**: Apply secure coding practices
5. **Verify Remediation**: Test that vulnerabilities are resolved

## Getting Help

### Documentation
- [Spring Boot Reference](https://docs.spring.io/spring-boot/docs/current/reference/html/)
- [Spring Security Reference](https://docs.spring.io/spring-security/site/docs/current/reference/html5/)
- [MySQL Documentation](https://dev.mysql.com/doc/)

### Community Resources
- [Stack Overflow](https://stackoverflow.com/questions/tagged/spring-boot)
- [Spring Community](https://spring.io/community)
- [OWASP Community](https://owasp.org/www-community/)

### Lab-Specific Help
- Check the `SECURITY_REVIEW.md` for vulnerability details
- Review test cases in the `tests/` directory
- Consult the `interview/QUESTIONS.md` for common issues
