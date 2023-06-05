import { A, Title } from 'solid-start'
import * as solid from 'solid-js'
import * as t from 'src/lib/trig'
import * as s from 'src/lib/signal'
import * as game from 'src/lib/game'
import clsx from 'clsx'
import { isHydrated } from '@solid-primitives/lifecycle'
import { MatrixGrid } from 'src/lib/state'

const Board = () => {
  const WALLS_W = 48
  const WALLS_H = 48
  const TILE_SIZE = 3
  const GRID_SIZE = 4

  const wallMatrix = game.mazeToGrid(game.generateMaze(WALLS_W, WALLS_H), TILE_SIZE)

  const wallSegments = t.findWallSegments(wallMatrix)

  const isWall = s.selector(
    s.reactive(() => wallMatrix),
    (position: t.Point, matrix) => matrix.get(position) !== false,
  )

  const playerVec = s.signal(
    // place player in center of a random tile
    t.point(
      t.randomInt(WALLS_W) * GRID_SIZE + (TILE_SIZE - 1) / 2,
      t.randomInt(WALLS_H) * GRID_SIZE + (TILE_SIZE - 1) / 2,
    ),
    { equals: (a, b) => a.equals(b) },
  )
  const isPlayer = s.selector(playerVec, (position, player) => player.equals(position))

  game.createDirectionMovement(direction => {
    s.update(playerVec, p => {
      const newPos = wallMatrix.go(p, direction)
      return newPos && !wallMatrix.get(newPos) ? newPos : p
    })
  })

  const WINDOW_SIZE = 15

  const matrixWindowed = s.memo(s.map(playerVec, player => t.windowedMatrix(WINDOW_SIZE, player)))

  return (
    <MatrixGrid matrix={matrixWindowed.value}>
      {vec => (
        <div
          class={clsx(
            'flex items-center justify-center',
            isPlayer(vec()) ? 'bg-white' : isWall(vec()) ? 'bg-transparent' : 'bg-stone-6',
          )}
        />
      )}
    </MatrixGrid>
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
      <main class="flex flex-col items-center gap-24 py-24">{isHydrated() && <Board />}</main>
    </>
  )
}
