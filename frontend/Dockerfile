FROM node:24-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY frontend/package.json ./frontend/

# Development
FROM base AS development
RUN npm install --workspace=packages/shared --workspace=frontend --include-workspace-root
COPY packages/shared ./packages/shared/
RUN npm run --workspace=packages/shared build
COPY frontend ./frontend/
WORKDIR /app/frontend
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build
FROM base AS build
RUN npm ci --workspace=packages/shared --workspace=frontend --include-workspace-root
COPY packages/shared ./packages/shared/
RUN npm run --workspace=packages/shared build
COPY frontend ./frontend/
WORKDIR /app/frontend
RUN npm run build

# Production
FROM node:24-alpine AS production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./.next/static
COPY --from=build /app/frontend/public ./public
USER app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/ || exit 1
CMD ["node", "server.js"]
