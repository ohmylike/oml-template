import type { WebEnv } from './env'

const STATIC_EXTENSIONS = new Set([
  '.js', '.css', '.map', '.svg', '.png', '.jpg', '.jpeg',
  '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf',
])

function isStaticAsset(pathname: string): boolean {
  const ext = pathname.slice(pathname.lastIndexOf('.'))
  return STATIC_EXTENSIONS.has(ext)
}

export default {
  async fetch(request: Request, env: WebEnv): Promise<Response> {
    const url = new URL(request.url)

    if (isStaticAsset(url.pathname)) {
      return env.ASSETS.fetch(request)
    }

    // SPA fallback: serve index.html for all non-static routes
    return env.ASSETS.fetch(new Request(new URL('/', request.url), request))
  },
}
