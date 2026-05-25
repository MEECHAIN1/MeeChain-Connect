# ============================================================
# MeeChain Dashboard — Dockerfile
# Compatible with: Docker, Podman (rootless), Termux proot-distro
# Node.js 20 LTS Alpine — lightweight production image
# ============================================================

# ── Stage 1: Builder ────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (layer cache)
COPY package.json package-lock.json ./

# Install production + dev deps (needed for build step)
RUN npm ci --prefer-offline --no-audit

# Copy source files
COPY . .

# Run optional build step (generates compiled pages if script exists)
RUN node scripts/build-pages.mjs 2>/dev/null || true

# ── Stage 2: Production Image ────────────────────────────────
FROM node:20-alpine AS production

# Non-root user for Podman rootless compatibility
# UID 1001 avoids conflict with host 'user' (1000)
RUN addgroup -g 1001 -S meechain && \
    adduser  -u 1001 -S meechain -G meechain

WORKDIR /app

# Copy production node_modules from builder
COPY --from=builder --chown=meechain:meechain /app/node_modules ./node_modules

# Copy application source
COPY --chown=meechain:meechain . .

# Create logs directory with correct ownership
RUN mkdir -p /app/logs && chown meechain:meechain /app/logs

# Switch to non-root user (required for Podman rootless)
USER meechain

# Expose application port
EXPOSE 3000

# Health check — polls /api/health every 30s
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health | grep -q '"status":"ok"' || exit 1

# Environment defaults (override via .env or -e flags)
ENV NODE_ENV=production \
    PORT=3000 \
    CHAIN_ID=13390

# Start server
CMD ["node", "server.js"]
