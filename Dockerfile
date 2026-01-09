# Stage 1: Dependencies
# Using Debian-slim for Prisma + ARM64 + OpenSSL 3 compatibility
FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-bookworm-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma client generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production database path for build
ENV SQLITE_URL="file:/data/hass-dashboard.db"

# Generate Prisma client for linux-arm64-openssl-3.0.x
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1

# Bundle gateway and ws-proxy with esbuild
RUN npx esbuild server/gateway.ts --bundle --platform=node --target=node20 --outfile=server/gateway.js --external:child_process --external:http --external:net --external:fs --external:path
RUN npx esbuild server/ws-proxy.ts --bundle --platform=node --target=node20 --outfile=server/ws-proxy.js --external:@prisma/client --external:ws --external:cookie --external:crypto --external:fs --external:path

RUN npm run build

# Stage 3: Runner
FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install gosu for privilege dropping and download official go2rtc ARM64 binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    openssl \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Download official go2rtc ARM64 binary (more reliable than npm package)
RUN curl -L https://github.com/AlexxIT/go2rtc/releases/download/v1.9.4/go2rtc_linux_arm64 --output /usr/local/bin/go2rtc && \
    chmod +x /usr/local/bin/go2rtc

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
COPY --from=builder /app/node_modules/ws ./node_modules/ws
COPY --from=builder /app/node_modules/cookie ./node_modules/cookie
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server/gateway.js ./server/gateway.js
COPY --from=builder /app/server/ws-proxy.js ./server/ws-proxy.js
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && \
    chown -R nextjs:nodejs /app

# Run as root initially - entrypoint will fix /data permissions then drop to nextjs
USER root

EXPOSE 80

ENV PORT=80
ENV SQLITE_URL="file:/data/hass-dashboard.db"

ENTRYPOINT ["./docker-entrypoint.sh"]
