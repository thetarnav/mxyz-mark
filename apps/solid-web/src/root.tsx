// @refresh reload
import { Suspense, lazy } from 'solid-js'
import { Body, ErrorBoundary, Head, Html, Meta, Scripts, Title, useRoutes } from 'solid-start'

import './root.css'

const routes: Parameters<typeof useRoutes>[0] = [
  {
    path: '/',
    component: lazy(() => import('@/routes/index/(home)')),
  },
  {
    path: '/*all',
    component: lazy(() => import('@/routes/404')),
  },
]

export default function Root() {
  const Routes = useRoutes(routes)

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
            <Routes />
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  )
}
