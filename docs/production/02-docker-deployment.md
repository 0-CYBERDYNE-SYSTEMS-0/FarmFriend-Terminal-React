# Docker Deployment

**Containerized deployment for isolated, reproducible environments**

---

## Overview

Docker deployment provides isolated runtime environments, consistent behavior across machines, and simplified scaling. FF Terminal can run as daemon, web server, or both in containers.

## Prerequisites

- **Docker** >= 24.0
- **Docker Compose** >= 2.20 (for multi-container setups)
- **Dockerfile** knowledge for custom images

---

## Quick Start

### Basic Daemon Container

```bash
# Build image
docker build -t ff-terminal:latest .

# Run daemon
docker run -d \
  --name ff-terminal-daemon \
  -p 28888:28888 \
  -v ~/.ff-terminal-profiles.json:/app/.ff-terminal-profiles.json \
  -v ~/ff-terminal-workspace:/app/ff-terminal-workspace \
  ff-terminal:latest \
  npm start:daemon
```

### Web Server Container

```bash
# Run web server
docker run -d \
  --name ff-terminal-web \
  -p 8787:8787 \
  -v ~/.ff-terminal-profiles.json:/app/.ff-terminal-profiles.json \
  -v ~/ff-terminal-workspace:/app/ff-terminal-workspace \
  ff-terminal:latest \
  npm start:web
```

---

## Dockerfile

### Production Dockerfile

Multi-stage build for optimized image size.

```dockerfile
# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build:web
RUN npm run build:fieldview
RUN npx tsc -p tsconfig.json
RUN npm run postbuild

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/web/client/dist ./src/web/client/dist
COPY --from=builder /app/src/web/fieldview/dist ./src/web/fieldview/dist

# Copy package files for runtime dependencies
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Create workspace directory
RUN mkdir -p /app/ff-terminal-workspace

# Expose ports
EXPOSE 28888 8787 8788

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:28888/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Default command
CMD ["npm", "start:daemon"]
```

### Development Dockerfile

Includes development tools for debugging.

```dockerfile
FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    vim \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy all files
COPY . .

# Install all dependencies
RUN npm install

# Expose ports
EXPOSE 28888 8787 8788

# Default to development mode
CMD ["npm", "run", "dev:start"]
```

---

## Docker Compose

### Single Container (Daemon Only)

```yaml
version: '3.8'

services:
  ff-terminal:
    build: .
    container_name: ff-terminal
    restart: unless-stopped
    ports:
      - "28888:28888"
    volumes:
      - ~/.ff-terminal-profiles.json:/app/.ff-terminal-profiles.json:ro
      - ~/ff-terminal-workspace:/app/ff-terminal-workspace
      - ff-logs:/app/ff-terminal-workspace/logs
    environment:
      - NODE_ENV=production
      - FF_DAEMON_LOG=1
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:28888/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  ff-logs:
```

### Multi-Container (Daemon + Web)

```yaml
version: '3.8'

services:
  daemon:
    build: .
    container_name: ff-terminal-daemon
    restart: unless-stopped
    ports:
      - "28888:28888"
    volumes:
      - ~/.ff-terminal-profiles.json:/app/.ff-terminal-profiles.json:ro
      - ~/ff-terminal-workspace:/app/ff-terminal-workspace
      - ff-data:/app/ff-terminal-workspace
      - ff-logs:/app/ff-terminal-workspace/logs
    environment:
      - NODE_ENV=production
      - FF_DAEMON_LOG=1
      - FF_TERMINAL_PORT=28888
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:28888/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - ff-network

  web:
    build: .
    container_name: ff-terminal-web
    restart: unless-stopped
    ports:
      - "8787:8787"
      - "8788:8788"
    volumes:
      - ~/.ff-terminal-profiles.json:/app/.ff-terminal-profiles.json:ro
      - ff-data:/app/ff-terminal-workspace
      - ff-logs:/app/ff-terminal-workspace/logs
    environment:
      - NODE_ENV=production
      - FF_DAEMON_HOST=daemon
      - FF_DAEMON_PORT=28888
      - FF_WEB_PORT=8787
      - FF_FIELDVIEW_PORT=8788
    depends_on:
      daemon:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8787/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - ff-network

networks:
  ff-network:
    driver: bridge

volumes:
  ff-data:
  ff-logs:
```

