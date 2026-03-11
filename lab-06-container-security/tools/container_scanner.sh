#!/bin/bash
# Container Security Assessment Tool
# Lab 06 — DevSecure Platform
#
# Usage: ./tools/container_scanner.sh [container_name_or_id]

TARGET=${1:-devsecure-web}
REPORT_DATE=$(date +%Y%m%d_%H%M%S)

echo "============================================================"
echo "  Container Security Assessment"
echo "  Target: $TARGET"
echo "  Date: $(date)"
echo "============================================================"
echo ""

# Step 1: Container Runtime Info
echo "[1] CONTAINER RUNTIME INFORMATION"
echo "-----------------------------------"
docker inspect "$TARGET" 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)[0]
config = data.get('HostConfig', {})
security = data.get('Config', {})
print(f'  Privileged: {config.get(\"Privileged\", False)}')
print(f'  User: {security.get(\"User\", \"root (default)\")}')
print(f'  Network Mode: {config.get(\"NetworkMode\", \"unknown\")}')
cap_add = config.get('CapAdd', [])
print(f'  Added Capabilities: {cap_add if cap_add else \"None\"}')
mounts = data.get('Mounts', [])
docker_sock = [m for m in mounts if 'docker.sock' in m.get('Source','')]
print(f'  Docker Socket Mounted: {\"YES - CRITICAL!\" if docker_sock else \"No\"}')
env = security.get('Env', [])
secret_env = [e for e in env if any(k in e.upper() for k in ['PASSWORD','SECRET','KEY','TOKEN'])]
print(f'  Secret-like Env Vars: {len(secret_env)} found')
for e in secret_env:
    print(f'    - {e.split(\"=\")[0]}=***REDACTED***')
" 2>/dev/null || echo "  (Container not running - inspect a running container)"

echo ""
echo "[2] RUNNING AS USER"
echo "-------------------"
docker exec "$TARGET" id 2>/dev/null || echo "  Container not running"
docker exec "$TARGET" whoami 2>/dev/null

echo ""
echo "[3] SENSITIVE FILES CHECK"
echo "-------------------------"
for f in /etc/shadow /root/.ssh/id_rsa /proc/1/environ /var/run/docker.sock; do
    result=$(docker exec "$TARGET" test -r "$f" 2>/dev/null && echo "READABLE" || echo "not accessible")
    echo "  $f: $result"
done

echo ""
echo "[4] ENVIRONMENT SECRETS CHECK"
echo "------------------------------"
docker exec "$TARGET" env 2>/dev/null | grep -iE "(password|secret|key|token|credential)" | \
    sed 's/=.*/=***FOUND***/g' | while read line; do
    echo "  FINDING: $line"
done

echo ""
echo "[5] NETWORK EXPOSURE"
echo "--------------------"
docker port "$TARGET" 2>/dev/null | while read port; do
    echo "  Exposed: $port"
done

echo ""
echo "[6] IMAGE LAYERS (secret leak check)"
echo "-------------------------------------"
IMAGE=$(docker inspect "$TARGET" --format='{{.Config.Image}}' 2>/dev/null)
echo "  Image: $IMAGE"
echo "  Run 'docker history $IMAGE' to check for secrets in build args"
echo "  Run 'trivy image $IMAGE' for CVE scanning (if Trivy installed)"

echo ""
echo "============================================================"
echo "  FINDINGS SUMMARY"
echo "============================================================"
echo ""
echo "  To exploit this container, run:"
echo "  1. docker exec -it $TARGET bash  (if running as root)"
echo "  2. curl http://localhost:8080/debug  (secrets via API)"
echo "  3. curl http://localhost:8080/exec?cmd=cat+/etc/shadow"
echo ""
echo "  See LAB_GUIDE.md for full exploitation steps"
echo "============================================================"
