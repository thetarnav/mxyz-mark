import { isHydrated } from '@solid-primitives/lifecycle'
import clsx from 'clsx'
import * as solid from 'solid-js'
import { A, Title } from 'solid-start'
import * as game from 'src/lib/game'
import * as s from 'src/lib/signal'
import { MatrixGrid } from 'src/lib/state'
import * as t from 'src/lib/trig'

type Quadrand = 0 | 1 | 2 | 3

const QUADRAND_TO_VEC: Record<Quadrand, t.Vector> = {
  0: t.vector(0, 0),
  1: t.vector(1, 0),
  2: t.vector(0, 1),
  3: t.vector(1, 1),
}

const Game = () => {
  const N_TILES = 48
  const TILE_SIZE = 3
  const GRID_SIZE = 4 // TILE_SIZE + wall
  const SHRINE_SIZE_TILES = 4
  const SHRINE_RADIUS_TILES = 2
  const SHRINE_LENGTH = SHRINE_SIZE_TILES * GRID_SIZE

  const startingQuadrand = t.randomInt(4) as Quadrand
  const finishQuadrand = ((startingQuadrand + 2) % 4) as Quadrand // opposite

  // const tileToVec = (tile: t.Vector) => tile.multiply(GRID_SIZE).add(1, 1)

  const getCornerShrineOriginTile = (quadrand: Quadrand) => {
    return QUADRAND_TO_VEC[quadrand].multiply(N_TILES - SHRINE_SIZE_TILES)
  }

  const getCornerShrineCenter = (quadrand: Quadrand) =>
    getCornerShrineOriginTile(quadrand)
      .multiply(GRID_SIZE)
      .add(t.vector(SHRINE_RADIUS_TILES, SHRINE_RADIUS_TILES).multiply(GRID_SIZE))
      .add(-1, -1)

  const playerVec = s.signal(
    /*
      place player in center of a random corner quadrant
    */
    getCornerShrineCenter(startingQuadrand),
    // t.vector(190, 190),
    { equals: (a, b) => a.equals(b) },
  )
  const isPlayer = s.selector(playerVec, (position, player) => player.equals(position))

  /*
    ignore maze generation is the 5x5 tiles at each corner
  */
  const ignoredShrineTiles: t.Vector[] = []
  for (let q = 0 as Quadrand; q < 4; q++) {
    const originTile = getCornerShrineOriginTile(q)
    for (let x = 0; x < SHRINE_SIZE_TILES; x++) {
      for (let y = 0; y < SHRINE_SIZE_TILES; y++) {
        ignoredShrineTiles.push(originTile.add(x, y))
      }
    }
  }

  const wallMatrix = game.mazeToGrid(
    game.generateMaze(
      N_TILES,
      N_TILES,
      ignoredShrineTiles,
      t.vector(Math.floor(N_TILES / 2), Math.floor(N_TILES / 2)),
    ),
    TILE_SIZE,
  )

  for (let q = 0 as Quadrand; q < 4; q++) {
    /*
      Clear walls inside the corner shrines
    */
    const qVec = QUADRAND_TO_VEC[q]
    const corner = qVec
      .multiply(t.vector(wallMatrix.width - 1, wallMatrix.height - 1))
      .subtract(qVec.multiply(SHRINE_LENGTH - 2))

    for (let x = 0; x < SHRINE_LENGTH - 1; x++) {
      for (let y = 0; y < SHRINE_LENGTH - 1; y++) {
        wallMatrix.set(corner.add(x, y), false)
      }
    }

    /*
      Make H and V shrine exits
    */
    const wallX = (1 - qVec.x) * SHRINE_LENGTH - 1,
      wallY = (1 - qVec.y) * SHRINE_LENGTH - 1,
      exitTileX = t.randomInt(SHRINE_SIZE_TILES - 1),
      exitTileY = t.randomInt(SHRINE_SIZE_TILES - 1)

    for (let x = 0; x < TILE_SIZE; x++) {
      wallMatrix.set(corner.add(x + exitTileX * GRID_SIZE, wallY), false)
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      wallMatrix.set(corner.add(wallX, y + exitTileY * GRID_SIZE), false)
    }
  }

  // const wallMatrix = new t.Matrix(WALLS_W * GRID_SIZE - 1, WALLS_H * GRID_SIZE - 1, () => false)
  const wallSegments = t.findWallSegments(wallMatrix)

  const isWall = s.selector(
    s.reactive(() => wallMatrix),
    (position: t.Vector, matrix) => matrix.get(position) !== false,
  )

  game.createDirectionMovement(direction => {
    s.update(playerVec, p => {
      const newPos = wallMatrix.go(p, direction)
      return newPos && !isWall(newPos) ? newPos : p
    })
  })

  const WINDOW_SIZE = 15
  const windowed = s.map(playerVec, player => t.windowedMatrix(WINDOW_SIZE, player))

  const isVisible = s.selector(
    s.map(s.join([playerVec, windowed]), ([player, windowed]) =>
      game.findVisiblePoints(wallMatrix, wallSegments, windowed, player),
    ),
    (position: t.Vector, set) => set.has(position.toString()),
  )

  const minimapPlayer = s.memo(
    s.map(playerVec, player =>
      t.vector(
        Math.floor((player.x / (wallMatrix.width - GRID_SIZE)) * (WINDOW_SIZE - 1)),
        Math.floor((player.y / (wallMatrix.height - GRID_SIZE)) * (WINDOW_SIZE - 1)),
      ),
    ),
  )
  const isMinimapPlayer = s.selector(minimapPlayer, (p1, p2) => p1.equals(p2))

  return (
    <>
      <MatrixGrid matrix={windowed.value}>
        {(vec, fovIndex) => {
          const fovPoint = t.Matrix.vec(WINDOW_SIZE, fovIndex)
          return (
            <div
              class={clsx(
                'flex items-center justify-center',
                isPlayer(vec())
                  ? 'bg-white'
                  : isMinimapPlayer(fovPoint)
                  ? 'bg-primary'
                  : isVisible(vec())
                  ? 'bg-stone-7'
                  : 'bg-transparent',
              )}
            />
          )
        }}
      </MatrixGrid>
      <div class="fixed right-12 top-12">{playerVec.value + ''}</div>
    </>
  )
}

export default function Home(): solid.JSX.Element {
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
      <main class="flex flex-col items-center gap-24 py-24">{isHydrated() && <Game />}</main>
    </>
  )
}
