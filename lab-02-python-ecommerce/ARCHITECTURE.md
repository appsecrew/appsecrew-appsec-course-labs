# FlaskShop E-Commerce Platform - Architecture Overview

## System Architecture

FlaskShop is a Python Flask-based e-commerce platform designed to demonstrate common XSS vulnerabilities in web applications. The system follows a traditional three-tier architecture with intentional security flaws for educational purposes.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Web Browser   │◄──►│  Flask Web App  │◄──►│   PostgreSQL    │
│   (Frontend)    │    │   (Backend)     │    │   Database      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │                 │
                       │  Redis Cache    │
                       │  (Sessions)     │
                       │                 │
                       └─────────────────┘
```

## Component Details

### 1. Web Frontend (Browser)
- **Technology**: HTML5, CSS3, JavaScript (Vanilla JS)
- **Security Issues**: 
  - DOM-based XSS vulnerabilities
  - Client-side validation bypasses
  - Insecure JavaScript implementations

### 2. Flask Web Application
- **Technology**: Python 3.8+, Flask 2.0+, Jinja2 templating
- **Components**:
  - **Route Handlers**: Process HTTP requests and responses
  - **Template Engine**: Renders HTML with user data
  - **Session Management**: Handles user authentication and sessions
  - **Database ORM**: SQLAlchemy for database interactions

### 3. PostgreSQL Database
- **Purpose**: Stores application data including users, products, reviews
- **Security Issues**:
  - Potential for SQL injection (though focus is on XSS)
  - Sensitive data storage without proper encryption

### 4. Redis Cache
- **Purpose**: Session storage and application caching
- **Security Issues**:
  - Session token management vulnerabilities
  - Cache poisoning possibilities

## Data Flow Diagrams

### User Registration and Authentication Flow
```
Browser → Flask App → Database
   ↓         ↓          ↓
1. Submit  2. Process  3. Store
   Form       Data      User
   ↓         ↓          ↓
4. ←Response←Session ←Hash
   Display   Create    Password
```

### Product Search Flow (Vulnerable to Reflected XSS)
```
Browser → Flask App → Database → Flask App → Browser
   ↓         ↓          ↓         ↓         ↓
1. Search  2. Query   3. Results 4. Render  5. Display
   Request   Build      Return     Template   Results
                                  (XSS Vuln)
```

### Review Submission Flow (Vulnerable to Stored XSS)
```
Browser → Flask App → Database → Browser (Other Users)
   ↓         ↓          ↓              ↓
1. Submit  2. Store   3. Save      4. Display
   Review     Data      Review       Review
              (No       (Raw)        (XSS Vuln)
              Sanitize)
```

## Security Architecture Analysis

### Trust Boundaries
1. **External/Internal**: Browser to Flask application
2. **Application/Data**: Flask application to PostgreSQL database
3. **Application/Cache**: Flask application to Redis cache

### Attack Surface
- **HTTP Endpoints**: All Flask routes accepting user input
- **Template Rendering**: Jinja2 template engine with user data
- **Session Management**: Flask session handling and Redis storage
- **File Uploads**: Product image upload functionality
- **Admin Interface**: Administrative panel with elevated privileges

### Sensitive Data Flows
1. **User Credentials**: Registration → Database (hashed passwords)
2. **Session Tokens**: Authentication → Redis cache
3. **Product Reviews**: User input → Database → Display to other users
4. **Personal Information**: User profiles and purchase history
5. **Payment Information**: Credit card details (simulated)

## Component Security Assessment

| Component | Security Strength | Vulnerabilities | Impact |
|-----------|------------------|----------------|---------|
| **Flask Routes** | Weak | No input validation, direct template rendering | High |
| **Jinja2 Templates** | Weak | No auto-escaping, raw user data rendering | Critical |
| **Session Management** | Medium | Secure session tokens, but XSS can steal them | High |
| **Database Layer** | Medium | Parameterized queries, but stores unsanitized data | Medium |
| **Frontend JavaScript** | Weak | Direct DOM manipulation, no CSP | High |

## Deployment Architecture

### Local Development
```
Developer Machine
├── Python Flask App (Port 5000)
├── PostgreSQL (Port 5432)
├── Redis (Port 6379)
└── Browser (Testing interface)
```

### AWS Cloud Deployment
```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Account                           │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Application   │  │   Database      │  │    Cache     │ │
│  │   Load Balancer │  │     Subnet      │  │   Subnet     │ │
│  │                 │  │                 │  │              │ │
│  │  ┌─────────────┐│  │┌─────────────────┐│  │┌────────────┐│ │
│  │  │    EC2      ││  ││   RDS          ││  ││ElastiCache││ │
│  │  │  Flask App  ││  ││  PostgreSQL    ││  ││   Redis    ││ │
│  │  └─────────────┘│  │└─────────────────┘│  │└────────────┘│ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend Technologies
- **Flask**: 2.0+ (Web framework)
- **SQLAlchemy**: 1.4+ (ORM)
- **Flask-Login**: User session management
- **Flask-WTF**: Form handling (intentionally bypassed for vulnerabilities)
- **Jinja2**: Template engine (with security issues)
- **PostgreSQL**: Primary database
- **Redis**: Session storage and caching

### Frontend Technologies
- **HTML5**: Structure and semantics
- **CSS3**: Styling and layout
- **Vanilla JavaScript**: Client-side functionality (vulnerable)
- **Bootstrap**: UI framework

### Development and Deployment
- **Docker**: Containerization
- **Docker Compose**: Local multi-service orchestration
- **Terraform**: AWS infrastructure as code
- **GitHub Actions**: CI/CD pipeline with security scanning

## Security Testing Integration Points

### Static Analysis Integration
- **Bandit**: Python security static analysis
- **Semgrep**: Custom rule-based scanning
- **SonarQube**: Code quality and security analysis

### Dynamic Analysis Integration
- **OWASP ZAP**: Automated XSS detection
- **Burp Suite**: Manual penetration testing
- **Custom Python scripts**: Automated XSS payload testing

### Infrastructure Security
- **AWS Security Groups**: Network-level protection
- **WAF Integration**: Web Application Firewall rules
- **CloudTrail**: Audit logging for AWS resources

## Next Steps
1. Review the detailed security analysis in SECURITY_REVIEW.md
2. Set up the development environment using DEV_GUIDE.md
3. Deploy the application locally with DEPLOY_LOCAL.md
4. Begin security testing and vulnerability discovery