### Production Setup with Redis

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: ff-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    networks:
      - ff-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  daemon:
    build: .
    container_name: ff-terminal-daemon
    restart: unless-stopped
    ports:
      - "28888:28888"
    volumes:
      - ~/.ff-terminal-profiles.json:/app/.ff-terminal-profiles.json:ro
      - ff-workspace:/app/ff-terminal-workspace
      - ff-logs:/app/ff-terminal-workspace/logs
    environment:
      - NODE_ENV=production
      - FF_DAEMON_LOG=1
      - REDIS_URL=redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - ff-network

  web:
    build: .
    container_name: ff-terminal-web
    restart: unless-stopped
    ports:
      - "8787:8787"
    volumes:
      - ~/.ff-terminal-profiles.json:/app/.ff-terminal-profiles.json:ro
      - ff-workspace:/app/ff-terminal-workspace
      - ff-logs:/app/ff-terminal-workspace/logs
    environment:
      - NODE_ENV=production
      - FF_DAEMON_HOST=daemon
      - FF_DAEMON_PORT=28888
      - REDIS_URL=redis://redis:6379
    depends_on:
      daemon:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - ff-network

networks:
  ff-network:
    driver: bridge

volumes:
  redis-data:
  ff-workspace:
  ff-logs:
```

---

## Usage

### Build and Start

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Scaling Web Servers

```bash
# Scale web service to 3 instances
docker-compose up -d --scale web=3

# Note: Requires load balancer (nginx, traefik) for production
```

### Container Management

```bash
# List running containers
docker ps | grep ff-terminal

# View container logs
docker logs ff-terminal-daemon -f

# Execute command in container
docker exec -it ff-terminal-daemon /bin/bash

# Restart container
docker restart ff-terminal-daemon

# Stop container
docker stop ff-terminal-daemon

# Remove container
docker rm ff-terminal-daemon
```

---

## Volume Management

### Named Volumes

```bash
# List volumes
docker volume ls | grep ff

# Inspect volume
docker volume inspect ff-logs

# Remove volume (with caution)
docker volume rm ff-logs
```

### Bind Mounts

```yaml
volumes:
  # Host directory → Container directory
  - ~/ff-terminal-workspace:/app/ff-terminal-workspace

  # Read-only mount (for configs)
  - ~/.ff-terminal-profiles.json:/app/.ff-terminal-profiles.json:ro
```

### Volume Backups

```bash
# Backup workspace
docker run --rm -v ff-workspace:/data -v $(pwd):/backup \
  alpine tar czf /backup/ff-workspace-backup-$(date +%Y%m%d).tar.gz /data

# Restore workspace
docker run --rm -v ff-workspace:/data -v $(pwd):/backup \
  alpine tar xzf /backup/ff-workspace-backup-YYYYMMDD.tar.gz -C /
```

---

## Environment Variables

### Docker-Specific Variables

```yaml
environment:
  # Core
  - NODE_ENV=production

  # Daemon Configuration
  - FF_TERMINAL_PORT=28888
  - FF_DAEMON_LOG=1

  # Web Configuration
  - FF_WEB_PORT=8787
  - FF_FIELDVIEW_PORT=8788
  - FF_DAEMON_HOST=daemon
  - FF_DAEMON_PORT=28888

  # Workspace
  - FF_WORKSPACE_DIR=/app/ff-terminal-workspace

  # External Services
  - REDIS_URL=redis://redis:6379

  # Models
  - FF_MODEL=anthropic/claude-3-5-sonnet-20241022
  - FF_SUBAGENT_MODEL=openai/gpt-4o-mini
```

### Secrets Management

**Method 1: Docker Secrets (Swarm)**

```yaml
services:
  daemon:
    secrets:
      - openai_api_key
    environment:
      - OPENAI_API_KEY_FILE=/run/secrets/openai_api_key

secrets:
  openai_api_key:
    file: ./secrets/openai_api_key.txt
