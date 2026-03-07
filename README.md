# oml-__SERVICE_NAME__

Cloudflare Workers + Hono service for ohmylike.app.

## Setup

This repository was created from [oml-template](https://github.com/ohmylike/oml-template).

Run `./bootstrap.sh __SERVICE_NAME__` to initialize, then:

```bash
git add -A && git commit -m "bootstrap: initialize oml-__SERVICE_NAME__" && git push
```

## Development

```bash
npm install
npm test
npx wrangler dev
```

## Deploy

Production deploy (manual for v0):

```bash
npx wrangler deploy
```

Preview environments are automatically created on PR open and destroyed on PR close.
