"""
DevSecure Web Application - INTENTIONALLY VULNERABLE
Container Security Lab - Lab 06

Vulnerabilities demonstrated:
- CONT-004: Hardcoded secrets in environment/code
- INFO-001: Verbose error messages expose internal state
- CONT-006: Running as root (configured in Dockerfile)
- INFRA-003: Debug mode enabled exposing Werkzeug console
"""
import os
import subprocess
import sqlite3
import hashlib
from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)

# VULNERABLE: Hardcoded database credentials
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'super_secret_db_pass_123')   # CONT-004
AWS_ACCESS_KEY = os.environ.get('AWS_ACCESS_KEY', 'AKIAIOSFODNN7EXAMPLE') # CONT-004
AWS_SECRET_KEY = os.environ.get('AWS_SECRET_KEY', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY')
JWT_SECRET = os.environ.get('JWT_SECRET', 'dev-jwt-secret-do-not-use-in-prod')
ADMIN_PASSWORD = 'admin:admin123'  # CONT-004: Hardcoded in source

DATABASE = '/tmp/devsecure.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            email TEXT
        );
        CREATE TABLE IF NOT EXISTS secrets (
            id INTEGER PRIMARY KEY,
            name TEXT,
            value TEXT,
            owner TEXT
        );
        INSERT OR IGNORE INTO users VALUES (1, 'admin', 'admin123', 'admin', 'admin@devsecure.internal');
        INSERT OR IGNORE INTO users VALUES (2, 'alice', 'alice123', 'user', 'alice@devsecure.internal');
        INSERT OR IGNORE INTO users VALUES (3, 'bob', 'bob456', 'user', 'bob@devsecure.internal');
        INSERT OR IGNORE INTO secrets VALUES (1, 'db_password', 'super_secret_db_pass_123', 'admin');
        INSERT OR IGNORE INTO secrets VALUES (2, 'aws_key', 'AKIAIOSFODNN7EXAMPLE', 'admin');
        INSERT OR IGNORE INTO secrets VALUES (3, 'api_token', 'tok-prod-a1b2c3d4e5f6789', 'admin');
    ''')
    conn.commit()
    conn.close()

@app.route('/')
def index():
    # VULNERABLE: Exposes environment info including secrets
    env_info = {k: v for k, v in os.environ.items()}
    return render_template_string('''
    <!DOCTYPE html>
    <html>
    <head>
        <title>DevSecure Platform</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body>
        <nav class="navbar navbar-dark bg-dark px-3">
            <span class="navbar-brand">DevSecure Platform</span>
            <span class="badge bg-danger">VULNERABLE - Training Only</span>
        </nav>
        <div class="container mt-4">
            <div class="alert alert-danger">
                <strong>Container Security Lab</strong> - This application demonstrates intentional container
                security misconfigurations. See the <a href="/lab-guide">Lab Guide</a>.
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header bg-warning text-dark">Attack Surface</div>
                        <div class="list-group list-group-flush">
                            <a href="/debug" class="list-group-item list-group-item-action">Debug Info (CONT-004)</a>
                            <a href="/env" class="list-group-item list-group-item-action">Environment Vars (CONT-004)</a>
                            <a href="/exec?cmd=id" class="list-group-item list-group-item-action">Command Exec (CONT-005)</a>
                            <a href="/files?path=/etc/passwd" class="list-group-item list-group-item-action">File Read (CONT-003)</a>
                            <a href="/health" class="list-group-item list-group-item-action">Health Check</a>
                            <a href="/api/secrets" class="list-group-item list-group-item-action">Secrets API (CONT-004)</a>
                        </div>
                    </div>
                </div>
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">Container Info</div>
                        <div class="card-body">
                            <p><strong>Hostname:</strong> {{ hostname }}</p>
                            <p><strong>Running as:</strong> {{ whoami }}</p>
                            <p><strong>PID:</strong> {{ pid }}</p>
                            <p><strong>Working Dir:</strong> {{ cwd }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    ''',
    hostname=os.popen('hostname').read().strip(),
    whoami=os.popen('whoami').read().strip(),
    pid=os.getpid(),
    cwd=os.getcwd()
    )

@app.route('/debug')
def debug():
    """VULNERABLE: Exposes internal state and secrets"""
    return jsonify({
        'warning': 'CONT-004: Sensitive data exposed via debug endpoint',
        'hardcoded_credentials': {
            'db_password': DB_PASSWORD,
            'aws_access_key': AWS_ACCESS_KEY,
            'aws_secret_key': AWS_SECRET_KEY,
            'jwt_secret': JWT_SECRET,
            'admin_password': ADMIN_PASSWORD
        },
        'system': {
            'user': os.popen('whoami').read().strip(),
            'uid': os.getuid() if hasattr(os, 'getuid') else 'N/A',
            'hostname': os.popen('hostname').read().strip(),
            'cwd': os.getcwd(),
            'pid': os.getpid()
        }
    })

@app.route('/env')
def env():
    """VULNERABLE: Exposes all environment variables including secrets"""
    return jsonify({
        'warning': 'CONT-004: All environment variables exposed (includes secrets)',
        'environment': dict(os.environ)
    })

@app.route('/exec')
def exec_cmd():
    """VULNERABLE: Remote code execution via cmd parameter"""
    cmd = request.args.get('cmd', 'id')
    # VULNERABLE: Direct command injection
    try:
        result = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, timeout=5)
        output = result.decode('utf-8', errors='replace')
    except subprocess.CalledProcessError as e:
        output = e.output.decode('utf-8', errors='replace')
    except Exception as e:
        output = str(e)

    return jsonify({
        'warning': 'CONT-005: Unrestricted command execution enabled',
        'command': cmd,
        'output': output,
        'running_as': os.popen('whoami').read().strip()
    })

@app.route('/files')
def read_file():
    """VULNERABLE: Arbitrary file read - demonstrates privileged container risk"""
    path = request.args.get('path', '/etc/hostname')
    try:
        with open(path, 'r') as f:
            content = f.read()
        return jsonify({
            'warning': 'CONT-003: Arbitrary file read (container runs as root)',
            'path': path,
            'content': content
        })
    except PermissionError:
        return jsonify({'error': 'Permission denied', 'path': path}), 403
    except FileNotFoundError:
        return jsonify({'error': 'File not found', 'path': path}), 404

@app.route('/api/secrets')
def get_secrets():
    """VULNERABLE: Returns all secrets without authentication"""
    conn = get_db()
    secrets = conn.execute('SELECT * FROM secrets').fetchall()
    conn.close()
    return jsonify({
        'warning': 'CONT-004: Secrets accessible without authentication',
        'secrets': [dict(s) for s in secrets]
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'devsecure-web',
        'version': '1.0.0',
        'debug': app.debug,
        'db_host': DB_HOST,
        'aws_key_hint': AWS_ACCESS_KEY[:8] + '...'  # CONT-004: partial secret leak
    })

@app.route('/lab-guide')
def lab_guide():
    with open('/app/LAB_GUIDE.md', 'r') as f:
        content = f.read()
    return render_template_string('''
    <html><head><title>Lab Guide</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head><body><div class="container mt-4">
    <pre style="white-space: pre-wrap; font-family: monospace;">{{ content }}</pre>
    </div></body></html>
    ''', content=content)

if __name__ == '__main__':
    init_db()
    # VULNERABLE: Debug mode enabled + listening on all interfaces
    app.run(host='0.0.0.0', port=8080, debug=True)
