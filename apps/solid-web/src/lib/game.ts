import * as t from './trig'

export function generateMaze(width: number, height: number) {
  const walls = new t.Matrix(width, height, () => ({
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

  for (; stackIndex < walls.length; stackIndex++) {
    const swap = t.randomIntFromTo(stackIndex, stack.length)
    const i = stack[swap]
    stack[swap] = stack[stackIndex]
    stack[stackIndex] = i

    for (const direction of t.DIRECTIONS_H_V) {
      const j = walls.go(i, direction)
      j && add(walls.i(j))
    }

    if (neighbors.length === 0) continue

    const j = neighbors[t.randomInt(neighbors.length)]
    switch (j - i) {
      case width: // up
        walls.get(i + width)!.down = false
        break
      case -1: // left
        walls.get(i - 1)!.right = false
        break
      case -width: // down
        walls.get(i)!.down = false
        break
      case 1: // right
        walls.get(i)!.right = false
        break
    }

    neighbors.length = 0
  }

  return walls
}

export function mazeToGrid(
  maze: ReturnType<typeof generateMaze>,
  tileSize: number,
): t.Matrix<boolean> {
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

export function getWindowedMaze(
  width: number,
  height: number,
  playerPoint: t.Point,
  matrix: t.Matrix<boolean>,
) {
  const moveX = (width - 1) / 2,
    moveY = (height - 1) / 2

  const movedPlayer = playerPoint.add(-moveX, -moveY)

  return new t.Matrix(width, height, (x, y) => {
    const vec = new t.Point(x, y).add(movedPlayer)

    if (x === moveX && y === moveY) return { isPlayer: true, isWall: false }

    let isWall = matrix.get(vec)
    if (isWall === undefined) isWall = true

    return { isPlayer: false, isWall }
  })
}
