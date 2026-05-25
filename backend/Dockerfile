FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY . .
RUN pnpm --filter shared build
RUN cd backend && npx prisma generate
RUN pnpm --filter backend build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_PATH=/app/backend/node_modules:/app/node_modules
ENV TS_NODE_TRANSPILE_ONLY=1
ENV TS_NODE_COMPILER_OPTIONS='{"module":"CommonJS","moduleResolution":"node"}'
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
RUN printf '#!/bin/sh\ncd /app/backend && exec ./node_modules/.bin/prisma "$@"\n' > /usr/local/bin/prisma \
  && printf '#!/bin/sh\ncd /app/backend && exec ./node_modules/.bin/ts-node "$@"\n' > /usr/local/bin/ts-node \
  && chmod +x /usr/local/bin/prisma /usr/local/bin/ts-node
EXPOSE 3001
CMD ["node", "dist/main.js"]
