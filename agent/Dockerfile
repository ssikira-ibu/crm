FROM node:24-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY agent/package.json ./agent/

# Development
FROM base AS development
RUN npm install --workspace=packages/shared --workspace=agent --include-workspace-root
COPY packages/shared ./packages/shared/
RUN npm run --workspace=packages/shared build
COPY agent ./agent/
WORKDIR /app/agent
CMD ["npx", "tsx", "watch", "src/index.ts"]

# Build
FROM base AS build
RUN npm ci --workspace=packages/shared --workspace=agent --include-workspace-root
COPY packages/shared ./packages/shared/
RUN npm run --workspace=packages/shared build
COPY agent ./agent/
RUN npm run --workspace=agent build

# Production
FROM node:24-alpine AS production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app/agent
COPY --from=build /app/agent/dist ./dist
COPY --from=build /app/agent/node_modules ./node_modules
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/shared ../packages/shared
COPY --from=build /app/agent/package.json ./
USER app
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1
CMD ["node", "dist/index.js"]
