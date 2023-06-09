import { isHydrated } from '@solid-primitives/lifecycle'
import clsx from 'clsx'
import * as solid from 'solid-js'
import { A, Title } from 'solid-start'
import * as game from 'src/lib/game'
import * as s from 'src/lib/signal'
import { MatrixGrid } from 'src/lib/state'
import * as t from 'src/lib/trig'

export function findVisiblePoints(
  wallMatrix: t.Matrix<boolean>,
  wallSegments: t.Segment[],
  windowedMatrix: t.Matrix<t.Point>,
  player: t.Point,
): Set<t.VecString> {
  // player and all wall-less tiles in the first ring are visible
  const visibleSet = new Set(
      t
        .getRing(player, 1)
        .filter(p => wallMatrix.get(p) === false)
        .concat(player)
        .map(p => p.toString()),
    ),
    radius = (windowedMatrix.width - 1) / 2,
    windowedPlayerVec = t.point(radius, radius)

  /*
    check points closer to the player first
    so that we can detect gaps between visible tiles
  */
  for (let r = 2; r <= radius; r++) {
    ring: for (const wPoint of t.getRing(windowedPlayerVec, r)) {
      const point = windowedMatrix.get(wPoint)

      // walls are not visible
      if (!point || wallMatrix.get(point) !== false) continue

      /*
        don't allow for gaps between visible tiles
        at least one neighbor must be visible
      */
      gaps: {
        /*
          X @ X
        */
        if (point.x > player.x) {
          if (visibleSet.has(point.add(-1, 0).toString())) break gaps
        } else if (point.x < player.x) {
          if (visibleSet.has(point.add(1, 0).toString())) break gaps
        }

        /*
          X
          @
          X
        */
        if (point.y > player.y) {
          if (visibleSet.has(point.add(0, -1).toString())) break gaps
        } else if (point.y < player.y) {
          if (visibleSet.has(point.add(0, 1).toString())) break gaps
        }

        /*
          X   X
            @
          X   X
        */
        if (point.x > player.x && point.y > player.y) {
          if (visibleSet.has(point.add(-1, -1).toString())) break gaps
        } else if (point.x < player.x && point.y < player.y) {
          if (visibleSet.has(point.add(1, 1).toString())) break gaps
        } else if (point.x > player.x && point.y < player.y) {
          if (visibleSet.has(point.add(-1, 1).toString())) break gaps
        } else if (point.x < player.x && point.y > player.y) {
          if (visibleSet.has(point.add(1, -1).toString())) break gaps
        }

        continue
      }

      const tileSeg = t.segment(player, point)

      /*
        a tile must be within the player's round field of view
      */
      if (t.getSegmentLength(tileSeg) > radius + 1) continue

      /*
        a tile must not have a wall segment between it and the player
      */
      for (const wallSeg of wallSegments) {
        if (t.segmentsIntersecting(tileSeg, wallSeg)) continue ring
      }

      visibleSet.add(point.toString())
    }
  }

  return visibleSet
}

const Board = () => {
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
      return newPos && !isWall(newPos) ? newPos : p
    })
  })

  const WINDOW_SIZE = 15
  const windowed = s.map(playerVec, player => t.windowedMatrix(WINDOW_SIZE, player))

  const isVisible = s.selector(
    s.map(s.join([playerVec, windowed]), ([player, windowed]) =>
      findVisiblePoints(wallMatrix, wallSegments, windowed, player),
    ),
    (position: t.Point, set) => set.has(position.toString()),
  )

  return (
    <MatrixGrid matrix={windowed.value}>
      {vec => (
        <div
          class={clsx(
            'flex items-center justify-center',
            isPlayer(vec()) ? 'bg-white' : isVisible(vec()) ? 'bg-stone-7' : 'bg-transparent',
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
