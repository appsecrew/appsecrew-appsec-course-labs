# Lab 02 – Python Flask E-Commerce Application (XSS Vulnerabilities)

## Overview
This lab demonstrates Cross-Site Scripting (XSS) vulnerabilities in a Python Flask e-commerce application. You'll learn to identify, exploit, and remediate various types of XSS flaws through hands-on exercises with a realistic shopping platform.

## Learning Objectives
- Understand how XSS vulnerabilities occur in Python Flask applications
- Practice identifying reflected, stored, and DOM-based XSS attack vectors
- Learn to exploit XSS vulnerabilities using manual techniques and automated tools
- Implement secure coding practices to prevent XSS attacks
- Use Content Security Policy (CSP) and other defense mechanisms
- Understand the business impact of XSS vulnerabilities

## Business Context
FlaskShop is a modern e-commerce platform built with Python Flask that allows customers to browse products, leave reviews, and make purchases. The application includes user registration, product catalog, shopping cart, and admin panel functionality. However, the development team focused on features over security, leading to multiple XSS vulnerabilities across the application.

## Vulnerable Features
1. **Product Search** - Reflected XSS in search results display
2. **Customer Reviews** - Stored XSS in product review system
3. **User Profile** - DOM-based XSS in profile update functionality
4. **Admin Dashboard** - Blind XSS in contact form submissions
5. **Product Categories** - XSS in URL parameters and breadcrumb navigation

## Lab Structure
```
labs/lab-02-python-ecommerce/
├── README.md                 # This file
├── ARCHITECTURE.md           # System architecture and components
├── DESIGN.md                 # Application design and security considerations
├── DEV_GUIDE.md             # Local development setup
├── DEPLOY_LOCAL.md          # Docker deployment instructions
├── DEPLOY_AWS.md            # AWS deployment with Terraform
├── SECURITY_REVIEW.md       # Threat model and security analysis
├── src/                     # Flask application source code
│   ├── app.py              # Main Flask application
│   ├── models/             # Database models
│   ├── routes/             # Route handlers
│   ├── templates/          # Jinja2 templates
│   ├── static/             # CSS, JS, images
│   └── utils/              # Utility functions
├── deploy/                  # Deployment configurations
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── aws/                # AWS Terraform configs
├── tests/                   # Security test cases
│   ├── xss_tests.py
│   ├── integration_tests.py
│   └── payloads/           # XSS payload collections
├── images/                  # Architecture diagrams
│   ├── architecture.mmd
│   └── xss-attack-flow.mmd
└── interview/               # Interview preparation materials
    └── QUESTIONS.md
```

## Getting Started
1. Follow the [DEV_GUIDE.md](./DEV_GUIDE.md) to set up your Python development environment
2. Review the [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the Flask application design
3. Read the [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) to understand the XSS vulnerabilities
4. Start the application using [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
5. Begin testing with the provided XSS exploit scenarios

## Key Vulnerabilities to Discover
- **XSS-001**: Reflected XSS in product search functionality
- **XSS-002**: Stored XSS in customer review system
- **XSS-003**: DOM-based XSS in user profile updates
- **XSS-004**: Blind XSS in admin contact form
- **XSS-005**: XSS in error messages and exception handling
- **XSS-006**: Template injection in Flask Jinja2 templates

## Tools Required
- Python 3.8 or higher
- Flask 2.0+
- Docker and Docker Compose
- Burp Suite Community Edition
- OWASP ZAP
- Browser developer tools
- XSS Hunter or similar blind XSS platform

## Success Criteria
By the end of this lab, you should be able to:
- Identify XSS vulnerabilities through code review and dynamic testing
- Exploit different types of XSS using manual techniques and automated tools
- Understand the business impact of XSS attacks (session hijacking, data theft)
- Implement proper output encoding and input validation
- Configure Content Security Policy (CSP) headers
- Use secure template rendering practices in Flask

## Interview Preparation
This lab prepares you for common AppSec interview questions about:
- XSS attack vectors and prevention techniques
- Secure coding practices in Python Flask
- Content Security Policy implementation
- Client-side security mechanisms
- Vulnerability assessment methodologies for web applications

## Next Steps
After completing this lab, proceed to:
- Lab 03: Node.js API Gateway (SSRF vulnerabilities)
- Lab 04: .NET Core Banking Application (CSRF vulnerabilities)
- Advanced XSS techniques and filter bypasses
- Frontend security hardening
