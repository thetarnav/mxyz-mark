// @refresh reload
import { Suspense } from 'solid-js'
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
import { StyleRegistry } from 'solid-styled'
import NotFound from './views/404'
import Home from './views/index/(home)'

import '@unocss/reset/tailwind-compat.css'
import 'virtual:uno.css'

import './root.css'

const routes: Parameters<typeof useRoutes>[0] = [
  {
    path: '/',
    component: () => <Home />,
  },
  {
    path: '/*all',
    component: () => <NotFound />,
  },
]

export default function Root() {
  return (
    <Html lang="en">
      <Head>
        <Title>mxyz mark</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Body>
        <StyleRegistry>
          <Suspense>
            <ErrorBoundary>
              <Routes>{routes as any}</Routes>
            </ErrorBoundary>
          </Suspense>
        </StyleRegistry>
        <Scripts />
      </Body>
    </Html>
  )
}
