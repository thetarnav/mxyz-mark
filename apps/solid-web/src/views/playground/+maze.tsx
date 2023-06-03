import { JSX } from 'solid-js'
import { Cell, Grid, PlaygroundContainer, TriggerButton } from './playground'
import * as t from '../../lib/trig'
import * as s from '../../lib/signal'

function generateMaze(width: number, height: number) {
  const result = new t.Matrix(width, height, () => ({
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
    const swap = t.randomIntFromTo(stackIndex, stack.length)
    const i = stack[swap]
    stack[swap] = stack[stackIndex]
    stack[stackIndex] = i

    for (const direction of t.DIRECTIONS_H_V) {
      const j = result.go(i, direction)
      j && add(result.i(j))
    }

    if (neighbors.length === 0) continue

    const j = neighbors[t.randomInt(neighbors.length)]
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

const mazeToGrid = (maze: ReturnType<typeof generateMaze>, tileSize: number): t.Matrix<boolean> => {
  const gridSize = tileSize + 1,
    width = maze.width * gridSize - 1,
    height = maze.height * gridSize - 1

  return new t.Matrix(width, height, (x, y) => {
    const p = t.point(x, y)
    const tileP = t.point(p.x % gridSize, p.y % gridSize)
    // tiles
    if (tileP.x < tileSize && tileP.y < tileSize) return false
    // wall joints
    if (tileP.x === tileSize && tileP.y === tileSize) return true
    // vertical walls
    if (tileP.x === tileSize) {
      const mazeP = t.point((p.x - tileSize) / gridSize, (p.y - tileP.y) / gridSize)
      return maze.get(mazeP)!.right
    }
    // horizontal walls
    const mazeP = t.point((p.x - tileP.x) / gridSize, (p.y - tileSize) / gridSize + 1)
    return maze.get(mazeP)!.down
  })
}

export default function Maze(): JSX.Element {
  const trigger = s.signal(undefined, { equals: false })

  const W = 10
  const H = 6

  const maze = s.memo(s.map(trigger, () => generateMaze(W, H)))

  return (
    <PlaygroundContainer>
      <TriggerButton
        class="mb-8"
        onTrigger={() => s.set(trigger, undefined)}
        text="Regenerate"
        key="R"
      />
      <Grid matrix={maze.value}>
        {(cell, i) => (
          <Cell
            borders={{
              [t.Direction.Right]: cell().right && !!maze.value.go(i, t.Direction.Right),
              [t.Direction.Down]: cell().down && !!maze.value.go(i, t.Direction.Down),
            }}
          >
            {i}
          </Cell>
        )}
      </Grid>
      <div class="mt-24">
        <Grid matrix={mazeToGrid(maze.get(), 2)}>
          {(cell, i) => <Cell isWall={cell()}>{i}</Cell>}
        </Grid>
      </div>
    </PlaygroundContainer>
  )
}
