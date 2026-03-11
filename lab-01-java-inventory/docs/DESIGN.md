# Design Document - Java Inventory Service

## Application Design Overview

The Java Inventory Service is designed as a multi-layered Spring Boot application following Domain-Driven Design (DDD) principles. The application manages inventory operations for SecureShop Inc., including product management, supplier relationships, and user access control.

## Key Components

### 1. Domain Model

#### Core Entities
```java
// User Entity
@Entity
public class User {
    private Long id;
    private String username;
    private String password;
    private String email;
    private Role role;
    private boolean enabled;
    private LocalDateTime lastLogin;
}

// Product Entity
@Entity
public class Product {
    private Long id;
    private String name;
    private String description;
    private BigDecimal price;
    private String category;
    private Supplier supplier;
    private List<InventoryItem> inventory;
}

// Supplier Entity
@Entity
public class Supplier {
    private Long id;
    private String name;
    private String contactEmail;
    private String address;
    private List<Product> products;
}

// InventoryItem Entity
@Entity
public class InventoryItem {
    private Long id;
    private Product product;
    private Integer quantity;
    private String location;
    private LocalDateTime lastUpdated;
}
```

### 2. Authentication & Authorization Design

#### Authentication Flow
The application uses Spring Security with form-based authentication:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .authorizeRequests()
                .antMatchers("/login", "/css/**", "/js/**").permitAll()
                .antMatchers("/admin/**").hasRole("ADMIN")
                .antMatchers("/manager/**").hasAnyRole("ADMIN", "MANAGER")
                .anyRequest().authenticated()
            .and()
            .formLogin()
                .loginPage("/login")
                .defaultSuccessUrl("/dashboard")
                .failureUrl("/login?error=true")
            .and()
            .logout()
                .logoutSuccessUrl("/login?logout=true");
    }
}
```

#### Role-Based Access Control
- **ADMIN**: Full system access, user management
- **MANAGER**: Product and supplier management, reports
- **EMPLOYEE**: Product search, inventory updates
- **VIEWER**: Read-only access to products and inventory

### 3. Data Access Layer Design

#### Repository Pattern Implementation
```java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    
    // Secure implementation using @Query
    @Query("SELECT p FROM Product p WHERE p.name LIKE %:name%")
    List<Product> findByNameContaining(@Param("name") String name);
    
    // Vulnerable implementation (intentional for lab)
    @Query(value = "SELECT * FROM products WHERE name LIKE '%" + 
                   "#{#name}" + "%'", nativeQuery = true)
    List<Product> findByNameVulnerable(@Param("name") String name);
}
```

#### Database Connection Configuration
```java
@Configuration
public class DatabaseConfig {
    
    @Bean
    @Primary
    @ConfigurationProperties("spring.datasource")
    public DataSource dataSource() {
        return DataSourceBuilder.create().build();
    }
    
    @Bean
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }
}
```

### 4. Service Layer Design

#### Business Logic Encapsulation
```java
@Service
@Transactional
public class ProductService {
    
    private final ProductRepository productRepository;
    private final JdbcTemplate jdbcTemplate;
    
    // Secure search implementation
    public List<Product> searchProductsSecure(String searchTerm) {
        return productRepository.findByNameContaining(searchTerm);
    }
    
    // Vulnerable search implementation (intentional)
    public List<Product> searchProductsVulnerable(String searchTerm) {
        String sql = "SELECT * FROM products WHERE name LIKE '%" + 
                     searchTerm + "%'";
        return jdbcTemplate.query(sql, new ProductRowMapper());
    }
}
```

### 5. Web Layer Design

#### Controller Architecture
```java
@Controller
@RequestMapping("/products")
public class ProductController {
    
    private final ProductService productService;
    
    @GetMapping("/search")
    public String searchProducts(
            @RequestParam("q") String query,
            Model model) {
        
        // Vulnerable to SQL injection
        List<Product> products = productService.searchProductsVulnerable(query);
        model.addAttribute("products", products);
        return "products/search-results";
    }
    
