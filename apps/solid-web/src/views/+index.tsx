import { isHydrated } from '@solid-primitives/lifecycle'
import clsx from 'clsx'
import * as solid from 'solid-js'
import { A, Title } from 'solid-start'
import * as game from 'src/lib/game'
import * as s from 'src/lib/signal'
import { MatrixGrid } from 'src/lib/state'
import * as t from 'src/lib/trig'

const Game = () => {
  const WALLS_W = 48
  const WALLS_H = 48
  const TILE_SIZE = 3
  const GRID_SIZE = 4

  const wallMatrix = game.mazeToGrid(game.generateMaze(WALLS_W, WALLS_H), TILE_SIZE)
  // const wallMatrix = new t.Matrix(WALLS_W * GRID_SIZE - 1, WALLS_H * GRID_SIZE - 1, () => false)
  const wallSegments = t.findWallSegments(wallMatrix)

  const isWall = s.selector(
    s.reactive(() => wallMatrix),
    (position: t.Point, matrix) => matrix.get(position) !== false,
  )

  const playerVec = s.signal(
    /*
      place player in center of a random tile
    */
    t.point(
      t.randomInt(WALLS_W) * GRID_SIZE + (TILE_SIZE - 1) / 2,
      // wallMatrix.width - 1,
      // 0,
      t.randomInt(WALLS_H) * GRID_SIZE + (TILE_SIZE - 1) / 2,
      // wallMatrix.height - 1,
      // 0,
    ),
    { equals: (a, b) => a.equals(b) },
  )
  const isPlayer = s.selector(playerVec, (position, player) => player.equals(position))

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
    (position: t.Point, set) => set.has(position.toString()),
  )

  const minimapPlayer = s.memo(
    s.map(playerVec, player =>
      t.point(
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
