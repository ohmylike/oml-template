# oml-__SERVICE_NAME__

Monorepo for the __SERVICE_NAME__ service on ohmylike.app.

## Setup

This repository was created from [oml-template](https://github.com/ohmylike/oml-template).

Create the GitHub repo without `--push`, bootstrap locally, sync secrets, enable production deploy,
then do the first push:

```bash
gh repo create ohmylike/oml-__SERVICE_NAME__ --private --source=. --remote=origin
./bootstrap.sh __SERVICE_NAME__
./scripts/sync-github-secrets.sh \
  --turso-production-auth-token-ref 'op://ohmylike-prod/<service_name>-prod/turso/auth_token' \
  --enable-production-deploy
git add -A && git commit -m "bootstrap: initialize oml-__SERVICE_NAME__" && git push
```

Do not use `gh repo create --push` for the first initialization. The intended order is
`repo create -> bootstrap -> secret sync -> enable deploy -> first push`.

Before `./bootstrap.sh`, make sure Cloudflare and Turso CLIs are authenticated:

```bash
turso auth whoami
npx wrangler whoami
```

Before `./scripts/sync-github-secrets.sh`, make sure GitHub CLI and 1Password CLI are authenticated:

```bash
gh auth status
op whoami
```

`./bootstrap.sh` now creates both `oml-__SERVICE_NAME__-uploads` and `oml-__SERVICE_NAME__-uploads-dev`,
creates `oml-__SERVICE_NAME__-db-prod` and `oml-__SERVICE_NAME__-db-dev`, and writes a local `.dev.vars`
with the dev DB URL and token for `wrangler dev`. The script is safe to rerun until it completes and deletes itself.

If the GitHub organization is on the Free plan and organization secrets are not available for the new private repo,
run the shared repo secret sync explicitly before the first push:

```bash
REPO=ohmylike/oml-__SERVICE_NAME__
op read 'op://ohmylike-prod/cloudflare/api_token' | gh secret set CLOUDFLARE_API_TOKEN --repo "$REPO"
op read 'op://ohmylike-prod/cloudflare/account_id' | gh secret set CLOUDFLARE_ACCOUNT_ID --repo "$REPO"
op read 'op://ohmylike-prod/turso/api_token' | gh secret set TURSO_API_TOKEN --repo "$REPO"
op read 'op://ohmylike-prod/turso/preview_auth_token' | gh secret set TURSO_PREVIEW_AUTH_TOKEN --repo "$REPO"
```

`TURSO_PRODUCTION_AUTH_TOKEN` is still required per service, so keep using
`./scripts/sync-github-secrets.sh --turso-production-auth-token-ref ...` or set that secret separately.

## Structure

```
apps/
  api/     Hono API (Cloudflare Workers)
  cli/     CLI tool (gunshi)
  web/     React SPA (TanStack Router + Query, Cloudflare Workers)
  www/     Landing site (TanStack Start, SSR)
packages/
  core/        Business logic, DB schema (Drizzle + Turso)
  api-client/  Type-safe API client (Hono RPC)
```

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm dev          # api + web
pnpm dev:www      # www (TanStack Start)
pnpm dev:cli      # cli
```

## Deploy

```bash
./scripts/sync-github-secrets.sh \
  --turso-production-auth-token-ref 'op://ohmylike-prod/<service_name>-prod/turso/auth_token' \
  --enable-production-deploy
pnpm deploy       # api + web to production
```

Preview environments are automatically created on PR open and destroyed on PR close.
Production deploy workflow also requires the GitHub repo secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `TURSO_API_TOKEN`, `TURSO_PREVIEW_AUTH_TOKEN`, and service-specific `TURSO_PRODUCTION_AUTH_TOKEN`.
It is gated by repo variable `OML_ENABLE_PRODUCTION_DEPLOY=1`, which the sync script can set for you.
Preview deploy skips itself until the required preview secrets are available, so a new repo can stay green before secret sync.
If the GitHub org is on the Free plan, treat repo-level secret sync as mandatory before the first push.

## Observability

- Every API response includes `X-Request-Id`. On Cloudflare, the value reuses `cf-ray` when available.
- Tail API logs locally with `pnpm logs:api` or `pnpm logs:api:production`.
- In Cloudflare Workers Logs / Query Builder, search by `requestId`, `cfRay`, or `event="request_error"`.
- API deploys upload source maps, so production stack traces are easier to read in Cloudflare.
