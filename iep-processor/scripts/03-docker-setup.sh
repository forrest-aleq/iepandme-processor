#!/bin/bash

# IEPandMe Docker Setup Script - 2025
# Creates production-ready Docker configuration

set -e

echo "🐳 Setting up Docker development environment..."

# Check for Docker
check_docker() {
    echo "📋 Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is required. Please install Docker Desktop from https://docker.com/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "⚠️  docker-compose not found. Using 'docker compose' instead."
    fi
    
    echo "✅ Docker check passed"
}

# Create development Dockerfile
create_dev_dockerfile() {
    echo "📦 Creating development Dockerfile..."
    
    cat > Dockerfile.dev << 'EOF'
# Development Dockerfile for IEPandMe
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Development image with hot reload
FROM base AS dev
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install additional dev tools
RUN apk add --no-cache git curl

# Enable corepack for pnpm
RUN corepack enable

# Generate Prisma client
RUN pnpm db:generate

# Expose port
EXPOSE 3000

# Set environment to development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Start the application in development mode
CMD ["pnpm", "dev"]
EOF

    echo "✅ Development Dockerfile created"
}

# Create production Dockerfile
create_prod_dockerfile() {
    echo "📦 Creating production Dockerfile..."
    
    cat > Dockerfile << 'EOF'
# Production Dockerfile for IEPandMe
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile --prod

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Enable pnpm
RUN corepack enable pnpm

# Generate Prisma client
RUN pnpm db:generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
EOF

    echo "✅ Production Dockerfile created"
}

# Create docker-compose for development
create_dev_compose() {
    echo "🔧 Creating development docker-compose..."
    
    cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  # Main application
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NODE_ENV=development
      - WATCHPACK_POLLING=true
    env_file:
      - .env.local
    depends_on:
      - postgres
      - redis
    networks:
      - iepandme-network
    restart: unless-stopped

  # PostgreSQL database
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: iepandme_dev
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - iepandme-network
    restart: unless-stopped

  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - iepandme-network
    restart: unless-stopped
    command: redis-server --appendonly yes

  # Prisma Studio (optional)
  prisma-studio:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "5555:5555"
    environment:
      - NODE_ENV=development
    env_file:
      - .env.local
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - postgres
    networks:
      - iepandme-network
    command: ["pnpm", "db:studio", "--port", "5555", "--hostname", "0.0.0.0"]
    restart: "no"

volumes:
  postgres_data:
  redis_data:

networks:
  iepandme-network:
    driver: bridge
EOF

    echo "✅ Development docker-compose created"
}

# Create docker-compose for production
create_prod_compose() {
    echo "🔧 Creating production docker-compose..."
    
    cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  # Main application
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    networks:
      - iepandme-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # PostgreSQL database
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-iepandme}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - iepandme-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - iepandme-network
    restart: unless-stopped
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx reverse proxy (optional)
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - iepandme-network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  iepandme-network:
    driver: bridge
EOF

    echo "✅ Production docker-compose created"
}

