import { Index, createSignal, untrack } from 'solid-js'

const randomInt = (max: number) => Math.floor(Math.random() * max)

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

const CORNERS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const

const DIRECTIONS_WITH_CORNERS = [...DIRECTIONS, ...CORNERS] as const

function* randomIterate<T>(arr: readonly T[]) {
  const copy = arr.slice()
  while (copy.length) {
    const index = randomInt(copy.length)
    yield copy.splice(index, 1)[0]
  }
}

function generateNoise(width: number, height: number) {
  const length = width * height
  const result = Array.from({ length }, () => false)

  const stack = Array.from({ length: length * 0.05 }, () => randomInt(length))

  while (stack.length > 0) {
    const i = stack.pop()!,
      x = i % width,
      y = Math.floor(i / width)

    result[i] = true

    // Skip spreading on the edges
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) continue

    for (const [dx, dy] of randomIterate(DIRECTIONS_WITH_CORNERS)) {
      const j = x + dx + (y + dy) * width

      if (j < 0 || j >= length || result[j]) continue

      stack.push(j)
      break
    }
  }

  return result
}

function generateMaze(width: number, height: number) {
  const length = width * height
  const result = Array.from({ length }, () => ({
    right: true,
    down: true,
  }))

  for (let i = 0; i < length; i++) {
    const cell = result[i]
    const x = i % width
    const y = Math.floor(i / width)

    const options: VoidFunction[] = []

    if (x < width - 1) {
      options.push(() => (cell.right = false))
    }
    if (y < height - 1) {
      options.push(() => (cell.down = false))
    }
    if (i % width !== 0 && result[i - 1] && result[i - 1].right) {
      options.push(() => (result[i - 1].right = false))
    }

    if (options.length) {
      options[randomInt(options.length)]()
    }
  }

  return result
}

export default function Home() {
  const W = 20
  const H = 10
  return (
    <main>
      <h4>Noise</h4>
      {untrack(() => {
        const [track, trigger] = createSignal(undefined, { equals: false })

        return (
          <>
            <button onClick={() => trigger()}>Regenerate</button>
            <br />
            <br />
            <div
              style={{
                display: 'grid',
                'grid-template-columns': `repeat(${W}, 1fr)`,
                'grid-template-rows': `repeat(${H}, 1fr)`,
                width: `${W * 2}rem`,
                height: `${H * 2}rem`,
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Index each={(track(), generateNoise(W, H))}>
                {(cell, i) => (
                  <div
                    style={{
                      background: cell() ? 'gray' : 'transparent',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                    }}
                  >
                    {i}
                  </div>
                )}
              </Index>
            </div>
          </>
        )
      })}
      <h4>Maze</h4>
      {untrack(() => {
        const [track, trigger] = createSignal(undefined, { equals: false })

        return (
          <>
            <button onClick={() => trigger()}>Regenerate</button>
            <br />
            <br />
            <div
              style={{
                display: 'grid',
                'grid-template-columns': `repeat(${W}, 1fr)`,
                'grid-template-rows': `repeat(${H}, 1fr)`,
                width: `${W * 2}rem`,
                height: `${H * 2}rem`,
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Index each={(track(), generateMaze(W, H))}>
                {(cell, i) => (
                  <div
                    style={{
                      background: 'transparent',
                      display: 'flex',
                      'align-items': 'center',
                      'justify-content': 'center',
                      'border-right': cell().right ? '1px solid white' : '1px solid transparent',
                      'border-bottom': cell().down ? '1px solid white' : '1px solid transparent',
                    }}
                  >
                    {i}
                  </div>
                )}
              </Index>
            </div>
          </>
        )
      })}
    </main>
  )
}
