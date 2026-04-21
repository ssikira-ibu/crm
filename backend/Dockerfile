FROM node:24-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY backend/prisma.config.ts ./backend/
COPY backend/prisma ./backend/prisma/

# Development
FROM base AS development
RUN npm install --workspace=packages/shared --workspace=backend --include-workspace-root
COPY packages/shared ./packages/shared/
RUN npm run --workspace=packages/shared build
COPY backend ./backend/
RUN cd backend && npx prisma generate
WORKDIR /app/backend
CMD ["npx", "tsx", "watch", "src/index.ts"]

# Build
FROM base AS build
RUN npm ci --workspace=packages/shared --workspace=backend --include-workspace-root
COPY packages/shared ./packages/shared/
RUN npm run --workspace=packages/shared build
COPY backend ./backend/
RUN cd backend && npx prisma generate
RUN npm run --workspace=backend build

# Production
FROM node:24-alpine AS production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app/backend
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/shared ../packages/shared
COPY --from=build /app/backend/package.json ./
COPY --from=build /app/backend/prisma ./prisma
COPY --from=build /app/backend/prisma.config.ts ./prisma.config.ts
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
