import { Index, JSX, createSignal } from 'solid-js'
import { Cell, Grid, H, W, randomInt, randomIntFromTo } from './shared'

export default function Maze(): JSX.Element {
  const [track, trigger] = createSignal(undefined, { equals: false })

  function generateMaze(width: number, height: number): { right: boolean; down: boolean }[] {
    const length = width * height,
      result = Array.from({ length }, () => ({
        right: true,
        down: true,
      })),
      stack = [0],
      neighbors: number[] = [],
      add = (j: number) => {
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
          {(cell, i) => <Cell borderRight={cell().right} borderBottom={cell().down} index={i} />}
        </Index>
      </Grid>
    </>
  )
}
