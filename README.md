# oml-__SERVICE_NAME__

Monorepo for the __SERVICE_NAME__ service on ohmylike.app.

## Setup

This repository was created from [oml-template](https://github.com/ohmylike/oml-template).

Run `./bootstrap.sh __SERVICE_NAME__` to initialize, then:

```bash
git add -A && git commit -m "bootstrap: initialize oml-__SERVICE_NAME__" && git push
```

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
pnpm deploy       # api + web to production
```

Preview environments are automatically created on PR open and destroyed on PR close.
