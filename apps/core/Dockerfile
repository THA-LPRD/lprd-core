FROM oven/bun:1.3.12-debian AS deps
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY apps/core/package.json ./apps/core/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/backend/package.json ./packages/backend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN bun install --frozen-lockfile


# ==================== Build stage ====================
FROM oven/bun:1.3.12-debian AS builder
WORKDIR /app

ARG NEXT_PUBLIC_CONVEX_URL
ARG NEXT_PUBLIC_WORKOS_REDIRECT_URI
ENV NEXT_PUBLIC_CONVEX_URL=$NEXT_PUBLIC_CONVEX_URL \
    NEXT_PUBLIC_WORKOS_REDIRECT_URI=$NEXT_PUBLIC_WORKOS_REDIRECT_URI \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/core/node_modules ./apps/core/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY . .

RUN mkdir -p apps/core/public
RUN bunx turbo run build --filter=@workspace/core


# ==================== Runner (lprd-core) ====================
FROM oven/bun:1.3.12-debian AS runner

ARG PUID=1000
ARG PGID=1000

RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PUID=${PUID} \
    PGID=${PGID}

COPY --from=builder --chown=bun:bun /app/apps/core/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/apps/core/.next/static ./apps/core/.next/static
COPY --from=builder --chown=bun:bun /app/apps/core/public ./apps/core/public

COPY apps/core/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
