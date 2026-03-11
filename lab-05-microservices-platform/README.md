# Lab 05 – React/Spring Boot Microservices Platform (Authorization & Microservices Security)

## Overview
This lab demonstrates authorization vulnerabilities and microservices security issues in a React frontend with Spring Boot microservices backend. You'll learn to identify, exploit, and remediate authorization bypass, insecure direct object references (IDOR), and microservices communication vulnerabilities through hands-on exercises with a realistic SaaS platform.

## Learning Objectives
- Understand authorization vulnerabilities in microservices architectures
- Practice identifying IDOR and privilege escalation attack vectors
- Learn to exploit insecure service-to-service communication
- Implement secure coding practices for microservices authorization
- Use JWT tokens, OAuth 2.0, and API gateway security patterns
- Understand the business impact of authorization failures in distributed systems

## Business Context
CloudCorp is a modern SaaS platform built with React frontend and Spring Boot microservices that provides project management, team collaboration, and document sharing. The platform includes user management, project creation, file sharing, billing, and administrative functions across multiple microservices. The development team implemented a microservices architecture but failed to properly secure inter-service communication and implement consistent authorization checks.

## Vulnerable Features
1. **User Management Service** - Horizontal privilege escalation vulnerabilities
2. **Project Service** - Insecure direct object references in project access
3. **File Service** - Authorization bypass in file upload/download
4. **Billing Service** - Privilege escalation in payment management
5. **Admin Service** - Vertical privilege escalation vulnerabilities
6. **API Gateway** - Inconsistent authorization enforcement
7. **Service-to-Service Communication** - Unsecured internal API calls

## Lab Structure
```
labs/lab-05-microservices-platform/
├── README.md                 # This file
├── ARCHITECTURE.md           # System architecture and components
├── DESIGN.md                 # Application design and security considerations
├── DEV_GUIDE.md             # Local development setup
├── DEPLOY_LOCAL.md          # Docker deployment instructions
├── DEPLOY_AWS.md            # AWS EKS deployment with Terraform
├── SECURITY_REVIEW.md       # Threat model and security analysis
├── frontend/                # React frontend application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── backend/                 # Spring Boot microservices
│   ├── api-gateway/        # Zuul/Spring Cloud Gateway
│   ├── user-service/       # User management microservice
│   ├── project-service/    # Project management microservice
│   ├── file-service/       # File storage microservice
│   ├── billing-service/    # Billing and payments microservice
│   ├── admin-service/      # Administrative functions
│   └── common/             # Shared libraries and utilities
├── deploy/                  # Deployment configurations
│   ├── docker-compose.yml
│   ├── kubernetes/         # K8s manifests
│   └── aws/                # AWS EKS Terraform configs
├── tests/                   # Security test cases
│   ├── authorization_tests.java
│   ├── microservices_tests.java
│   └── payloads/           # Authorization bypass payloads
├── images/                  # Architecture diagrams
│   ├── microservices-architecture.mmd
│   └── authorization-flow.mmd
└── interview/               # Interview preparation materials
    └── QUESTIONS.md
```

## Getting Started
1. Follow the [DEV_GUIDE.md](./DEV_GUIDE.md) to set up your development environment (Java + Node.js)
2. Review the [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the microservices architecture
3. Read the [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) to understand the authorization vulnerabilities
4. Start the platform using [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
5. Begin testing with the provided authorization bypass scenarios

## Key Vulnerabilities to Discover
- **AUTHZ-001**: Horizontal privilege escalation in user management
- **AUTHZ-002**: Vertical privilege escalation to admin privileges
- **IDOR-001**: Insecure direct object references in project access
- **IDOR-002**: File access without proper ownership verification
- **MSEC-001**: Unsecured service-to-service communication
- **MSEC-002**: JWT token tampering and signature bypass
- **MSEC-003**: API gateway authorization bypass
- **MSEC-004**: Microservice trust boundary violations

## Tools Required
- Java 11 or higher + Maven
- Node.js 16+ and npm/yarn
- Docker and Docker Compose
- Kubernetes (optional for advanced deployment)
- Burp Suite Community Edition
- OWASP ZAP
- JWT.io for token analysis
- Postman for API testing

## Success Criteria
By the end of this lab, you should be able to:
- Identify authorization vulnerabilities in microservices architectures
- Exploit IDOR and privilege escalation vulnerabilities
- Understand JWT security and common implementation flaws
- Implement proper authorization patterns in distributed systems
- Configure secure service-to-service communication
- Use OAuth 2.0 and API gateway security patterns

## Interview Preparation
This lab prepares you for common AppSec interview questions about:
- Microservices security patterns and anti-patterns
- Authorization and access control in distributed systems
- JWT security best practices and common vulnerabilities
- API gateway security implementation
- Secure inter-service communication patterns

## Next Steps
After completing this lab, proceed to:
- Advanced microservices security patterns
- Container and Kubernetes security assessment
- API security automation and testing
- OAuth 2.0 and OpenID Connect implementation
