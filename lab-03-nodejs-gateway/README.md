# Lab 03 – Node.js API Gateway Service (SSRF Vulnerabilities)

## Overview
This lab demonstrates Server-Side Request Forgery (SSRF) vulnerabilities in a Node.js API Gateway service. You'll learn to identify, exploit, and remediate SSRF flaws through hands-on exercises with a realistic microservices architecture.

## Learning Objectives
- Understand how SSRF vulnerabilities occur in Node.js applications
- Practice identifying SSRF attack vectors in API Gateway patterns
- Learn to exploit SSRF vulnerabilities to access internal services
- Implement secure coding practices to prevent SSRF attacks
- Use URL validation and network segmentation for defense
- Understand the business impact of SSRF in cloud environments

## Business Context
APIHub is a Node.js-based API Gateway service that routes requests to various microservices and fetches external content for a SaaS platform. The service handles user authentication, request routing, data aggregation from multiple sources, and webhook processing. The development team implemented features like URL preview generation and webhook forwarding without proper URL validation, creating multiple SSRF vulnerabilities.

## Vulnerable Features
1. **URL Preview Service** - Fetches and previews content from user-provided URLs
2. **Webhook Forwarder** - Forwards webhooks to user-specified endpoints
3. **Image Proxy** - Proxies external images through the gateway
4. **Health Check Aggregator** - Checks health of user-provided service URLs
5. **PDF Generator** - Generates PDFs from external HTML content
6. **Social Media Integration** - Fetches content from social media APIs

## Lab Structure
```
labs/lab-03-nodejs-gateway/
├── README.md                 # This file
├── ARCHITECTURE.md           # System architecture and components
├── DESIGN.md                 # Application design and security considerations
├── DEV_GUIDE.md             # Local development setup
├── DEPLOY_LOCAL.md          # Docker deployment instructions
├── DEPLOY_AWS.md            # AWS deployment with Terraform
├── SECURITY_REVIEW.md       # Threat model and security analysis
├── src/                     # Node.js application source code
│   ├── app.js              # Main Express application
│   ├── routes/             # API route handlers
│   ├── middleware/         # Custom middleware
│   ├── services/           # Business logic services
│   ├── utils/              # Utility functions
│   └── config/             # Configuration files
├── deploy/                  # Deployment configurations
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── aws/                # AWS Terraform configs
├── tests/                   # Security test cases
│   ├── ssrf_tests.js
│   ├── integration_tests.js
│   └── payloads/           # SSRF payload collections
├── images/                  # Architecture diagrams
│   ├── architecture.mmd
│   └── ssrf-attack-flow.mmd
└── interview/               # Interview preparation materials
    └── QUESTIONS.md
```

## Getting Started
1. Follow the [DEV_GUIDE.md](./DEV_GUIDE.md) to set up your Node.js development environment
2. Review the [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the microservices architecture
3. Read the [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) to understand the SSRF vulnerabilities
4. Start the application using [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
5. Begin testing with the provided SSRF exploit scenarios

## Key Vulnerabilities to Discover
- **SSRF-001**: Internal service access through URL preview functionality
- **SSRF-002**: Cloud metadata service access via webhook forwarder
- **SSRF-003**: Port scanning through health check aggregator
- **SSRF-004**: File system access via PDF generator
- **SSRF-005**: Time-based blind SSRF in image proxy
- **SSRF-006**: DNS-based data exfiltration through social media integration

## Tools Required
- Node.js 16 or higher
- npm or yarn package manager
- Docker and Docker Compose
- Burp Suite Community Edition
- OWASP ZAP
- AWS CLI (for cloud deployment)
- Custom SSRF testing tools

## Success Criteria
By the end of this lab, you should be able to:
- Identify SSRF vulnerabilities through code review and dynamic testing
- Exploit SSRF to access internal services and cloud metadata
- Understand the business impact of SSRF attacks in cloud environments
- Implement proper URL validation and allowlist mechanisms
- Configure network segmentation and security groups
- Use secure HTTP client libraries and configurations

## Interview Preparation
This lab prepares you for common AppSec interview questions about:
- SSRF attack vectors and prevention techniques
- Secure coding practices in Node.js
- Cloud security and metadata service protection
- API Gateway security patterns
- Microservices security architecture

## Next Steps
After completing this lab, proceed to:
- Lab 04: .NET Core Banking Application (CSRF vulnerabilities)
- Lab 05: Microservices Security Assessment
- Advanced SSRF techniques and cloud exploitation
- API security hardening patterns
