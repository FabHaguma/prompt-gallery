# Multi-stage build for Node.js + static frontend

# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Stage 2: Runtime with Nginx
FROM nginx:alpine

# Install nodejs and npm for running the backend server
RUN apk add --no-cache nodejs npm

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy application from builder
COPY --from=builder /app /app

WORKDIR /app

# Expose port (Nginx will listen on this)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start Nginx in the foreground and run the Node.js server
CMD ["sh", "-c", "nginx -g 'daemon off;' & node server.js"]
