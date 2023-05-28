// @refresh reload
import { Suspense } from 'solid-js'
import { Body, ErrorBoundary, Head, Html, Meta, Scripts, Title } from 'solid-start'
import { StyleRegistry } from 'solid-styled'
import Routes from './routes'

import '@unocss/reset/tailwind-compat.css'
import 'virtual:uno.css'
import './root.css'

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
              <Routes />
            </ErrorBoundary>
          </Suspense>
        </StyleRegistry>
        <Scripts />
      </Body>
    </Html>
  )
}
