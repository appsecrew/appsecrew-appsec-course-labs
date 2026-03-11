# VULNERABLE Dockerfile — Container Security Lab 06
# Intentional misconfigurations for security training

FROM python:3.9

# VULNERABLE CONT-004: Hardcoded secrets as ENV
ENV DB_PASSWORD=super_secret_db_pass_123
ENV AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE
ENV AWS_SECRET_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
ENV JWT_SECRET=dev-jwt-secret-do-not-use-in-prod

# VULNERABLE CONT-007: Unnecessary packages
RUN apt-get update && apt-get install -y \
    curl wget netcat-openbsd vim procps \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY applications/web-app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY applications/web-app/app.py .
COPY LAB_GUIDE.md .

EXPOSE 8080

# VULNERABLE CONT-001: No USER directive — runs as root
CMD ["python", "app.py"]
