# CLAUDE.md

## Project

oml-__SERVICE_NAME__: Cloudflare Workers + Hono service.
Part of the ohmylike.app multi-service architecture.

## Domain

- Production: __SERVICE_NAME__.ohmylike.app
- Preview: pr-{N}.__SERVICE_NAME__.ohmylike.app

## Commands

- `npm test` - Run tests
- `npx wrangler dev` - Local dev server
- `npx wrangler deploy` - Production deploy

## Naming Convention

- Worker: oml-{service}
- DB: oml-{service}-db-{env}
- KV key: {service}:{key}
- R2 key (preview): {service}/pr-{N}/{path}

## Rules

- Write tests for all changes
- Ensure tests pass before creating a PR
- 1 Issue = 1 PR
- Use conventional commits
