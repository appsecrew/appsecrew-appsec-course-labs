# Development Guide - FlaskShop E-Commerce Platform

## Prerequisites

### System Requirements
- Python 3.8 or higher
- Docker and Docker Compose
- Git for version control
- Text editor or IDE (VS Code recommended)
- Web browser for testing

### Python Development Setup
1. **Install Python 3.8+**
   ```bash
   # Check Python version
   python3 --version
   
   # Install pip if not available
   curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
   python3 get-pip.py
   ```

2. **Create Virtual Environment**
   ```bash
   # Navigate to lab directory
   cd labs/lab-02-python-ecommerce
   
   # Create virtual environment
   python3 -m venv venv
   
   # Activate virtual environment
   # On macOS/Linux:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   # Install required packages
   pip install -r requirements.txt
   ```

## Local Development Setup

### Method 1: Native Python Development
1. **Set up the environment**
   ```bash
   # Clone and navigate to lab
   cd labs/lab-02-python-ecommerce
   
   # Activate virtual environment
   source venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

2. **Database Setup**
   ```bash
   # Start PostgreSQL using Docker
   docker run --name flaskshop-db -e POSTGRES_PASSWORD=password123 \
              -e POSTGRES_USER=flaskshop -e POSTGRES_DB=ecommerce \
              -p 5432:5432 -d postgres:13
   
   # Start Redis for sessions
   docker run --name flaskshop-redis -p 6379:6379 -d redis:6
   ```

3. **Initialize Database**
   ```bash
   # Run database migrations
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   
   # Seed sample data
   python seed_data.py
   ```

4. **Start the Application**
   ```bash
   # Set environment variables
   export FLASK_APP=app.py
   export FLASK_ENV=development
   export DATABASE_URL=postgresql://flaskshop:password123@localhost:5432/ecommerce
   export REDIS_URL=redis://localhost:6379
   
   # Start Flask development server
   flask run --host=0.0.0.0 --port=5000
   ```

### Method 2: Docker Development (Recommended)
1. **Start All Services**
   ```bash
   # Navigate to lab directory
   cd labs/lab-02-python-ecommerce
   
   # Start all services with Docker Compose
   docker-compose up -d
   
   # View logs
   docker-compose logs -f web
   ```

2. **Access Application**
   - Web Application: http://localhost:5000
   - Database Admin: http://localhost:8080 (pgAdmin)
   - Redis Commander: http://localhost:8081

## Application Structure

### Source Code Organization
```
src/
├── app.py                  # Main Flask application
├── config.py              # Configuration management
├── requirements.txt       # Python dependencies
├── models/                # Database models
│   ├── __init__.py
│   ├── user.py           # User model
│   ├── product.py        # Product model
│   └── review.py         # Review model (vulnerable to XSS)
├── routes/                # Route handlers
│   ├── __init__.py
│   ├── auth.py           # Authentication routes
│   ├── products.py       # Product browsing routes
│   ├── reviews.py        # Review system (XSS vulnerable)
│   ├── profile.py        # User profile management
│   └── admin.py          # Admin panel routes
├── templates/             # Jinja2 templates
│   ├── base.html         # Base template
│   ├── index.html        # Homepage
│   ├── search.html       # Search results (XSS vulnerable)
│   ├── product.html      # Product details
│   ├── profile.html      # User profile (DOM XSS)
│   └── admin/            # Admin templates
├── static/                # Static assets
│   ├── css/
│   ├── js/               # JavaScript with XSS vulnerabilities
│   └── images/
└── utils/                 # Utility functions
    ├── __init__.py
    ├── validators.py     # Input validation (intentionally weak)
    └── security.py       # Security utilities (flawed)
```

### Key Development Files

#### app.py - Main Application
```python
from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

# Import routes
from routes import auth, products, reviews, profile, admin
app.register_blueprint(auth.bp)
app.register_blueprint(products.bp)
app.register_blueprint(reviews.bp)
app.register_blueprint(profile.bp)
app.register_blueprint(admin.bp)

# VULNERABLE: No CSRF protection configured
# VULNERABLE: No Content Security Policy
# VULNERABLE: Debug mode enabled in production

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')  # SECURITY ISSUE: Debug mode
```

#### requirements.txt
```
Flask==2.2.2
Flask-SQLAlchemy==2.5.1
Flask-Login==0.6.2
Flask-Migrate==3.1.0
psycopg2-binary==2.9.3
redis==4.3.4
Werkzeug==2.2.2
Jinja2==3.1.2
MarkupSafe==2.1.1
python-dotenv==0.20.0
```

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/xss-vulnerability

# Make changes to introduce/fix vulnerabilities
# Test locally
flask run

# Commit changes
git add .
git commit -m "Add XSS vulnerability for educational purposes"
```

### 2. Security Testing
```bash
# Run static analysis
bandit -r src/ -f json -o bandit-report.json

# Run XSS payload tests
python tests/xss_tests.py

# Manual testing with Burp Suite
# Set proxy to http://localhost:8080
# Browse application and test XSS payloads
```

### 3. Database Management
```bash
# Create new migration
flask db migrate -m "Add new vulnerable feature"

# Apply migration
flask db upgrade

# Reset database (if needed)
flask db downgrade
docker-compose down -v
docker-compose up -d
```

## Debugging and Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   # Check PostgreSQL status
   docker ps | grep postgres
   
   # Restart database
   docker-compose restart db
   
   # Check logs
   docker-compose logs db
   ```

2. **Redis Connection Error**
   ```bash
   # Check Redis status
   docker ps | grep redis
   
   # Test Redis connection
   docker exec -it flaskshop-redis redis-cli ping
   ```

3. **Python Import Errors**
   ```bash
   # Ensure virtual environment is activated
   source venv/bin/activate
   
   # Reinstall dependencies
   pip install -r requirements.txt
   ```

### Debugging XSS Vulnerabilities

1. **Enable Debug Mode**
   ```python
   # In app.py - already enabled for vulnerability demonstration
   app.run(debug=True)
   ```

2. **Check Template Rendering**
   ```python
   # Add debugging to route handlers
   @app.route('/search')
   def search():
       query = request.args.get('q', '')
       print(f"DEBUG: Search query received: {query}")  # Vulnerable logging
       # Process search...
   ```

3. **Browser Developer Tools**
   - Open browser DevTools (F12)
   - Monitor Console for XSS execution
   - Check Network tab for requests
   - Inspect Elements for injected content

## Security Testing Guidelines

### XSS Testing Checklist
- [ ] Test all input fields for reflected XSS
- [ ] Submit XSS payloads in search functionality
- [ ] Test stored XSS in review/comment systems
- [ ] Check DOM-based XSS in client-side JavaScript
- [ ] Verify template injection vulnerabilities
- [ ] Test XSS in error messages and exception handling

### Tools Integration
- **Burp Suite**: Configure proxy and test manually
- **OWASP ZAP**: Automated XSS scanning
- **Custom Scripts**: Run provided XSS test suites

## Next Steps
1. Complete the lab setup using this development guide
2. Review the SECURITY_REVIEW.md for detailed vulnerability analysis
3. Begin hands-on XSS testing and exploitation
4. Practice remediation techniques and secure coding
5. Deploy to AWS for cloud security testing experience
