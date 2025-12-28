# ===========================
# AI Art Generator - Standalone
# Multi-model AI image generation
# ===========================
#
# Environment variables (configure via your deployment platform):
# - REPLICATE_API_TOKEN (required for AI generation)
# - PORT (default: 3000)
# - NODE_ENV (default: production)
#
# ===========================

FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy frontend files
COPY frontend/package.json ./
RUN npm install

COPY frontend/public ./public
COPY frontend/src ./src

# Build frontend
RUN npm run build

# ===========================
# Production Stage
# ===========================
FROM node:18-alpine

# Install system dependencies (Python for DPI processing)
RUN apk add --no-cache \
    python3 py3-pip \
    build-base jpeg-dev zlib-dev \
    curl su-exec

# Create Python virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv "$VIRTUAL_ENV"
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python packages (PIL for DPI processing)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir pillow

# Set up Node.js app
WORKDIR /app
ENV NODE_ENV=production

# Copy backend files
COPY backend/package.json ./
RUN npm install

COPY backend/server.js ./

# Copy frontend build from builder stage
COPY --from=frontend-builder /app/frontend/build /app/build

# Create uploads directory for persistent storage
# This directory can be mounted as a volume in Coolify
RUN mkdir -p /app/uploads/generated /app/uploads/customer

# Create user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S artgen -u 1001 -G nodejs && \
    chown -R artgen:nodejs /app /app/uploads

# Define volume for persistent storage (mountable in Coolify)
VOLUME ["/app/uploads"]

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Use entrypoint to handle permissions, then start the app
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