```

**Method 2: .env File**

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

```yaml
services:
  daemon:
    env_file:
      - .env
```

**Method 3: Environment Variable Injection**

```bash
# Inject host environment into container
docker run -e OPENAI_API_KEY=$OPENAI_API_KEY ff-terminal:latest
```

---

## Networking

### Bridge Network (Default)

```yaml
networks:
  ff-network:
    driver: bridge
```

### Host Network (Performance)

```yaml
services:
  daemon:
    network_mode: host
    # No port mapping needed
```

### Custom Network

```yaml
networks:
  ff-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

---

## Resource Limits

### CPU and Memory Limits

```yaml
services:
  daemon:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Disk Space Limits

```yaml
services:
  daemon:
    tmpfs:
      - /tmp:rw,size=1g
```

---

## Health Checks

### Custom Health Check

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:28888/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 10s
```

### Health Check Status

```bash
# Check health status
docker inspect ff-terminal-daemon | jq '.[0].State.Health'

# Output: {"Status":"healthy", ...}
```

---

## Logging

### Default Logging

```bash
# View logs
docker-compose logs -f daemon

# View last 100 lines
docker logs --tail 100 ff-terminal-daemon

# View logs since timestamp
docker logs --since 2024-01-01T00:00:00 ff-terminal-daemon
```

### Log Drivers

**JSON File (Default)**

```yaml
services:
  daemon:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

**Syslog**

```yaml
services:
  daemon:
    logging:
      driver: "syslog"
      options:
        syslog-address: "tcp://192.168.0.42:123"
```

**Fluentd**

```yaml
services:
  daemon:
    logging:
      driver: "fluentd"
      options:
        fluentd-address: "localhost:24224"
        tag: "ff-terminal"
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs ff-terminal-daemon

# Inspect container
docker inspect ff-terminal-daemon

# Check resource usage
docker stats ff-terminal-daemon
```

### Port Conflicts

```bash
# Find process using port
lsof -i:28888

# Use different port in docker-compose.yml
ports:
  - "28889:28888"
```

### Volume Permissions

```bash
# Fix permissions inside container
docker exec -it ff-terminal-daemon chown -R node:node /app/ff-terminal-workspace

# Use specific user ID
user: "1000:1000"
```

### Build Failures

```bash
# Clean build cache
docker-compose build --no-cache

# Pull fresh base image
docker pull node:20-slim
```

---

## Production Best Practices

1. **Use Multi-Stage Builds** - Minimize image size
2. **Set Resource Limits** - Prevent runaway containers
3. **Enable Health Checks** - Automatic restart on failure
4. **Use Read-Only Config Mounts** - Secure credential management
5. **Centralize Logging** - Use log aggregation service
6. **Tag Images** - Use version tags for rollbacks
7. **Scan for Vulnerabilities** - `docker scan ff-terminal:latest`
8. **Backup Volumes Regularly** - Protect workspace data

---

## Deployment Strategies

### Blue-Green Deployment

```bash
# Build new version
docker build -t ff-terminal:v2 .

# Start green container
docker-compose -f docker-compose.green.yml up -d

# Switch traffic (load balancer)

# Stop blue container
docker-compose -f docker-compose.blue.yml down
```

### Rolling Updates

```bash
# Update image
docker-compose pull
docker-compose up -d --no-deps --build daemon

# Health check automatically handles restart
```

### Canary Deployment

```bash
# Deploy canary to single instance
docker-compose up -d --scale web=1 --no-recreate

# Monitor metrics
# If successful, scale up
docker-compose up -d --scale web=3
```

---

## Summary

| Aspect | Recommendation |
|--------|----------------|
| Base Image | `node:20-slim` |
| Build Strategy | Multi-stage |
| Orchestration | Docker Compose |
| Volumes | Named volumes for data, bind mounts for logs |
| Networking | Custom bridge network |
| Health Checks | Enabled with 30s interval |
| Logging | JSON file with rotation |
| Secrets | Docker secrets or .env file |
| Resource Limits | CPU: 2.0, Memory: 2G |

**Recommended:** Use multi-stage Dockerfile with Docker Compose for production deployments.
