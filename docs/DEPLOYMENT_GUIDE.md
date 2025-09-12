# Deployment Guide

Complete guide for deploying the Swedish Learning Application to various environments.

## 📋 Table of Contents

- [Environment Overview](#environment-overview)
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Migration](#database-migration)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

## 🌍 Environment Overview

The application supports multiple deployment environments:

- **Development**: Local development with hot reload
- **Testing**: Automated testing with SQLite in-memory database
- **Staging**: Production-like environment for testing
- **Production**: Live environment with PostgreSQL database

### Architecture Components
- **Frontend**: Static HTML/CSS/JS files served by web server
- **Backend**: Node.js Express API server
- **Database**: PostgreSQL (production) or SQLite (development/testing)
- **Authentication**: JWT tokens with localStorage

---

## ✅ Prerequisites

### System Requirements
- **Node.js**: Version 14+ (LTS recommended)
- **npm**: Version 6+ (comes with Node.js)
- **PostgreSQL**: Version 12+ (for production)
- **Git**: For version control

### Development Tools (Optional)
- **Docker**: For containerized deployment
- **PM2**: For production process management
- **Nginx**: For reverse proxy and static file serving

### Installation Commands
```bash
# Install Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (Ubuntu/Debian)
sudo apt-get install postgresql postgresql-contrib

# Install PM2 globally
npm install -g pm2

# Install Docker (Ubuntu)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

---

## 🛠️ Local Development

### 1. Clone and Setup
```bash
# Clone repository
git clone https://github.com/inso2012/learnSwe.git
cd learnSwe

# Install dependencies
npm install

# Create environment file
cp .env.test.example .env
```

### 2. Environment Configuration
Edit `.env` file for local development:
```env
# Application
NODE_ENV=development
PORT=3000

# Database (SQLite for development)
DB_STORAGE=./dev.db
DB_LOGGING=false

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:8000
```

### 3. Database Setup
```bash
# For SQLite (development)
# Database will be created automatically

# For PostgreSQL (optional local setup)
sudo -u postgres psql
CREATE DATABASE swedish_learning_dev;
CREATE USER dev_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE swedish_learning_dev TO dev_user;
\q
```

### 4. Start Development Servers
```bash
# Terminal 1: Start backend API server
npm run dev

# Terminal 2: Start frontend development server
npm run docs:serve
# Or use VS Code Live Server extension

# Terminal 3: Run tests in watch mode (optional)
npm run test:watch
```

### 5. Access Application
- **Frontend**: http://localhost:8000
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs/

---

## 🚀 Production Deployment

### 1. Server Preparation

**Update System & Install Dependencies**:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install Nginx
sudo apt-get install nginx

# Install PM2
sudo npm install -g pm2
```

### 2. Database Setup

**Create Production Database**:
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE swedish_learning_prod;
CREATE USER prod_user WITH PASSWORD 'secure-production-password';
GRANT ALL PRIVILEGES ON DATABASE swedish_learning_prod TO prod_user;

# Enable extensions if needed
\c swedish_learning_prod;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q
```

### 3. Application Deployment

**Clone and Setup Application**:
```bash
# Create app directory
sudo mkdir -p /opt/learnswe
sudo chown $USER:$USER /opt/learnswe

# Clone repository
cd /opt/learnswe
git clone https://github.com/inso2012/learnSwe.git .

# Install production dependencies
npm ci --only=production

# Create production environment file
sudo nano .env.production
```

**Production Environment Variables** (`.env.production`):
```env
# Application
NODE_ENV=production
PORT=3000

# Database
DB_NAME=swedish_learning_prod
DB_USER=prod_user
DB_PASS=secure-production-password
DB_HOST=localhost
DB_PORT=5432

# Security
JWT_SECRET=super-secure-random-string-change-this
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info
```

### 4. Process Management with PM2

**Create PM2 Ecosystem File** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'learnswe-api',
    script: 'backend/app.js',
    cwd: '/opt/learnswe',
    env_file: '.env.production',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    error_file: '/var/log/learnswe/error.log',
    out_file: '/var/log/learnswe/access.log',
    log_file: '/var/log/learnswe/combined.log',
    time: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

**Start Application**:
```bash
# Create log directory
sudo mkdir -p /var/log/learnswe
sudo chown $USER:$USER /var/log/learnswe

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER
```

### 5. Nginx Configuration

**Create Nginx Site Configuration** (`/etc/nginx/sites-available/learnswe`):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    # Frontend static files
    location / {
        root /opt/learnswe/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Documentation
    location /docs/ {
        root /opt/learnswe;
        index index.html;
    }
    
    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
```

**Enable Site**:
```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/learnswe /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test certificate renewal
sudo certbot renew --dry-run
```

---

## 🐳 Docker Deployment

### 1. Create Dockerfile

**Backend Dockerfile** (`Dockerfile.backend`):
```dockerfile
FROM node:16-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY backend/ ./backend/
COPY shared/ ./shared/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "backend/app.js"]
```

**Frontend Dockerfile** (`Dockerfile.frontend`):
```dockerfile
FROM nginx:alpine

# Copy frontend files
COPY frontend/ /usr/share/nginx/html/
COPY docs/ /usr/share/nginx/html/docs/

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose Configuration

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  database:
    image: postgres:13
    environment:
      POSTGRES_DB: swedish_learning
      POSTGRES_USER: dbuser
      POSTGRES_PASSWORD: dbpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    restart: unless-stopped

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      NODE_ENV: production
      DB_HOST: database
      DB_NAME: swedish_learning
      DB_USER: dbuser
      DB_PASS: dbpassword
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - database
    networks:
      - app-network
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

**Environment File** (`.env.docker`):
```env
JWT_SECRET=your-super-secure-jwt-secret-for-docker
POSTGRES_PASSWORD=secure-database-password
```

### 3. Deploy with Docker Compose

```bash
# Build and start services
docker-compose --env-file .env.docker up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Update application
git pull
docker-compose build
docker-compose up -d
```

---

## ⚙️ Environment Configuration

### Development Environment
```env
NODE_ENV=development
PORT=3000
DB_STORAGE=./dev.db
DB_LOGGING=true
JWT_SECRET=dev-secret-change-in-production
CORS_ORIGIN=http://localhost:8000
LOG_LEVEL=debug
```

### Testing Environment
```env
NODE_ENV=test
DB_STORAGE=:memory:
DB_LOGGING=false
JWT_SECRET=test-secret
```

### Production Environment
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_NAME=swedish_learning_prod
DB_USER=prod_user
DB_PASS=secure-password
JWT_SECRET=super-secure-random-64-character-string
CORS_ORIGIN=https://yourdomain.com
LOG_LEVEL=warn
```

---

## 🗄️ Database Migration

### Manual Migration Steps
```bash
# Backup existing database
pg_dump swedish_learning_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Run application to auto-sync tables (Sequelize)
NODE_ENV=production node backend/app.js

# Or run specific migration scripts
node backend/migrations/add-user-names.js
```

### Automated Migration Script
```javascript
// scripts/migrate.js
const { sequelize } = require('../backend/db');

async function migrate() {
    try {
        console.log('Starting database migration...');
        
        // Sync database schema
        await sequelize.sync({ alter: true });
        
        console.log('Database migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
```

---

## 📊 Monitoring & Logging

### PM2 Monitoring
```bash
# View application status
pm2 status

# View logs
pm2 logs learnswe-api

# Monitor in real-time
pm2 monit

# Restart application
pm2 restart learnswe-api

# Reload with zero-downtime
pm2 reload learnswe-api
```

### Log Rotation
```bash
# Install logrotate configuration
sudo nano /etc/logrotate.d/learnswe

# Configuration content:
/var/log/learnswe/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Health Check Endpoint
Add to backend application:
```javascript
// backend/routes/health.js
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version
    });
});
```

---

## 🔧 Troubleshooting

### Common Issues

**1. Database Connection Errors**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database permissions
sudo -u postgres psql -c "\l"
sudo -u postgres psql -c "\du"

# Test connection
psql -h localhost -U prod_user -d swedish_learning_prod
```

**2. Port Already in Use**
```bash
# Find process using port
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000

# Kill process
sudo kill -9 <PID>
```

**3. Permission Errors**
```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/learnswe
chmod -R 755 /opt/learnswe
```

**4. Nginx Configuration Issues**
```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Reload configuration
sudo nginx -s reload
```

### Debug Mode
```bash
# Start application with debug output
DEBUG=* NODE_ENV=development node backend/app.js

# PM2 with debug logs
pm2 start backend/app.js --name learnswe-debug -- --inspect
```

### Performance Monitoring
```bash
# Monitor system resources
htop
iotop
nethogs

# Application performance
pm2 show learnswe-api
```

---

This deployment guide provides comprehensive instructions for deploying the Swedish Learning Application across different environments. Follow the appropriate section based on your deployment needs and infrastructure requirements.