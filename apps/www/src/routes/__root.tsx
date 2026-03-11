import {
  createRootRoute,
  Link,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { useQueryState } from 'nuqs'
import { styleFlavorParser } from '@oml-__SERVICE_NAME__/ui/lib/search-params'
import appCss from '../styles/globals.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'oml-__SERVICE_NAME__' },
      { name: 'description', content: 'oml-__SERVICE_NAME__ - ohmylike.app service' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function NotFoundComponent() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1>404</h1>
      <p>ページが見つかりません</p>
      <Link to="/">ホームに戻る</Link>
    </div>
  )
}

function RootComponent() {
  return (
    <NuqsAdapter>
      <RootInner />
    </NuqsAdapter>
  )
}

function RootInner() {
  const [style] = useQueryState('style', styleFlavorParser)

  return (
    <html lang="ja" data-style={style}>
      <head>
        <HeadContent />
      </head>
      <body>
        <div id="root">
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  )
}
