import { JSX, createMemo, createSignal } from 'solid-js'
import {
  Cell,
  DIRECTIONS_H_V,
  Direction,
  Grid,
  PlaygroundContainer,
  TriggerButton,
  Vector,
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
      j && add(result.i(j))
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

const mazeToGrid = (maze: ReturnType<typeof generateMaze>): XYMatrix<boolean> => {
  const width = maze.width * 2 - 1,
    height = maze.height * 2 - 1
  const result = new XYMatrix<boolean>(width, height, i => {
    const vec = XYMatrix.vec(width, i)
    if (vec.x % 2 === 0 && vec.y % 2 === 0) return false
    if (vec.x % 2 === 1 && vec.y % 2 === 1) return true
    if (vec.x % 2 === 0) {
      const mazeVec = new Vector(vec.x / 2, (vec.y + 1) / 2)
      const cell = maze.get(maze.i(mazeVec))!
      return cell.down
    }
    const mazeVec = new Vector((vec.x - 1) / 2, vec.y / 2)
    const cell = maze.get(maze.i(mazeVec))!
    return cell.right
  })

  return result
}

export default function Maze(): JSX.Element {
  const [track, trigger] = createSignal(undefined, { equals: false })

  const W = 13
  const H = 7

  const maze = createMemo(() => {
    track()
    return generateMaze(W, H)
  })

  return (
    <PlaygroundContainer>
      <TriggerButton class="mb-8" onTrigger={() => trigger()} text="Regenerate" key="R" />
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
      <div class="mt-24">
        <Grid matrix={mazeToGrid(maze())}>{(cell, i) => <Cell fill={cell()} index={i} />}</Grid>
      </div>
    </PlaygroundContainer>
  )
}
