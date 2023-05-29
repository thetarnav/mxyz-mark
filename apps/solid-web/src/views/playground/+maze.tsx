import { JSX, createMemo, createSignal } from 'solid-js'
import {
  Cell,
  DIRECTIONS_H_V,
  Direction,
  Grid,
  H,
  W,
  XYMatrix,
  randomInt,
  randomIntFromTo,
} from './shared'

function generateMaze(width: number, height: number) {
  const result = new XYMatrix(width, height, () => ({
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

  for (; stackIndex < result.length; stackIndex++) {
    const swap = randomIntFromTo(stackIndex, stack.length)
    const i = stack[swap]
    stack[swap] = stack[stackIndex]
    stack[stackIndex] = i

    for (const direction of DIRECTIONS_H_V) {
      const j = result.go(i, direction)
      if (j !== undefined) add(result.i(j))
    }

    if (neighbors.length === 0) continue

    const j = neighbors[randomInt(neighbors.length)]
    switch (j - i) {
      case width: // up
        result.get(i + width)!.down = false
        break
      case -1: // left
        result.get(i - 1)!.right = false
        break
      case -width: // down
        result.get(i)!.down = false
        break
      case 1: // right
        result.get(i)!.right = false
        break
    }

    neighbors.length = 0
  }

  return result
}

export default function Maze(): JSX.Element {
  const [track, trigger] = createSignal(undefined, { equals: false })

  const maze = createMemo(() => {
    track()
    return generateMaze(W, H)
  })

  return (
    <>
      <button onClick={() => trigger()}>Regenerate</button>
      <br />
      <br />
      <Grid matrix={maze()}>
        {(cell, i) => (
          <Cell
            borders={{
              [Direction.Right]: cell().right && !!maze().go(i, Direction.Right),
              [Direction.Down]: cell().down && !!maze().go(i, Direction.Down),
            }}
            index={i}
          />
        )}
      </Grid>
    </>
  )
}
