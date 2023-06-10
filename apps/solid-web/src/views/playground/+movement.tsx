import clsx from 'clsx'
import { JSX, untrack } from 'solid-js'
import { css } from 'solid-styled'
import { Cell, Grid, PlaygroundContainer } from './playground'
import * as t from 'src/lib/trig'
import * as s from 'src/lib/signal'
import * as game from 'src/lib/game'

const WALLS = [
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0], // 6
  [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0], // 5
  [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0], // 4
  [0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0], // 3
  [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0], // 2
  [0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], // 1
  [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
]

const W = WALLS[0].length
const H = WALLS.length

const matrix = new t.Matrix(W, H, (x, y) => !!WALLS[H - 1 - y][x])

const wallSegments = t.findWallSegments(matrix)

export default function Movement(): JSX.Element {
  let initialPosition = t.randomInt(matrix.length)
  while (matrix.get(initialPosition)) {
    initialPosition = t.randomInt(matrix.length)
  }

  const position = s.signal(initialPosition)
  const isPlayer = s.selector(position)
  const playerVec = s.memo(s.map(position, position => matrix.vec(position)))

  const heldDirections = game.createDirectionMovement(direction => {
    s.update(position, p => {
      const newPos = matrix.go(p, direction)
      if (!newPos) return p
      const i = matrix.i(newPos)
      return matrix.get(i) ? p : i
    })
  })

  const DirectionKey = (props: { direction: t.Direction }) => {
    css`
      div {
        width: 3rem;
        height: 3rem;
        border: 1px solid #eee;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        margin: 0.5rem;
      }
      .held {
        background: #de311b;
      }
    `
    return (
      <div class={clsx(heldDirections.value[props.direction] && 'held')}>{props.direction}</div>
    )
  }

  return (
    <PlaygroundContainer>
      <div class="mb-8 flex flex-col items-center">
        <DirectionKey direction={t.Direction.Up} />
        <div class="flex">
          <DirectionKey direction={t.Direction.Left} />
          <DirectionKey direction={t.Direction.Down} />
          <DirectionKey direction={t.Direction.Right} />
        </div>
      </div>

      <div class="flex items-start gap-16">
        <Grid matrix={matrix}>
          {(isWall, i) => (
            <Cell isPlayer={isPlayer(i)} isWall={isWall()}>
              {i}
            </Cell>
          )}
        </Grid>

        {untrack(() => {
          const WINDOW_SIZE = 3

          const windowed = s.memo(s.map(playerVec, player => t.windowedMatrix(WINDOW_SIZE, player)))

          return (
            <Grid matrix={windowed.value} offset={playerVec.value.add(-1, -1)}>
              {vec => (
                <Cell isPlayer={isPlayer(matrix.i(vec()))} isWall={matrix.get(vec()) !== false} />
              )}
            </Grid>
          )
        })}
      </div>

      <div class="mt-16">
        {untrack(() => {
          const visiblePoints = s.memo(
            s.map(position, playerIndex => {
              const player = matrix.vec(playerIndex)
              const visibleSet = new Set<number>([playerIndex])
              // return visibleSet

              const toCheck: t.Vector[] = []
              let radius = 1
              points: for (const _ of matrix) {
                if (!toCheck.length) {
                  /*
                    check points closer to the player first
                    so that we can detect gaps between visible tiles
                  */
                  toCheck.push.apply(toCheck, t.getRing(player, radius++))
                }

                const point = toCheck.pop()!

                // walls are not visible
                if (matrix.get(point) !== false) continue

                /*
                  don't allow for gaps between visible tiles
                  at least one neighbor must be visible
                */
                gaps: {
                  /*
                    X @ X
                  */
                  if (point.x > player.x) {
                    if (visibleSet.has(matrix.i(point.add(-1, 0)))) break gaps
                  } else if (point.x < player.x) {
                    if (visibleSet.has(matrix.i(point.add(1, 0)))) break gaps
                  }

                  /*
                    X
                    @
                    X
                  */
                  if (point.y > player.y) {
                    if (visibleSet.has(matrix.i(point.add(0, -1)))) break gaps
                  } else if (point.y < player.y) {
                    if (visibleSet.has(matrix.i(point.add(0, 1)))) break gaps
                  }

                  /*
                    X   X
                      @
                    X   X
                  */
                  if (point.x > player.x && point.y > player.y) {
                    if (visibleSet.has(matrix.i(point.add(-1, -1)))) break gaps
                  } else if (point.x < player.x && point.y < player.y) {
                    if (visibleSet.has(matrix.i(point.add(1, 1)))) break gaps
                  } else if (point.x > player.x && point.y < player.y) {
                    if (visibleSet.has(matrix.i(point.add(-1, 1)))) break gaps
                  } else if (point.x < player.x && point.y > player.y) {
                    if (visibleSet.has(matrix.i(point.add(1, -1)))) break gaps
                  }

                  continue
                }

                /*
                  a tile must not have a wall segment between it and the player
                */
                const tileSeg = t.segment(player, point)

                for (const wallSeg of wallSegments) {
                  if (t.segmentsIntersecting(tileSeg, wallSeg)) continue points
                }

                visibleSet.add(matrix.i(point))
              }

              return visibleSet
            }),
          )

          const isVisible = s.selector(visiblePoints, (i: number, set) => set.has(i))

          return (
            <Grid matrix={matrix}>
              {(_, i) => (
                <Cell isPlayer={isPlayer(i)} isWall={!isVisible(i)}>
                  {i}
                </Cell>
              )}
            </Grid>
          )
        })}
      </div>
    </PlaygroundContainer>
  )
}
