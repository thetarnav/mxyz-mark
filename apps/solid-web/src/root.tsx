// @refresh reload
import { Suspense, lazy } from 'solid-js'
import {
  Body,
  ErrorBoundary,
  Head,
  Html,
  Meta,
  Routes,
  Scripts,
  Title,
  useRoutes,
} from 'solid-start'

import './root.css'

const routes = [
  {
    path: '/',
    component: lazy(() => import('@/routes/index/(home)')),
  },
  {
    path: '/*all',
    component: lazy(() => import('@/routes/404')),
  },
] satisfies Parameters<typeof useRoutes>[0]

export default function Root() {
  const ConfigRoutes = useRoutes(routes)

  return (
    <Html lang="en">
      <Head>
        <Title>SolidStart - Bare</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Body>
        <Suspense>
          <ErrorBoundary>
            <Routes>
              <ConfigRoutes />
            </Routes>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  )
}
