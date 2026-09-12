# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time envs that get baked into the client bundle (NEXT_PUBLIC_*).
# Server-only secrets (API_BASE_URL, SESSION_SECRET) are provided at
# *runtime* via docker-compose, not here.
ARG NEXT_PUBLIC_MAX_FILE_SIZE_MB=25
ENV NEXT_PUBLIC_MAX_FILE_SIZE_MB=$NEXT_PUBLIC_MAX_FILE_SIZE_MB
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