    @GetMapping("/secure-search")
    public String secureSearchProducts(
            @RequestParam("q") String query,
            Model model) {
        
        // Secure implementation
        List<Product> products = productService.searchProductsSecure(query);
        model.addAttribute("products", products);
        return "products/search-results";
    }
}
```

## Security Design Decisions

### 1. Input Validation Strategy

#### Current Implementation (Vulnerable)
```java
@PostMapping("/login")
public String login(@RequestParam String username, 
                   @RequestParam String password, 
                   Model model) {
    
    // Direct SQL concatenation - VULNERABLE
    String sql = "SELECT * FROM users WHERE username = '" + 
                 username + "' AND password = '" + password + "'";
    
    List<User> users = jdbcTemplate.query(sql, new UserRowMapper());
    
    if (!users.isEmpty()) {
        return "redirect:/dashboard";
    }
    
    model.addAttribute("error", "Invalid credentials");
    return "login";
}
```

#### Secure Implementation
```java
@PostMapping("/secure-login")
public String secureLogin(@Valid @ModelAttribute LoginForm form, 
                         BindingResult result, 
                         Model model) {
    
    if (result.hasErrors()) {
        return "login";
    }
    
    // Using parameterized queries
    String sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    List<User> users = jdbcTemplate.query(sql, 
        new Object[]{form.getUsername(), form.getPassword()}, 
        new UserRowMapper());
    
    if (!users.isEmpty()) {
        return "redirect:/dashboard";
    }
    
    model.addAttribute("error", "Invalid credentials");
    return "login";
}
```

### 2. Error Handling Design

#### Vulnerable Error Handling
```java
@ExceptionHandler(SQLException.class)
public ResponseEntity<String> handleSQLException(SQLException ex) {
    // Exposes database structure - VULNERABLE
    return ResponseEntity.status(500)
        .body("Database error: " + ex.getMessage());
}
```

#### Secure Error Handling
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

### 3. Session Management Design

#### Session Configuration
```java
@Configuration
public class SessionConfig {
    
    @Bean
    public HttpSessionEventPublisher httpSessionEventPublisher() {
        return new HttpSessionEventPublisher();
    }
    
    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }
}
```

#### Session Security Settings
```properties
# Session timeout (30 minutes)
server.servlet.session.timeout=30m

# Session cookie settings
server.servlet.session.cookie.http-only=true
server.servlet.session.cookie.secure=true
server.servlet.session.cookie.same-site=strict
```

## Storage Design

### 1. Database Schema Design

#### Users Table
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role ENUM('ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER') NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Products Table
```sql
CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    supplier_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);
```

#### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id BIGINT,
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 2. Connection Pool Configuration

```java
@Configuration
public class DataSourceConfig {
    
    @Bean
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariConfig hikariConfig() {
        HikariConfig config = new HikariConfig();
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        return config;
    }
}
```

## Dependencies and External Integrations

### 1. Core Dependencies
```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-thymeleaf</artifactId>
    </dependency>
    
    <!-- Database -->
    <dependency>
        <groupId>mysql</groupId>
        <artifactId>mysql-connector-java</artifactId>
    </dependency>
    
    <!-- Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>
```

### 2. Security Dependencies
```xml
<!-- Additional security libraries -->
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>8.4.0</version>
</dependency>
```

## Intentional Vulnerabilities (For Learning)

### 1. SQL Injection Vulnerabilities

#### Location: ProductController.searchProducts()
```java
// VULNERABLE: Direct string concatenation
String sql = "SELECT * FROM products WHERE name LIKE '%" + searchTerm + "%'";
```

#### Location: AuthController.authenticate()
```java
// VULNERABLE: Authentication bypass
String query = "SELECT * FROM users WHERE username = '" + username + 
               "' AND password = '" + password + "'";
```

### 2. Information Disclosure

#### Location: GlobalExceptionHandler
```java
// VULNERABLE: Exposes stack traces
@ExceptionHandler(Exception.class)
public String handleException(Exception ex, Model model) {
    model.addAttribute("error", ex.getMessage());
    model.addAttribute("stackTrace", ex.getStackTrace());
    return "error";
}
```

### 3. Insufficient Authorization

#### Location: AdminController
```java
// VULNERABLE: Missing authorization check
@GetMapping("/admin/users")
public String listUsers(Model model) {
    // No role verification - any authenticated user can access
    List<User> users = userService.findAll();
    model.addAttribute("users", users);
    return "admin/users";
}
```

## Remediation Guidelines

### 1. SQL Injection Prevention
- Use parameterized queries or prepared statements
- Implement input validation and sanitization
- Use ORM frameworks with proper configuration
- Apply principle of least privilege for database users

### 2. Authentication Strengthening
- Implement proper password hashing (BCrypt)
- Add account lockout mechanisms
- Use secure session management
- Implement multi-factor authentication

### 3. Authorization Enhancement
- Implement method-level security
- Use role-based access control consistently
- Apply principle of least privilege
- Regular access reviews and audits

## Research Assignments

1. **JPA Security**: Research the differences between JPQL, Criteria API, and native queries in terms of SQL injection prevention.

2. **Spring Security**: Study Spring Security's method-level security annotations and their proper usage patterns.

3. **Database Security**: Investigate MySQL security features including user privileges, SSL connections, and audit logging.

4. **Secure Coding**: Research OWASP secure coding practices for Java applications and their implementation in Spring Boot.
