# Lab 01 – Java Inventory Service (SQL Injection)

## Overview
This lab demonstrates SQL injection vulnerabilities in a Java Spring Boot inventory management application. You'll learn to identify, exploit, and remediate SQL injection flaws through hands-on exercises.

## Learning Objectives
- Understand how SQL injection vulnerabilities occur in Java applications
- Practice identifying SQL injection attack vectors
- Learn to exploit different types of SQL injection (error-based, blind, union-based)
- Implement secure coding practices to prevent SQL injection
- Use tools like Burp Suite for vulnerability testing

## Business Context
SecureShop Inc. has developed an inventory management system to track products, suppliers, and stock levels. The application allows employees to search products, view inventory details, and generate reports. However, the development team prioritized speed over security, leading to several SQL injection vulnerabilities.

## Vulnerable Features
1. **Product Search** - Search functionality with direct SQL concatenation
2. **User Authentication** - Login bypass through SQL injection
3. **Inventory Reports** - Dynamic query building with user input
4. **Supplier Lookup** - Parameterized queries with improper validation

## Lab Structure
```
labs/lab-01-java-inventory/
├── README.md                 # This file
├── ARCHITECTURE.md           # System architecture and components
├── DESIGN.md                 # Application design and security considerations
├── DEV_GUIDE.md             # Local development setup
├── DEPLOY_LOCAL.md          # Docker deployment instructions
├── DEPLOY_AWS.md            # AWS deployment with Terraform
├── SECURITY_REVIEW.md       # Threat model and security analysis
├── src/                     # Application source code
├── deploy/                  # Deployment configurations
├── tests/                   # Security test cases
├── images/                  # Architecture diagrams
└── interview/               # Interview preparation materials
```

## Getting Started
1. Follow the [DEV_GUIDE.md](./DEV_GUIDE.md) to set up your local development environment
2. Review the [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system design
3. Read the [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) to understand the vulnerabilities
4. Start the application using [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
5. Begin testing with the provided exploit scenarios

## Key Vulnerabilities to Discover
- **SQL-001**: Authentication bypass in login functionality
- **SQL-002**: Error-based SQL injection in product search
- **SQL-003**: Blind SQL injection in inventory reports
- **SQL-004**: Union-based SQL injection in supplier lookup
- **SQL-005**: Second-order SQL injection in user profile updates

## Tools Required
- Java 11 or higher
- Maven 3.6+
- Docker and Docker Compose
- Burp Suite Community Edition
- MySQL client (optional)

## Success Criteria
By the end of this lab, you should be able to:
- Identify SQL injection vulnerabilities through code review
- Exploit SQL injection using manual techniques and automated tools
- Understand the business impact of SQL injection attacks
- Implement proper remediation using parameterized queries
- Configure secure database connections and error handling

## Interview Preparation
This lab prepares you for common AppSec interview questions about:
- SQL injection attack vectors and prevention
- Secure coding practices in Java
- Database security best practices
- Vulnerability assessment methodologies
- Risk assessment and remediation prioritization

## Next Steps
After completing this lab, proceed to:
- Lab 02: Python XSS Vulnerabilities
- Lab 03: Java CSRF Protection
- Advanced SQL injection techniques
- Database security hardening
