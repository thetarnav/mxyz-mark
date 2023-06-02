import { JSX } from 'solid-js'
import { A, Title } from 'solid-start'

export default function Home(): JSX.Element {
  return (
    <>
      <Title>mxyz mark solid</Title>
      <nav class="z-999 absolute left-4 top-4 flex flex-col">
        <div>
          <A
            href="/"
            class="underline-dashed font-semibold hover:underline"
            activeClass="text-primary"
          >
            mxyz mark solid
          </A>
        </div>
        <div>
          <A href="/playground" class="underline-dashed hover:underline" activeClass="text-primary">
            /playground
          </A>
        </div>
      </nav>
      <main class="flex flex-col items-center gap-24 py-24"></main>
    </>
  )
}
