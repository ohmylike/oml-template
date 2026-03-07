# CLAUDE.md

## Project

oml-__SERVICE_NAME__: Monorepo for the __SERVICE_NAME__ service on ohmylike.app.

## Structure

- `apps/api` - Hono API on Cloudflare Workers
- `apps/cli` - CLI tool using gunshi
- `apps/web` - React SPA (TanStack Router/Query) on Cloudflare Workers
- `apps/www` - Landing site (TanStack Start SSR) on Cloudflare Workers
- `packages/core` - Business logic, DB (Drizzle + Turso), validation (valibot)
- `packages/api-client` - Type-safe API client (Hono RPC)

## Domain

- Production API: api.__SERVICE_NAME__.ohmylike.app
- Production Web: __SERVICE_NAME__.ohmylike.app
- Production WWW: www.__SERVICE_NAME__.ohmylike.app
- Preview: pr-{N}.__SERVICE_NAME__.ohmylike.app

## Commands

- `pnpm install` - Install dependencies
- `pnpm build` - Build all packages/apps
- `pnpm test` - Run unit tests
- `pnpm test:e2e` - Run e2e tests
- `pnpm dev` - Dev server (api + web)
- `pnpm dev:www` - Dev server (www)
- `pnpm dev:cli` - Run CLI in dev mode
- `pnpm deploy` - Deploy api + web

## Tech Stack

- pnpm workspace monorepo
- TypeScript (strict), tsdown (build)
- Hono (API), Valibot (validation)
- Drizzle ORM + Turso (SQLite DB)
- TanStack Router/Query (web SPA)
- TanStack Start (www SSR)
- Tailwind CSS v4
- Vitest (unit), Playwright (e2e)
- gunshi (CLI)
- Cloudflare Workers / KV / R2

## Naming Convention

- Worker: oml-{service}-{app}
- DB: oml-{service}-db-{env}
- KV key: {service}:{key}
- R2 bucket: oml-{service}-uploads

## Rules

- Write tests for all changes
- Ensure tests pass before creating a PR
- 1 Issue = 1 PR
- Use conventional commits
- After pushing to a branch, always check if a PR exists for the branch (`gh pr view`). If a PR exists, output its URL. If not, show the URL to create one (e.g. `https://github.com/{owner}/{repo}/compare/{branch}?expand=1`).
