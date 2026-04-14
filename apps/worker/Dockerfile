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


# ==================== Runner (lprd-core-worker) ====================
FROM oven/bun:1.3.12-debian AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

RUN bunx playwright install chromium --with-deps && \
    chmod -R 755 /ms-playwright

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY apps/worker ./apps/worker
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared
COPY packages/typescript-config ./packages/typescript-config

ENV NODE_ENV=production

COPY apps/worker/entrypoint.sh /entrypoint.sh
RUN chmod 755 /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
