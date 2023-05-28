import { Index, JSX, createSignal } from 'solid-js'
import { Cell, Direction, Grid, H, W, XYMatrix, randomInt, randomIntFromTo } from './shared'

export default function Maze(): JSX.Element {
  const [track, trigger] = createSignal(undefined, { equals: false })

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

      if (result.canGo(Direction.Up, i)) add(result.go(Direction.Up, i))
      if (result.canGo(Direction.Right, i)) add(result.go(Direction.Right, i))
      if (result.canGo(Direction.Down, i)) add(result.go(Direction.Down, i))
      if (result.canGo(Direction.Left, i)) add(result.go(Direction.Left, i))

      if (neighbors.length === 0) continue

      const j = neighbors[randomInt(neighbors.length)]
      switch (j - i) {
        case -width: // up
          result.get(i - width)!.down = false
          break
        case -1: // left
          result.get(i - 1)!.right = false
          break
        case width: // down
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

  return (
    <>
      <button onClick={() => trigger()}>Regenerate</button>
      <br />
      <br />
      <Grid width={W} height={H}>
        <Index each={(track(), generateMaze(W, H).values)}>
          {(cell, i) => (
            <Cell
              borders={{
                [Direction.Right]: cell().right && XYMatrix.canGo(Direction.Right, W, H, i),
                [Direction.Down]: cell().down && XYMatrix.canGo(Direction.Down, W, H, i),
              }}
              index={i}
            />
          )}
        </Index>
      </Grid>
    </>
  )
}
