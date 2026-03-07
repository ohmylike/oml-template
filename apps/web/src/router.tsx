import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'
import { lazy } from 'react'

const RootLayout = () => <Outlet />

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
