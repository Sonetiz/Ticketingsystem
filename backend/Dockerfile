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
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm
EXPOSE 3001
CMD ["node", "dist/main.js"]
