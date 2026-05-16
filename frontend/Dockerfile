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
# NEXT_PUBLIC_* vars are inlined into the client bundle by `next build`,
# so they must be present as env at build time (not just at runtime).
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
# Server-only env is validated while Next analyzes routes. These build-only
# placeholders are not copied into the production image; runtime env comes from
# docker-compose.prod.yml.
ENV SESSION_SECRET=build-session-secret-that-is-at-least-32-characters \
    S2S_JWT_SECRET=build-s2s-secret-that-is-at-least-32-characters \
    GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-service-account.json
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
# Next.js standalone output preserves the workspace layout under /app.
# server.js ends up at /app/frontend/server.js; static + public go under it.
COPY --from=build /app/frontend/.next/standalone ./
COPY --from=build /app/frontend/.next/static ./frontend/.next/static
COPY --from=build /app/frontend/public ./frontend/public
USER app
WORKDIR /app/frontend
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/ || exit 1
CMD ["node", "server.js"]
