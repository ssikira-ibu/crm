# CRM

A multi-tenant CRM application for managing companies, contacts, deals, and sales activities — with a built-in AI assistant.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind v4, shadcn/ui
- **Backend:** Koa 3, Prisma 7, PostgreSQL 18
- **Agent:** Koa service backed by the Anthropic SDK (Claude Sonnet 4.6 by default) with tool-calling into the backend API
- **Auth:** Firebase Authentication + HTTP-only session cookies, optional Google login domain gating
- **Shared:** Zod schemas and TypeScript types (`@crm/shared`)
- **Infra:** Docker Compose, GitHub Actions CI/CD, Caddy reverse proxy for zero-downtime rolling deploys, Cloudflare Tunnel

## Architecture

```
browser ──▶ frontend (Next.js BFF, :3001) ──▶ backend (Koa API, :3000) ──▶ PostgreSQL
                  │                                  ▲
                  └──────▶ agent (Koa + Claude, :3002)┘
                              tool calls back into backend via S2S JWT
```

The frontend is the only public surface; it proxies requests to the internal `backend` and `agent` services using short-lived server-to-server JWTs. User sessions are HTTP-only signed cookies. The agent service runs Claude with a tool registry that reads from and writes to the backend on the caller's behalf.

## Project Structure

```
crm/
  backend/          # Koa API server
    prisma/         # Database schema, migrations, seed
    src/
      middleware/   # Auth, org membership, authorize, rate limiting
      routes/       # REST API endpoints
      services/     # Business logic (tenant-scoped, audit-logging)
  frontend/         # Next.js 16 application (BFF)
    src/
      app/          # App Router pages + server actions
      components/   # UI components (shadcn/ui, cmdk)
      lib/          # Session, server-side API client
  agent/            # Claude-powered assistant service
    src/
      routes/       # Chat + conversation endpoints
      tools/        # Tool registry exposed to the model
  packages/shared/  # Shared Zod schemas, types, enums
  scripts/          # Server setup, deploy, and backup scripts
  docs/             # Production deployment guide
```

## Features

- **Companies** — track companies with status (lead, prospect, active, inactive), tags, addresses, and ownership
- **Contacts** — manage contacts with phone numbers and email addresses, linked to companies
- **Deals** — customizable sales pipelines with stage-based funnel view, won/lost tracking, expected close dates, and a per-deal detail page with stage progression, activity timeline, and metadata sidebar
- **Pipelines** — multiple pipelines per organization with admin-managed stages and colors; a starter pipeline is provisioned automatically on signup
- **Activities** — log calls, emails, meetings, and other interactions
- **Notes** — rich text notes on companies, contacts, and deals
- **Tasks** — task management with due dates and completion tracking
- **AI assistant** — conversational agent that can answer questions about your data and take actions (create companies, contacts, deals, activities, tasks, notes; update deals and tasks) with approval UI for mutating tool calls
- **Filtering & search** — multi-facet filtering on deals (search, status, stage, owner) and full-text search across companies
- **Dashboard** — metrics overview and Cmd+K command palette
- **Multi-tenancy** — organization-based isolation with role-based access (Admin, Manager, Salesperson) and per-row owner restrictions for Salespeople
- **Team invites** — secure token-based invite links
- **Audit trail** — event logging for all mutating operations
- **Soft delete** — Prisma soft-delete middleware preserves history for audit and recovery

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

Secrets live in the root `.env` (single source of truth) and are interpolated into Docker Compose; `backend/.env` and `frontend/.env.local` hold only non-secret, service-specific config. `S2S_JWT_SECRET` must match between backend, frontend, and agent. `SESSION_SECRET` is frontend-only.

Set `ANTHROPIC_API_KEY` in the root `.env` to enable the AI assistant. Optionally set `ANTHROPIC_MODEL` (defaults to `claude-sonnet-4-6`).

Fill in your Firebase client config (`NEXT_PUBLIC_*` values) in `frontend/.env.local`. To restrict Google sign-in to specific email domains, configure the allow-list in the frontend environment.

Download your Firebase service account key (Firebase Console > Project settings > Service accounts > Generate new private key) and save it as `firebase-service-account.json` in the project root.

Local secrets live next to the service that reads them. Production uses `.env.production.example` as its template and injects Firebase Admin credentials as `FIREBASE_SERVICE_ACCOUNT_JSON`; see `docs/PRODUCTION.md`.

### 3. Start the development environment

```bash
docker compose up
```

This starts PostgreSQL, runs database migrations, and launches the backend (port 3000), agent (port 3002), and frontend (port 3001).

### 4. Access the application

Open [http://localhost:3001](http://localhost:3001) in your browser.

## Seeding sample data

The seed script populates the database with realistic sample data (20 companies, 43 contacts, 26 deals, 46 activities, etc.) by calling the backend API, ensuring all side effects like the audit event log are generated automatically.

**Prerequisites:** the full Docker stack must be running (`docker compose up`).

```bash
# Seed for a specific user (look up your UID first)
docker compose exec db psql -U crm_user -d crm_dev -c "SELECT id, email FROM users;"

docker compose exec \
  -e SEED_USER_ID="<firebase-uid>" \
  -e SEED_USER_EMAIL="<email>" \
  -e SEED_USER_NAME="<display-name>" \
  -e S2S_JWT_SECRET="<your-s2s-secret>" \
  -e API_URL="http://backend:3000" \
  backend npx tsx prisma/seed.ts
```

To reset all CRM data before re-seeding:

```bash
docker compose exec db psql -U crm_user -d crm_dev -c "
TRUNCATE events, tasks, notes, activities, deals, company_tags, tags,
  phone_numbers, addresses, contacts, companies, pipeline_stages, pipelines,
  custom_field_values, custom_field_definitions CASCADE;
"
```

## Development

Run outside Docker for faster iteration:

```bash
# Terminal 1 - Start PostgreSQL only
docker compose up db

# Terminal 2 - Backend
cd backend && npm run dev

# Terminal 3 - Frontend
cd frontend && npm run dev

# Terminal 4 - Agent (optional, only if working on AI features)
cd agent && npm run dev
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

1. Builds Docker images for backend, frontend, and agent
2. Pushes images to GitHub Container Registry
3. Deploys to the production server via SSH
4. Runs database migrations
5. Performs a zero-downtime rolling restart behind Caddy and verifies health checks (`/health` on backend/agent, `/api/health` on frontend)

Production fronts the stack with Caddy as a reverse proxy and uses Cloudflare Tunnel for zero-trust ingress. See `docker-compose.prod.yml`, `Caddyfile`, `.env.production.example`, and `docs/PRODUCTION.md`.
