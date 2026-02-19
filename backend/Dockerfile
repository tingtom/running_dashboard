# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci

# Copy backend source
COPY backend/src ./src
COPY backend/tsconfig.json ./
RUN npm run build

# Build frontend
WORKDIR /app/frontend-build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Production stage
FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy backend package files and install production dependencies only
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend compiled files
COPY --from=builder /app/dist ./dist

# Copy frontend build
COPY --from=builder /app/frontend-build/dist ./public



# Create data directories
RUN mkdir -p /data /logs

# Change ownership
RUN chown -R nodejs:nodejs /app /data /logs /config

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV CONFIG_PATH=/config/config.json

CMD ["node", "dist/index.js"]
