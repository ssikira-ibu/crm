# CRM

A multi-tenant CRM application for managing customers, contacts, deals, and sales activities.

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, shadcn/ui
- **Backend:** Koa, Prisma, PostgreSQL
- **Auth:** Firebase Authentication + JWT sessions
- **Shared:** Zod schemas and TypeScript types (`@crm/shared`)
- **Infra:** Docker Compose, GitHub Actions CI/CD, Cloudflare Tunnel

## Architecture

```
frontend (Next.js BFF)  -->  backend (Koa API)  -->  PostgreSQL
       |                          |
   Firebase Auth            Prisma ORM
   Session cookies          S2S JWT auth
```

The frontend acts as a BFF (Backend for Frontend), proxying authenticated requests to the internal Koa API using server-to-server JWTs. User sessions are managed via HTTP-only cookies.

## Project Structure

```
crm/
  backend/          # Koa API server
    prisma/         # Database schema & migrations
    src/
      middleware/   # Auth, org membership, rate limiting
      routes/       # REST API endpoints
      services/     # Business logic
  frontend/         # Next.js application
    src/
      app/          # Pages and server actions
      components/   # UI components (shadcn/ui)
      lib/          # Auth, session, API client
  packages/shared/  # Shared Zod schemas, types, enums
  scripts/          # Server setup & backup scripts
```

## Features

- **Customers** - Track customers with status (lead, prospect, active, inactive), tags, and ownership
- **Contacts** - Manage contacts with phone numbers and email addresses
- **Deals** - Sales pipeline with open/won/lost tracking and expected close dates
- **Activities** - Log calls, emails, meetings, and other interactions
- **Notes** - Rich text notes on customers, contacts, and deals
- **Reminders** - Task management with due dates and completion tracking
- **Search** - Full-text search across customers
- **Dashboard** - Metrics overview
- **Command Palette** - Cmd+K quick navigation
- **Multi-tenancy** - Organization-based isolation with role-based access (Admin, Manager, Salesperson)
- **Team Invites** - Invite members via secure token links
- **Audit Trail** - Event logging for all entity changes

## Prerequisites

- Node.js 24
- Docker & Docker Compose
- Firebase project (for authentication)

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo-url> && cd crm
npm install
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Generate auth secrets:

```bash
openssl rand -base64 32  # S2S_JWT_SECRET
openssl rand -base64 32  # SESSION_SECRET
```

Set `S2S_JWT_SECRET` to the same value in `backend/.env` and `frontend/.env.local`. Set `SESSION_SECRET` only in `frontend/.env.local`.

Fill in your Firebase client config (`NEXT_PUBLIC_*` values) in `frontend/.env.local`.

Download your Firebase service account key (Firebase Console > Project settings > Service accounts > Generate new private key) and save it as `firebase-service-account.json` in the project root.

Local secrets live next to the service that reads them. Production uses `.env.production.example` as its template and injects Firebase Admin credentials as `FIREBASE_SERVICE_ACCOUNT_JSON`; see `docs/PRODUCTION.md`.

### 3. Start the development environment

```bash
docker compose up
```

This starts PostgreSQL, runs database migrations, and launches both the backend (port 3000) and frontend (port 3001).

### 4. Access the application

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Development

Run outside Docker for faster iteration:

```bash
# Terminal 1 - Start PostgreSQL only
docker compose up db

# Terminal 2 - Backend
cd backend && npm run dev

# Terminal 3 - Frontend
cd frontend && npm run dev
```

### Useful commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all workspaces in dev mode |
| `cd backend && npm run db:migrate` | Create a new migration |
| `cd backend && npm run db:migrate:deploy` | Apply pending migrations |
| `cd backend && npm run db:studio` | Open Prisma Studio GUI |
| `cd frontend && npm run typecheck` | Run TypeScript checks |
| `cd frontend && npm run lint` | Run ESLint |

## Deployment

Pushing to `main` triggers the GitHub Actions pipeline which:

1. Builds Docker images for backend and frontend
2. Pushes images to GitHub Container Registry
3. Deploys to the production server via SSH
4. Runs database migrations
5. Verifies health checks

Production uses Cloudflare Tunnel for zero-trust ingress. See `docker-compose.prod.yml` and `.env.production.example` for production configuration.
