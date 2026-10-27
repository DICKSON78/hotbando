# Stage 1: Build the Vue frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci && npm cache clean --force
COPY frontend/ ./
RUN npm run build

# Stage 2: Build backend dependencies
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Production image
FROM node:18-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S hotbando && \
    adduser -S hotbando -u 1001 -G hotbando

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files and the built Vue SPA
COPY . .
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create required directories with proper permissions
RUN mkdir -p /app/public/uploads /app/public/ads /app/logs /app/tmp && \
    mkdir -p /etc/wireguard/hotbando-keys && \
    chown -R hotbando:hotbando /app /etc/wireguard && \
    chmod 755 /etc/wireguard

# Switch to non-root user
USER hotbando

# Health check using node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', r => {process.exit(r.statusCode===200?0:1)}).on('error', () => process.exit(1))" || exit 1

EXPOSE 3000

CMD ["node", "index.js"]
