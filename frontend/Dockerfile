FROM node:24-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./

# Development
FROM base AS development
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM node:24-alpine AS production
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
