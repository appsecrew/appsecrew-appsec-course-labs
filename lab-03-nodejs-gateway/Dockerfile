FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY src/ ./src/
COPY . .

# Create data directory
RUN mkdir -p data logs

# Expose port
EXPOSE 3000

# Initialize database
RUN node src/utils/database.js init || true

# Start the application
CMD ["npm", "start"]
