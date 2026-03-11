import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { lazy, useEffect } from 'react'
import { useQueryState } from 'nuqs'
import { NuqsAdapter } from 'nuqs/adapters/tanstack-router'
import { styleFlavorParser } from '@oml-__SERVICE_NAME__/ui/lib/search-params'

function RootStyleFlavorLayout() {
  const [styleFlavor] = useQueryState('style', styleFlavorParser)

  useEffect(() => {
    document.documentElement.dataset.style = styleFlavor
  }, [styleFlavor])

  return <Outlet />
}

const RootLayout = () => (
  <NuqsAdapter>
    <RootStyleFlavorLayout />
  </NuqsAdapter>
)

const rootRoute = createRootRoute({
  component: RootLayout,
})

const IndexPage = lazy(() => import('./routes/index'))

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexPage,
})

const routeTree = rootRoute.addChildren([indexRoute])

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
