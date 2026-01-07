# Stage 1: Dependencies
# Using Debian-slim for Prisma + ARM64 + OpenSSL 3 compatibility
FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production database path for build
ENV SQLITE_URL="file:/data/hass-dashboard.db"

# Generate Prisma client for linux-arm64-openssl-3.0.x
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install gosu for privilege dropping (Debian equivalent of su-exec)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Create app user (will be used after entrypoint fixes permissions)
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Create data directory with correct ownership
RUN mkdir -p /data && chown nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app

# Run as root initially - entrypoint will fix /data permissions then drop to nextjs
USER root

EXPOSE 80

ENV PORT=80
ENV SQLITE_URL="file:/data/hass-dashboard.db"

ENTRYPOINT ["./docker-entrypoint.sh"]
