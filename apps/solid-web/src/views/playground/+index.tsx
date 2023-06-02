import { JSX } from 'solid-js'
import { A, Outlet, Title } from 'solid-start'
import { PLAYGROUND_ROUTES, usePlaygroundTitle } from 'src/routes'

export default function Playground(): JSX.Element {
  const playgroundTitle = usePlaygroundTitle()

  return (
    <>
      <div class="center-child">
        <nav class="z-999 fixed top-4 flex h-12 items-stretch gap-12 rounded-md bg-gray-900 px-4">
          <div class="center-child">
            <A href="/" class="underline-dashed font-semibold hover:underline">
              game
            </A>
          </div>
          <div class="center-child">
            <h1 class="font-semibold">mxyz playground:</h1>
          </div>
          <ul class="flex items-center gap-4">
            {PLAYGROUND_ROUTES.map(({ path }) => (
              <li>
                <A
                  href={`/playground${path}`}
                  class="underline-dashed hover:underline"
                  activeClass="text-primary"
                >
                  {path}
                </A>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <main class="flex flex-col items-center gap-24 py-24">
        <Title>{playgroundTitle()} — mxyz playground</Title>
        <h1 class="text-4xl font-bold">{playgroundTitle()}</h1>
        <div class="w-full">
          <Outlet />
        </div>
      </main>
    </>
  )
}
