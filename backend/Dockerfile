FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Development
FROM base AS development
RUN npm install
COPY . .
RUN npx prisma generate
CMD ["npx", "tsx", "watch", "src/index.ts"]

# Build
FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production
FROM node:24-alpine AS production
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
