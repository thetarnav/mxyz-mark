import { Component, Index, ParentComponent, createSignal, untrack } from 'solid-js'

const randomInt = (max: number) => Math.floor(Math.random() * max)
const randomIntFromTo = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min

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

const W = 20
const H = 10

function* randomIterate<T>(arr: readonly T[]) {
  const copy = arr.slice()
  while (copy.length) {
    const index = randomInt(copy.length)
    yield copy.splice(index, 1)[0]
  }
}

const getXY = (width: number, i: number): [number, number] => [i % width, Math.floor(i / width)]

const Grid: ParentComponent = props => {
  return (
    <div
      style={{
        display: 'grid',
        'grid-template-columns': `repeat(${W}, 1fr)`,
        'grid-template-rows': `repeat(${H}, 1fr)`,
        width: `${W * 2}rem`,
        height: `${H * 2}rem`,
        border: '2px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      {props.children}
    </div>
  )
}

const Cell: Component<{
  borderBottom?: boolean
  borderRight?: boolean
  fill?: boolean
  index: number
}> = props => {
  return (
    <div
      style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'border-right': props.borderRight ? '2px solid white' : '2px solid transparent',
        'border-bottom': props.borderBottom ? '2px solid white' : '2px solid transparent',
        background: props.fill ? '#DE311B' : 'transparent',
        color: props.fill ? 'black' : 'lightgray',
      }}
    >
      {props.index}
    </div>
  )
}

export default function Home() {
  return (
    <main>
      <h4>Noise</h4>
      {untrack(() => {
        const [track, trigger] = createSignal(undefined, { equals: false })

        function generateNoise(width: number, height: number) {
          const length = width * height
          const result = Array.from({ length }, () => false)

          const stack = Array.from({ length: length * 0.05 }, () => randomInt(length))

          while (stack.length > 0) {
            const i = stack.pop()!,
              [x, y] = getXY(width, i)

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

        return (
          <>
            <button onClick={() => trigger()}>Regenerate</button>
            <br />
            <br />
            <Grid>
              <Index each={(track(), generateNoise(W, H))}>
                {(cell, i) => <Cell fill={cell()} index={i} />}
              </Index>
            </Grid>
          </>
        )
      })}
      <h4>Maze</h4>
      {untrack(() => {
        const [track, trigger] = createSignal(undefined, { equals: false })

        function generateMaze(width: number, height: number): { right: boolean; down: boolean }[] {
          const length = width * height
          const result = Array.from({ length }, () => ({
            right: true,
            down: true,
          }))

          const stack = [0]
          const neighbors: number[] = []
          const add = (j: number) => {
            const index = stack.indexOf(j)
            if (index === -1) stack.push(j)
            else if (index < stackIndex) neighbors.push(j)
          }

          let stackIndex = 0

          for (; stackIndex < length; stackIndex++) {
            const swap = randomIntFromTo(stackIndex, stack.length)
            const i = stack[swap]
            stack[swap] = stack[stackIndex]
            stack[stackIndex] = i

            // up
            if (i >= width) add(i - width)
            // right
            if ((i + 1) % width !== 0) add(i + 1)
            // down
            if (i < length - width) add(i + width)
            // left
            if (i % width !== 0) add(i - 1)

            if (neighbors.length === 0) continue

            const j = neighbors[randomInt(neighbors.length)]
            switch (j - i) {
              case -width: // up
                result[i - width].down = false
                break
              case -1: // left
                result[i - 1].right = false
                break
              case width: // down
                result[i].down = false
                break
              case 1: // right
                result[i].right = false
                break
            }

            neighbors.length = 0
          }

          return result
        }

        return (
          <>
            <button onClick={() => trigger()}>Regenerate</button>
            <br />
            <br />
            <Grid>
              <Index each={(track(), generateMaze(W, H))}>
                {(cell, i) => (
                  <Cell borderRight={cell().right} borderBottom={cell().down} index={i} />
                )}
              </Index>
            </Grid>
          </>
        )
      })}
    </main>
  )
}