# Create Docker support files
create_docker_support() {
    echo "📁 Creating Docker support files..."
    
    mkdir -p docker/postgres
    mkdir -p docker/nginx
    mkdir -p docker/scripts
    
    # PostgreSQL initialization script
    cat > docker/postgres/init.sql << 'EOF'
-- Initialize PostgreSQL for IEPandMe
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application database
CREATE DATABASE iepandme_dev;

-- Connect to the new database and set up extensions
\c iepandme_dev;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application user (optional)
-- CREATE USER iepandme_user WITH PASSWORD 'secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE iepandme_dev TO iepandme_user;
EOF

    # Nginx configuration
    cat > docker/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

    server {
        listen 80;
        server_name localhost;

        # Increase max upload size for IEP documents
        client_max_body_size 10M;

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Upload endpoints with stricter rate limiting
        location /api/upload {
            limit_req zone=upload burst=5 nodelay;
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Extended timeouts for large file uploads
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        # Static files
        location /_next/static/ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # All other routes
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

    # Docker helper scripts
    cat > docker/scripts/dev-start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting IEPandMe development environment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Copying from .env.example..."
    cp .env.example .env.local
    echo "✅ Please update .env.local with your actual API keys"
fi

# Start development environment
docker-compose -f docker-compose.dev.yml up --build
EOF

    cat > docker/scripts/prod-start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting IEPandMe production environment..."

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "❌ .env.production not found. Please create it with production values."
    exit 1
fi

# Start production environment
docker-compose -f docker-compose.prod.yml up --build -d
EOF

    cat > docker/scripts/cleanup.sh << 'EOF'
#!/bin/bash
echo "🧹 Cleaning up Docker resources..."

# Stop all containers
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.prod.yml down

# Remove unused images
docker image prune -f

# Remove unused volumes (be careful!)
read -p "Remove unused volumes? This will delete database data! (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker volume prune -f
fi

echo "✅ Cleanup complete"
EOF

    # Make scripts executable
    chmod +x docker/scripts/*.sh
    
    echo "✅ Docker support files created"
}

# Create .dockerignore
create_dockerignore() {
    echo "📄 Creating .dockerignore..."
    
    cat > .dockerignore << 'EOF'
# Dependencies
node_modules
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage
.nyc_output
tests/screenshots
tests/videos

# Next.js
.next/
out/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
prisma/dev.db
prisma/dev.db-journal

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Git
.git
.gitignore

# Docker
Dockerfile*
docker-compose*.yml
.dockerignore

# Documentation
README.md
docs/

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Temporary files
tmp/
temp/
*.tmp

# Optional directories
.next
coverage
dist
EOF

    echo "✅ .dockerignore created"
}

# Create health check endpoint
create_health_check() {
    echo "🏥 Creating health check endpoint..."
    
    mkdir -p src/app/api/health
    
    cat > src/app/api/health/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'OPENAI_API_KEY',
    ]
    
    const missingEnvVars = requiredEnvVars.filter(
      (envVar) => !process.env[envVar]
    )
    
    if (missingEnvVars.length > 0) {
      return NextResponse.json(
        {
          status: 'error',
          message: 'Missing environment variables',
          missing: missingEnvVars,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
EOF

    echo "✅ Health check endpoint created"
}

# Update Next.js configuration for Docker
update_nextjs_config() {
    echo "⚙️ Updating Next.js configuration for Docker..."
    
    cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable server components optimization
    serverComponentsExternalPackages: ['prisma', '@prisma/client'],
  },
  
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Image optimization for Docker
  images: {
    domains: [],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Add support for .node files
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    })
    
    return config
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
  
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
}

module.exports = nextConfig
EOF

    echo "✅ Next.js configuration updated"
}

# Create Docker development guide
create_docker_guide() {
    echo "📚 Creating Docker development guide..."
    
    cat > DOCKER_GUIDE.md << 'EOF'
# Docker Development Guide

This guide explains how to develop and deploy IEPandMe using Docker.

## Prerequisites

- Docker Desktop installed
- At least 4GB RAM allocated to Docker
- Basic knowledge of Docker and docker-compose

## Development Environment

### Quick Start

1. **Start development environment:**
   ```bash
   ./docker/scripts/dev-start.sh
   ```

2. **Access the application:**
   - Main app: http://localhost:3000
   - Prisma Studio: http://localhost:5555
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

### Manual Setup

1. **Build and start services:**
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

2. **Run database migrations:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec app pnpm db:migrate
   ```

3. **Seed the database:**
   ```bash
   docker-compose -f docker-compose.dev.yml exec app pnpm db:seed
   ```

### Development Workflow

- **Code changes:** Hot reload is enabled, changes will be reflected immediately
- **Package changes:** Rebuild the container after adding new dependencies
- **Database changes:** Run migrations inside the container

### Useful Commands

```bash
# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Execute commands in container
docker-compose -f docker-compose.dev.yml exec app pnpm lint

# Access PostgreSQL
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d iepandme_dev

# Access Redis CLI
docker-compose -f docker-compose.dev.yml exec redis redis-cli

# Stop services
docker-compose -f docker-compose.dev.yml down
```

## Production Environment

### Deployment

1. **Prepare environment:**
   ```bash
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Start production environment:**
   ```bash
   ./docker/scripts/prod-start.sh
   ```

### Production Features

- **Nginx reverse proxy** with rate limiting
- **Health checks** for all services
- **Automatic restarts** on failure
- **Optimized builds** with multi-stage Dockerfile

### Monitoring

- **Health endpoint:** http://localhost/api/health
- **Service status:** `docker-compose -f docker-compose.prod.yml ps`
- **Logs:** `docker-compose -f docker-compose.prod.yml logs`

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Change ports in docker-compose files if needed
   - Check what's running: `lsof -i :3000`

2. **Database connection errors:**
   - Wait for PostgreSQL to fully start
   - Check logs: `docker-compose logs postgres`

3. **Out of memory errors:**
   - Increase Docker memory allocation
   - Check Docker Desktop settings

4. **File permission issues (Linux/macOS):**
   - Ensure Docker has access to project directory
   - Check file ownership and permissions

### Performance Optimization

1. **Enable BuildKit:**
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **Use .dockerignore:**
   - Keep it updated to exclude unnecessary files
   - Reduces build context size

3. **Layer caching:**
   - Order Dockerfile commands from least to most frequently changing
   - Use multi-stage builds for smaller images

## Development Tips

1. **Database management:**
   - Use Prisma Studio for visual database management
   - Keep migrations in version control
   - Regular backups in production

2. **Environment variables:**
   - Never commit .env files
   - Use different files for different environments
   - Validate required variables on startup

3. **Debugging:**
   - Use `console.log` statements (they appear in Docker logs)
   - Access container shell: `docker exec -it <container_name> sh`
   - Use VS Code Dev Containers extension for better development experience

## Cleanup

Run the cleanup script to remove unused Docker resources:
```bash
./docker/scripts/cleanup.sh
```

**Warning:** This will remove unused volumes, including database data!
EOF

    echo "✅ Docker development guide created"
}

# Main execution
main() {
    echo "🎯 Starting Docker setup..."
    
    check_docker
    create_dev_dockerfile
    create_prod_dockerfile
    create_dev_compose
    create_prod_compose
    create_docker_support
    create_dockerignore
    create_health_check
    update_nextjs_config
    create_docker_guide
    
    echo ""
    echo "🎉 Docker setup complete!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Configure your .env.local file with API keys"
    echo "2. Run './docker/scripts/dev-start.sh' to start development"
    echo "3. Access the app at http://localhost:3000"
    echo "4. Access Prisma Studio at http://localhost:5555"
    echo ""
    echo "🔗 Useful commands:"
    echo "  ./docker/scripts/dev-start.sh    - Start development environment"
    echo "  ./docker/scripts/prod-start.sh   - Start production environment"
    echo "  ./docker/scripts/cleanup.sh      - Clean up Docker resources"
    echo ""
    echo "📚 Documentation:"
    echo "  See DOCKER_GUIDE.md for detailed instructions"
    echo "  See docker-compose.dev.yml for development services"
    echo "  See docker-compose.prod.yml for production services"
}

main "$@"