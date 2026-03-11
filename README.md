# AppSec Hands-On Labs

Six fully working labs covering OWASP Top 10 vulnerabilities. Each lab includes:
- Running vulnerable application (Docker)
- Reconnaissance → Threat Modeling → Exploitation → Impact Assessment → Remediation

---

## Lab Overview

| Lab | Vulnerability Class | Tech Stack | Port |
|-----|-------------------|-----------|------|
| [Lab 01](./lab-01-java-inventory/) | SQL Injection | Java Spring Boot + H2 | 8080 |
| [Lab 02](./lab-02-python-ecommerce/) | Cross-Site Scripting (XSS) | Python Flask + SQLite | 5000 |
| [Lab 03](./lab-03-nodejs-gateway/) | Server-Side Request Forgery (SSRF) | Node.js Express | 3000 |
| [Lab 04](./lab-04-dotnet-banking/) | Cross-Site Request Forgery (CSRF) | .NET 8 ASP.NET Core | 5000 |
| [Lab 05](./lab-05-microservices-platform/) | Broken Object Authorization (BOLA/IDOR) | Node.js Microservices | 3000 |
| [Lab 06](./lab-06-container-security/) | Container Security | Docker + Python Flask | 8080 |

---

## Quick Start

Each lab runs with a single command:

```bash
# Lab 01 — SQL Injection
cd lab-01-java-inventory && docker compose up -d
# → http://localhost:8080/inventory

# Lab 02 — XSS
cd lab-02-python-ecommerce && docker compose up -d
# → http://localhost:5000

# Lab 03 — SSRF
cd lab-03-nodejs-gateway && docker compose up -d
# → http://localhost:3000

# Lab 04 — CSRF
cd lab-04-dotnet-banking && docker compose up -d
# → http://localhost:5000

# Lab 05 — IDOR/AuthZ
cd lab-05-microservices-platform && docker compose up -d
# → http://localhost:3000

# Lab 06 — Container Security
cd lab-06-container-security && docker compose up -d
# → http://localhost:8080
```

---

## AppSec Process Steps (covered in each lab)

1. **Reconnaissance** — Map the application, discover endpoints, identify tech stack
2. **Threat Modeling** — STRIDE analysis, CVSS scoring, attack surface mapping
3. **Vulnerability Discovery & Exploitation** — Hands-on attack exercises with curl commands
4. **Impact Assessment** — Business risk, data breach scope, compliance impact
5. **Remediation** — Secure code patterns, configuration fixes, security controls

---

## Test Credentials

| Lab | User | Password | Role |
|-----|------|----------|------|
| Lab 01 | admin | admin123 | Admin |
| Lab 01 | john | password123 | User |
| Lab 02 | admin@shop.com | admin123 | Admin |
| Lab 02 | alice@shop.com | alice123 | User |
| Lab 03 | admin@gateway.com | Admin123! | Admin |
| Lab 03 | alice@gateway.com | Alice123! | User |
| Lab 04 | admin@securebank.com | Admin123! | Admin |
| Lab 04 | alice@securebank.com | Alice123! | Customer |
| Lab 04 | bob@securebank.com | Bob123! | Customer |
| Lab 05 | alice@cloudcorp.com | Alice123! | User |
| Lab 05 | bob@cloudcorp.com | Bob456! | User |
| Lab 05 | admin@cloudcorp.com | Admin789! | Admin |
| Lab 06 | admin | admin123 | Admin |

---

## Lab Guides

Each lab has a built-in lab guide:
- Lab 01: http://localhost:8080/inventory/lab-guide
- Lab 02: http://localhost:5000/lab-guide
- Lab 03: http://localhost:3000/lab-guide
- Lab 04: http://localhost:5000/lab-guide.html
- Lab 05: See `lab-05-microservices-platform/LAB_GUIDE.md`
- Lab 06: See `lab-06-container-security/LAB_GUIDE.md` or http://localhost:8080/lab-guide

> **Warning:** These labs contain intentional security vulnerabilities. Run only in isolated environments. Never expose to the internet.
