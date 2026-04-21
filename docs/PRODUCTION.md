# Production Deployment

Reference for operating CRM in production. For local dev setup see the root `README.md`.

## Topology

```
user -> Cloudflare (TLS, WAF, DNS for crm.ssikira.com)
     -> Cloudflare Tunnel (outbound only, no inbound ports on the box)
     -> docker network "crm_default" on Hetzner VPS
          tunnel -> frontend:3001 (Next.js BFF, standalone output)
          frontend -> backend:3000 (Koa, S2S JWT)
          backend  -> db:5432 (Postgres 17)
                    redis:6379 (rate limiting)
```

No inbound HTTP ports on the VPS — only `22/tcp` (SSH) is open in ufw. All web traffic arrives via the outbound cloudflared connection.

## Infrastructure

| Component | Where | Notes |
|---|---|---|
| Domain | Cloudflare (`ssikira.com`) | Free plan, full-strict TLS |
| Public hostname | `crm.ssikira.com` | CNAME auto-created by the tunnel |
| Tunnel | Cloudflare Zero Trust > Networks > Tunnels | `crm-prod` connector, published application routing `crm.ssikira.com` -> `http://frontend:3001` |
| VPS | Hetzner CPX21 (or similar), Falkenstein, Ubuntu 24.04 | IPv4 `178.104.210.26` |
| Registry | GHCR (`ghcr.io/ssikira-ibu/crm/{backend,frontend}`) | Images pushed from CI |
| Firebase | Same project as dev | `crm.ssikira.com` is an authorized domain |

## Server layout

```
/home/deploy/
  .ssh/authorized_keys       # deploy key only, root login disabled
  crm/
    .env                     # prod secrets; chmod 600
    docker-compose.prod.yml  # synced from the repo by CI
    .last_deployed_tag       # last successful image SHA (rollback target)
    backups/                 # pg_dump output, 7-day rolling
```

Bootstrap is done via `scripts/cloud-init.yml` (paste as user-data when creating the server). It installs Docker, creates the `deploy` user, locks SSH (`PermitRootLogin no`, `PasswordAuthentication no`), configures ufw (deny incoming except 22), sets up fail2ban for sshd, and enables unattended security updates.

## Environment variables

Everything the stack needs lives in `/home/deploy/crm/.env`. Template is `.env.example`. Keys:

| Key | Source | Notes |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | generated via `openssl rand -base64 32` | never reused from dev |
| `SESSION_SECRET` | `openssl rand -base64 32` | signs BFF session cookie |
| `S2S_JWT_SECRET` | `openssl rand -base64 32`, >= 32 chars | signs the short-lived JWT from BFF to Koa; must match both services |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | single-line JSON via `jq -c . key.json` | **must be wrapped in single quotes** in `.env` to survive `source .env`: `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":...}'` |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase console | present both in `.env` *and* in GitHub Actions secrets (see below) |
| `TUNNEL_TOKEN` | Cloudflare tunnel setup | starts with `eyJ...` |
| `DOMAIN` | `crm.ssikira.com` | used as `ALLOWED_ORIGINS=https://${DOMAIN}` for backend CORS |
| `IMAGE_PREFIX` | `ghcr.io/ssikira-ibu/crm` | required when running `docker compose` manually on the server; CI exports it automatically |
| `IMAGE_TAG` | commit SHA | optional; defaults to `latest` |

`NEXT_PUBLIC_*` values have to exist in **two** places because Next.js inlines them at build time (GH secrets, consumed as `docker build --build-arg`) **and** at runtime (compose env, for server-side rendering).

## GitHub Actions

`production` environment secrets:

| Secret | Purpose |
|---|---|
| `SERVER_HOST` | `178.104.210.26` |
| `SSH_PRIVATE_KEY` | contents of `~/.ssh/crm_deploy` (dedicated deploy key, not a personal one) |
| `GHCR_PAT` | PAT with `read:packages` + `write:packages` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | inlined into client JS at build time |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | same |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | same |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same |

## Deploy flow

Triggered by any push to `main`.

1. **Build** (matrix: backend + frontend). `docker/build-push-action@v6` builds the `production` target for each Dockerfile and pushes two tags per image: `:${sha}` and `:latest`. Frontend build receives `NEXT_PUBLIC_*` as `--build-arg`s so they're baked into the JS bundle.
2. **Deploy**. `scp` the current `docker-compose.prod.yml` to `~/crm/`, then SSH and run:
   - `set -a && source .env && set +a` — load secrets
   - read `.last_deployed_tag` into `PREVIOUS_TAG` (for rollback)
   - `docker login ghcr.io` with `GHCR_PAT`
   - `docker compose pull backend frontend` then `up -d --remove-orphans`
   - `sleep 10`, then run backend `/health` via `docker compose exec`
   - on success: write the new SHA to `.last_deployed_tag`, `docker image prune -f`
   - on failure: re-export `IMAGE_TAG=$PREVIOUS_TAG`, pull, bring up again, re-check. If that also fails, `exit 2` (manual intervention).

Rollback safety note: on the very first deploy, `PREVIOUS_TAG` defaults to `latest`, which is the same broken image you just pushed. First deploy has no safety net — intentional, since there's nothing to roll back to.

## Routine operations

**Check stack health.** SSH in, then:

```bash
cd ~/crm
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs backend --tail 50
```

