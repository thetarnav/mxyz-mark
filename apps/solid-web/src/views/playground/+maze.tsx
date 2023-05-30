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

const mazeToGrid = (maze: ReturnType<typeof generateMaze>, tileSize: number): XYMatrix<boolean> => {
  const gridSize = tileSize + 1,
    width = maze.width * gridSize - 1,
    height = maze.height * gridSize - 1

  return new XYMatrix(width, height, i => {
    const vec = XYMatrix.vec(width, i)
    const tileVec = new Vector(vec.x % gridSize, vec.y % gridSize)
    // tiles
    if (tileVec.x < tileSize && tileVec.y < tileSize) return false
    // wall joints
    if (tileVec.x === tileSize && tileVec.y === tileSize) return true
    // vertical walls
    if (tileVec.x === tileSize) {
      const mazeVec = new Vector((vec.x - tileSize) / gridSize, (vec.y - tileVec.y) / gridSize)
      return maze.get(maze.i(mazeVec))!.right
    }
    // horizontal walls
    const mazeVec = new Vector((vec.x - tileVec.x) / gridSize, (vec.y - tileSize) / gridSize + 1)
    return maze.get(maze.i(mazeVec))!.down
  })
}

export default function Maze(): JSX.Element {
  const [track, trigger] = createSignal(undefined, { equals: false })

  const W = 10
  const H = 6

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
        <Grid matrix={mazeToGrid(maze(), 2)}>
          {(cell, i) => <Cell isWall={cell()} index={i} />}
        </Grid>
      </div>
    </PlaygroundContainer>
  )
}
