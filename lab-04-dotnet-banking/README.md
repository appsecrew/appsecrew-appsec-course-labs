# Lab 04 – .NET Core Banking Application (CSRF & Authentication Vulnerabilities)

## Overview
This lab demonstrates Cross-Site Request Forgery (CSRF) and authentication vulnerabilities in a .NET Core banking application. You'll learn to identify, exploit, and remediate CSRF flaws and authentication bypass techniques through hands-on exercises with a realistic online banking platform.

## Learning Objectives
- Understand how CSRF vulnerabilities occur in .NET Core applications
- Practice identifying CSRF attack vectors in financial applications
- Learn to exploit authentication bypass and session management flaws
- Implement secure coding practices to prevent CSRF attacks
- Use anti-forgery tokens and secure session management
- Understand the business impact of CSRF in financial systems

## Business Context
SecureBank is a .NET Core-based online banking platform that allows customers to view account balances, transfer money, pay bills, and manage their profiles. The application includes features like fund transfers, bill payments, account statements, and administrative functions. The development team rushed to market without implementing proper CSRF protection and secure session management, creating significant security vulnerabilities.

## Vulnerable Features
1. **Money Transfer** - CSRF vulnerability in fund transfer functionality
2. **Bill Payment** - State-changing operations without CSRF tokens
3. **Profile Management** - Account settings changes via CSRF
4. **Administrative Panel** - Admin functions vulnerable to CSRF attacks
5. **Password Reset** - Weak token generation and validation
6. **Session Management** - Insecure session handling and fixation vulnerabilities

## Lab Structure
```
labs/lab-04-dotnet-banking/
├── README.md                 # This file
├── ARCHITECTURE.md           # System architecture and components
├── DESIGN.md                 # Application design and security considerations
├── DEV_GUIDE.md             # Local development setup
├── DEPLOY_LOCAL.md          # Docker deployment instructions
├── DEPLOY_AWS.md            # AWS deployment with Terraform
├── SECURITY_REVIEW.md       # Threat model and security analysis
├── src/                     # .NET Core application source code
│   ├── SecureBank.csproj   # Project file
│   ├── Program.cs          # Application entry point
│   ├── Startup.cs          # Application configuration
│   ├── Controllers/        # MVC controllers
│   ├── Models/             # Data models and DTOs
│   ├── Views/              # Razor views and templates
│   ├── Services/           # Business logic services
│   ├── Data/               # Entity Framework context
│   └── wwwroot/            # Static files (CSS, JS, images)
├── deploy/                  # Deployment configurations
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── aws/                # AWS Terraform configs
├── tests/                   # Security test cases
│   ├── CsrfTests.cs
│   ├── AuthenticationTests.cs
│   └── payloads/           # CSRF payload collections
├── images/                  # Architecture diagrams
│   ├── architecture.mmd
│   └── csrf-attack-flow.mmd
└── interview/               # Interview preparation materials
    └── QUESTIONS.md
```

## Getting Started
1. Follow the [DEV_GUIDE.md](./DEV_GUIDE.md) to set up your .NET Core development environment
2. Review the [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the banking application architecture
3. Read the [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) to understand the CSRF vulnerabilities
4. Start the application using [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
5. Begin testing with the provided CSRF exploit scenarios

## Key Vulnerabilities to Discover
- **CSRF-001**: Money transfer without anti-forgery token validation
- **CSRF-002**: Bill payment functionality vulnerable to CSRF
- **CSRF-003**: Profile update operations without CSRF protection
- **CSRF-004**: Administrative functions lacking CSRF tokens
- **AUTH-001**: Session fixation vulnerabilities
- **AUTH-002**: Weak password reset token generation
- **AUTH-003**: Insecure session management and timeout handling

## Tools Required
- .NET 6.0 SDK or higher
- Visual Studio 2022 or VS Code
- Docker and Docker Compose
- SQL Server LocalDB or Docker
- Burp Suite Community Edition
- OWASP ZAP
- Browser developer tools

## Success Criteria
By the end of this lab, you should be able to:
- Identify CSRF vulnerabilities through code review and dynamic testing
- Exploit CSRF to perform unauthorized financial transactions
- Understand the business impact of CSRF attacks in banking systems
- Implement anti-forgery token protection in ASP.NET Core
- Configure secure session management and authentication
- Use secure coding practices for financial applications

## Interview Preparation
This lab prepares you for common AppSec interview questions about:
- CSRF attack vectors and prevention in financial applications
- Secure coding practices in .NET Core
- Authentication and session management security
- Financial industry security requirements
- Vulnerability assessment for high-risk applications

## Next Steps
After completing this lab, proceed to:
- Lab 05: React/Spring Boot Microservices Platform
- Advanced CSRF techniques and SameSite cookie implementation
- Financial application security standards
- PCI DSS compliance requirements
