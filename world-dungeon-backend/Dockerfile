# Stage 1: Dependencies & Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 fastify

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./
RUN npm ci --only=production

COPY --from=builder --chown=fastify:nodejs /app/dist ./dist

USER fastify

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "dist/index.js"]
