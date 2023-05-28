import { JSX } from 'solid-js'
import { A, Outlet, Title } from 'solid-start'
import { PLAYGROUND_ROUTES, usePlaygroundTitle } from 'src/routes'

export default function Playground(): JSX.Element {
  const playgroundTitle = usePlaygroundTitle()

  return (
    <>
      <div class="center-child">
        <nav class="fixed top-0 flex h-12 items-stretch gap-16 bg-gray-900 px-4">
          <div class="center-child">
            <h1 class="font-bold">mxyz playground</h1>
          </div>
          <ul class="flex items-center gap-4">
            {PLAYGROUND_ROUTES.map(({ path, title }) => (
              <li>
                <A href={path} class="underline-dashed hover:underline" activeClass="text-primary">
                  {title}
                </A>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <main class="flex flex-col items-center gap-24 py-24">
        <Title>{playgroundTitle()} — mxyz playground</Title>
        <h1 class="text-4xl font-bold">{playgroundTitle()}</h1>
        <div>
          <Outlet />
        </div>
      </main>
    </>
  )
}
