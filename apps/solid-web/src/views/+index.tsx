import { isHydrated } from '@solid-primitives/lifecycle'
import clsx from 'clsx'
import * as solid from 'solid-js'
import { A, Title } from 'solid-start'
import * as game from 'src/lib/game'
import * as s from 'src/lib/signal'
import { MatrixGrid } from 'src/lib/state'
import * as t from 'src/lib/trig'

const N_TILES = 40
const TILE_SIZE = 3
const GRID_SIZE = TILE_SIZE + 1
const BOARD_SIZE = N_TILES * GRID_SIZE - 1 // -1 for omitted last wall
const SHRINE_SIZE_TILES = 4
const SHRINE_RADIUS_TILES = 2
const SHRINE_SIZE = SHRINE_SIZE_TILES * GRID_SIZE
const WINDOW_SIZE = 15

const Game = () => {
  // const tileToVec = (tile: t.Vector) => tile.multiply(GRID_SIZE).add(1, 1)

  const getCornerShrineOriginTile = (quadrand: t.Quadrand) =>
    t.QUADRAND_TO_VEC[quadrand].multiply(N_TILES - SHRINE_SIZE_TILES)

  const getCornerShrineCenter = (quadrand: t.Quadrand) =>
    getCornerShrineOriginTile(quadrand)
      .multiply(GRID_SIZE)
      .add(t.vector(SHRINE_RADIUS_TILES, SHRINE_RADIUS_TILES).multiply(GRID_SIZE))
      .subtract(1, 1)

  const startingQuadrand = t.randomInt(4) as t.Quadrand
  const playerVec = s.signal(
    /*
      place player in center of a random corner quadrant
    */
    getCornerShrineCenter(startingQuadrand),
    // t.vector(190, 190),
    { equals: (a, b) => a.equals(b) },
  )
  const isPlayer = s.selector(playerVec, (position, player) => player.equals(position))

  const finishQuadrand = ((startingQuadrand + 2) % 4) as t.Quadrand // opposite of start
  const finishVec = getCornerShrineCenter(finishQuadrand)

  /*
    ignore maze generation is the shrine tiles at each corner
  */
  const ignoredShrineTiles: t.Vector[] = []
  for (const q of t.QUADRANTS) {
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

  for (const q of t.QUADRANTS) {
    /*
      Clear walls inside the corner shrines
    */
    const qVec = t.QUADRAND_TO_VEC[q]
    const corner = qVec
      .multiply(t.vector(wallMatrix.width - 1, wallMatrix.height - 1))
      .subtract(qVec.multiply(SHRINE_SIZE - 2))

    for (let x = 0; x < SHRINE_SIZE - 1; x++) {
      for (let y = 0; y < SHRINE_SIZE - 1; y++) {
        wallMatrix.set(corner.add(x, y), false)
      }
    }

    /*
      Make corner shrine exits (one on each maze-facing edge)
    */
    const wall = qVec.map(xy => (1 - xy) * SHRINE_SIZE - 1),
      exitTileX = t.randomInt(SHRINE_SIZE_TILES - 1),
      exitTileY = t.randomInt(SHRINE_SIZE_TILES - 1)

    for (let x = 0; x < TILE_SIZE; x++) {
      wallMatrix.set(corner.add(x + exitTileX * GRID_SIZE, wall.y), false)
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      wallMatrix.set(corner.add(wall.x, y + exitTileY * GRID_SIZE), false)
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

  const windowed = s.map(playerVec, player => t.windowedMatrix(WINDOW_SIZE, player))

  const isVisible = s.selector(
    s.map(s.join([playerVec, windowed]), ([player, windowed]) =>
      game.findVisiblePoints(wallMatrix, wallSegments, windowed, player),
    ),
    (position: t.Vector, set) => set.has(position.toString()),
  )

  const vecToMinimap = (vec: t.Vector) =>
    vec.map(xy => Math.round(t.mapRange(xy, 0, BOARD_SIZE - 1, 0, WINDOW_SIZE - 1)))

  const minimapPlayer = s.memo(s.map(playerVec, vecToMinimap))
  const isMinimapPlayer = s.selector(minimapPlayer, (p1, p2) => p1.equals(p2))

  const minimapFinish = vecToMinimap(finishVec)
  const isMinimapFinish = (vec: t.Vector) => vec.equals(minimapFinish)

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
                  : isMinimapFinish(fovPoint)
                  ? 'bg-amber'
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
