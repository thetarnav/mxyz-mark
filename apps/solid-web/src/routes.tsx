import { isHydrated } from '@solid-primitives/lifecycle'
import { JSX, Suspense, createMemo, lazy } from 'solid-js'
import { Navigate, Routes as StartRoutes, useLocation, useRoutes } from 'solid-start'

export const PLAYGROUND_ROUTES = [
  {
    path: '/noise',
    title: 'Noise',
    import: () => import('./views/playground/+noise'),
  },
  {
    path: '/maze',
    title: 'Maze',
    import: () => import('./views/playground/+maze'),
  },
  {
    path: '/movement',
    title: 'Movement',
    import: () => import('./views/playground/+movement'),
  },
] as const

export const usePlaygroundTitle = () => {
  const location = useLocation()
  return createMemo(() => {
    const page = location.pathname.replace('/playground', '')
    const route = PLAYGROUND_ROUTES.find(({ path }) => path === page)
    return route ? route.title : 'Playground'
  })
}

const ROUTES = [
  {
    path: '/',
    component: lazy(() => import('./views/+index')),
  },
  {
    path: '/playground',
    component: lazy(() => import('./views/playground/+index')),
    children: [
      {
        path: '/',
        component: () => <Navigate href="/playground/noise" />,
      },
      ...PLAYGROUND_ROUTES.map(data => ({
        path: data.path,
        component: () => {
          const Page = lazy(() => data.import())
          return <Suspense>{isHydrated() && <Page />}</Suspense>
        },
      })),
    ],
  },
  {
    path: '/*all',
    component: lazy(() => import('./views/+404')),
  },
] satisfies Parameters<typeof useRoutes>[0]

export default function Routes(): JSX.Element {
  return <StartRoutes>{ROUTES as any}</StartRoutes>
}
