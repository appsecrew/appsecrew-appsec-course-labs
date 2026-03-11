# Lab 06 – Container Security Assessment (Infrastructure & Configuration Vulnerabilities)

## Overview
This lab demonstrates security misconfigurations and infrastructure vulnerabilities in a containerized application environment. You'll learn to identify, exploit, and remediate container security issues, Kubernetes misconfigurations, and infrastructure vulnerabilities through hands-on exercises with a realistic DevOps pipeline.

## Learning Objectives
- Understand container security vulnerabilities and attack vectors
- Practice identifying infrastructure misconfigurations in Docker and Kubernetes
- Learn to exploit container escape and privilege escalation vulnerabilities
- Implement secure containerization and orchestration practices
- Use container security scanning and monitoring tools
- Understand the business impact of infrastructure security failures

## Business Context
DevSecure Inc. has containerized their entire application stack using Docker and deployed it on Kubernetes for scalability and efficiency. The platform includes a web application, API services, databases, and supporting infrastructure. However, the DevOps team prioritized rapid deployment over security, leading to multiple container security misconfigurations, vulnerable base images, and insecure Kubernetes configurations that expose the entire infrastructure to attack.

## Vulnerable Components
1. **Container Images** - Vulnerable base images with known CVEs
2. **Docker Configuration** - Insecure Docker daemon and container settings
3. **Kubernetes Cluster** - Misconfigured RBAC and security policies
4. **Secrets Management** - Hardcoded secrets and insecure secret storage
5. **Network Policies** - Missing network segmentation and ingress controls
6. **Monitoring & Logging** - Insufficient security monitoring and log aggregation
7. **CI/CD Pipeline** - Insecure build and deployment processes

## Lab Structure
```
labs/lab-06-container-security/
├── README.md                 # This file
├── ARCHITECTURE.md           # System architecture and components
├── DESIGN.md                 # Application design and security considerations
├── DEV_GUIDE.md             # Local development setup
├── DEPLOY_LOCAL.md          # Docker deployment instructions
├── DEPLOY_AWS.md            # AWS EKS deployment with Terraform
├── SECURITY_REVIEW.md       # Threat model and security analysis
├── applications/            # Sample vulnerable applications
│   ├── web-app/            # Vulnerable web application
│   ├── api-service/        # Vulnerable API service
│   └── database/           # Database with security issues
├── docker/                  # Docker configurations
│   ├── vulnerable/         # Intentionally vulnerable Dockerfiles
│   ├── secure/             # Secure Dockerfile examples
│   └── docker-compose.yml  # Multi-container setup
├── kubernetes/              # Kubernetes manifests
│   ├── vulnerable/         # Insecure K8s configurations
│   ├── secure/             # Secure K8s configurations
│   └── policies/           # Security policies and RBAC
├── cicd/                   # CI/CD pipeline configurations
│   ├── .github/workflows/ # GitHub Actions with security flaws
│   ├── jenkins/           # Jenkins pipeline scripts
│   └── gitlab-ci.yml      # GitLab CI configuration
├── tests/                   # Security test cases
│   ├── container_tests.py
│   ├── k8s_security_tests.py
│   └── infrastructure_tests.py
├── tools/                   # Security scanning tools and scripts
│   ├── container_scanner.py
│   ├── k8s_scanner.py
│   └── compliance_checker.py
├── images/                  # Architecture diagrams
│   ├── container-architecture.mmd
│   └── attack-flow.mmd
└── interview/               # Interview preparation materials
    └── QUESTIONS.md
```

## Getting Started
1. Follow the [DEV_GUIDE.md](./DEV_GUIDE.md) to set up your container development environment
2. Review the [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the container architecture
3. Read the [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) to understand the infrastructure vulnerabilities
4. Start the environment using [DEPLOY_LOCAL.md](./DEPLOY_LOCAL.md)
5. Begin security assessment with the provided scanning tools

## Key Vulnerabilities to Discover
- **CONT-001**: Privileged container execution with host access
- **CONT-002**: Vulnerable base images with critical CVEs
- **CONT-003**: Container escape through volume mounts
- **CONT-004**: Secrets exposed in environment variables
- **K8S-001**: Insecure Kubernetes RBAC configuration
- **K8S-002**: Missing pod security policies and standards
- **K8S-003**: Excessive service account permissions
- **INFRA-001**: Insecure Docker daemon configuration
- **INFRA-002**: Missing network segmentation and policies

## Tools Required
- Docker Desktop or Docker Engine
- Kubernetes (kind, minikube, or cloud provider)
- kubectl command-line tool
- Trivy or Clair for container scanning
- kube-bench for Kubernetes security assessment
- Falco for runtime security monitoring
- Open Policy Agent (OPA) for policy enforcement

## Success Criteria
By the end of this lab, you should be able to:
- Identify container security vulnerabilities and misconfigurations
- Exploit container escape and privilege escalation techniques
- Understand Kubernetes security best practices and common pitfalls
- Implement secure container build and deployment processes
- Configure proper RBAC and network policies in Kubernetes
- Use container security scanning and monitoring tools effectively

## Interview Preparation
This lab prepares you for common AppSec interview questions about:
- Container security best practices and common vulnerabilities
- Kubernetes security patterns and RBAC implementation
- Infrastructure as Code security considerations
- DevSecOps pipeline security integration
- Cloud-native security monitoring and incident response

## Next Steps
After completing this lab, proceed to:
- Advanced container security patterns
- Service mesh security (Istio/Linkerd)
- Cloud security posture management
- Infrastructure security automation