Ignore the `IMAGE_PREFIX` warning on manual invocations — compose is reading a live image via `pull`, but the substitution in the compose file warns. To silence, `export IMAGE_PREFIX=ghcr.io/ssikira-ibu/crm` in your shell or add to `~/.bashrc`.

**Force a redeploy without a code change.**

```bash
cd <repo>
git commit --allow-empty -m "redeploy"
git push
```

**Restart a single service.**

```bash
export IMAGE_PREFIX=ghcr.io/ssikira-ibu/crm
export IMAGE_TAG=$(cat ~/crm/.last_deployed_tag)
docker compose -f ~/crm/docker-compose.prod.yml up -d <service>
```

**Change an env var without rebuilding.** Edit `~/crm/.env`, then the above `up -d` for affected services. `NEXT_PUBLIC_*` changes **don't** take effect without a rebuild because they're inlined into the JS bundle — push a commit to CI instead.

## Backups

`scripts/backup.sh` takes nightly `pg_dump` snapshots to `~/crm/backups/`, custom format, 7-day retention. Install the cron as the `deploy` user:

```bash
crontab -e
# add:
0 3 * * * /home/deploy/crm/scripts/backup.sh >> /home/deploy/crm/backups/backup.log 2>&1
```

Dumps are local-only. For offsite copies, pipe through `gpg --symmetric` and `rclone`/`aws s3 cp` — not currently wired up.

**Restore** (destroys current DB):

```bash
docker compose -f ~/crm/docker-compose.prod.yml exec -T db \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  < ~/crm/backups/crm_YYYYMMDD_HHMMSS.dump
```

## Runbook: things that went wrong during bring-up

Captured here so we don't rediscover them.

| Symptom | Cause | Fix |
|---|---|---|
| `ERR_MODULE_NOT_FOUND: Cannot find package 'jose'` on backend start | Dockerfile copied workspace `node_modules` to the wrong path | Keep `WORKDIR /app/backend` and copy both the workspace's own `node_modules` and the hoisted root `node_modules` to the paths Node's resolver expects |
| `Cannot find module '/app/server.js'` on frontend start | Next.js standalone output preserves the workspace layout (`/app/frontend/server.js`, not `/app/server.js`) | Copy standalone tree into `/app`, then `WORKDIR /app/frontend` and CMD `node server.js` |
| Frontend reachable externally but marked `unhealthy` in `docker ps` | In Alpine, `localhost` resolves to `::1` only, but Next binds IPv4 via `HOSTNAME=0.0.0.0` | Healthcheck uses `http://127.0.0.1:3001/`, not `localhost` |
| 502 at `crm.ssikira.com` after deploy, logs show frontend listening on `:3000` | Next standalone defaults to PORT=3000 | Set `PORT=3001` and `HOSTNAME=0.0.0.0` in compose env for frontend |
| `failed to compute cache key: "/app/frontend/public": not found` | Empty `public/` dir isn't tracked by git, so Docker's `COPY frontend ./frontend/` drops it | Add `frontend/public/.gitkeep` |
| `FirebaseError: auth/invalid-api-key` in browser | `NEXT_PUBLIC_*` env vars were set via compose (runtime) only; Next inlines them at build time, so the JS bundle had empty values | Pass them as `--build-arg`s in CI, declare as `ARG` + `ENV` in the frontend Dockerfile build stage |
| `/api/auth/session` returns 401, `JSON.parse` error on service account | `.env` value wasn't wrapped in outer single quotes, so `source .env` stripped the inner double quotes from the JSON | `FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'` — OUTER single quotes, preserve inner double quotes. Or base64-encode and decode in code. |
| CSP blocks `eval()` in browser | Firebase JS SDK uses `new Function()` internally | `'unsafe-eval'` added to `script-src` in prod; other CSP directives still enforced |
| `docker compose up` fails with `invalid reference format`, image name prefixed with empty string | `IMAGE_PREFIX` / `IMAGE_TAG` not set in the shell | `export IMAGE_PREFIX=ghcr.io/ssikira-ibu/crm && export IMAGE_TAG=$(cat ~/crm/.last_deployed_tag)` before `docker compose` commands |

## Hardening posture

- No inbound web ports on the VPS; all traffic via Cloudflare Tunnel (outbound-initiated).
- SSH: key-only, root login disabled, fail2ban on sshd, ufw default-deny.
- Unattended security upgrades enabled.
- Session cookie: `HttpOnly; Secure; SameSite=Strict`.
- CSRF: `proxy.ts` enforces `Origin == Host` for all mutating requests to `/api/*` on the BFF. Server Actions have the same check built in.
- Security headers (CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy) set in `next.config.ts`.
- Rate limiting: per-authenticated-user (600 req/min) in Koa, backed by Redis so it survives restarts and would work across replicas.
- Container resource limits (`deploy.resources.limits`) sized to ~2.3GB total memory ceiling.
- Backend, DB, Redis never `ports:`-published; only reachable via the compose network.
- Firebase Admin private key passed via env var, never volume-mounted. No service-account JSON files on disk.

Outstanding items — worth addressing before a wider user base:

- Rotate the service-account JSON periodically; no rotation mechanism for `SESSION_SECRET` / `S2S_JWT_SECRET` yet (planned: dual-secret verify with `*_OLD` fallback).
- Backups are on-disk only; add offsite before relying on them.
- Consider switching `FIREBASE_SERVICE_ACCOUNT_JSON` to `_B64` to eliminate the shell-quoting footgun.
