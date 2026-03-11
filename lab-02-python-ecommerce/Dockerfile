FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Set environment variables
ENV FLASK_APP=app.py
ENV FLASK_ENV=development
ENV DATABASE_URL=sqlite:///data/ecommerce.db

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]
