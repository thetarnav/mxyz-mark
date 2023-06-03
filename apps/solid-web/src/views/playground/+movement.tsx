import { createEventListenerMap } from '@solid-primitives/event-listener'
import clsx from 'clsx'
import { JSX, createEffect, untrack } from 'solid-js'
import { css } from 'solid-styled'
import { Cell, Grid, PlaygroundContainer, createThrottledTrigger } from './playground'
import * as t from 'src/lib/trig'
import * as s from 'src/lib/signal'
import * as game from 'src/lib/game'

const DEFAULT_HELD_DIRECTION_STATE: Record<t.Direction, boolean> = {
  [t.Direction.Up]: false,
  [t.Direction.Right]: false,
  [t.Direction.Down]: false,
  [t.Direction.Left]: false,
}

const KEY_TO_DIRECTION: Record<string, t.Direction> = {
  ArrowUp: t.Direction.Up,
  w: t.Direction.Up,
  ArrowRight: t.Direction.Right,
  d: t.Direction.Right,
  ArrowDown: t.Direction.Down,
  s: t.Direction.Down,
  ArrowLeft: t.Direction.Left,
  a: t.Direction.Left,
}

function createHeldDirection() {
  const directions = s.signal(DEFAULT_HELD_DIRECTION_STATE)

  let lastDirection = t.Direction.Up
  createEventListenerMap(window, {
    keydown(e) {
      const direction = KEY_TO_DIRECTION[e.key]
      if (direction) {
        s.update(directions, p => ({ ...p, [(lastDirection = direction)]: true }))
        e.preventDefault()
      }
    },
    keyup(e) {
      const direction = KEY_TO_DIRECTION[e.key]
      if (direction) s.update(directions, p => ({ ...p, [direction]: false }))
    },
    blur(e) {
      s.set(directions, DEFAULT_HELD_DIRECTION_STATE)
    },
    contextmenu(e) {
      s.set(directions, DEFAULT_HELD_DIRECTION_STATE)
    },
  })

  const current = s.memo(
    s.map(directions, directions => {
      // prefer last direction
      const order =
        lastDirection === t.Direction.Up || lastDirection === t.Direction.Down
          ? t.DIRECTIONS_V_H
          : t.DIRECTIONS_H_V

      // only allow one direction at a time
      for (const direction of order) {
        if (directions[direction] && !directions[t.OPPOSITE_DIRECTION[direction]]) {
          return direction
        }
      }
    }),
  )

  return {
    current,
    directions,
  }
}

function createDirectionMovement(onMove: (direction: t.Direction) => void) {
  const heldDirections = createHeldDirection()

  const scheduled = createThrottledTrigger(1000 / 4)

  createEffect(() => {
    const direction = heldDirections.current.value
    if (direction && scheduled()) untrack(() => onMove(direction))
  })

  return heldDirections.directions
}

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
  const playerPoint = s.memo(s.map(position, position => matrix.point(position)))

  const heldDirections = createDirectionMovement(direction => {
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
          const WINDOW_RECT_SIZE = 3

          const playerCornerPoint = s.memo(
            s.map(position, position => matrix.point(position).add(-1, -1)),
          )

          const windowRect = s.memo(
            s.map(
              playerPoint,
              player =>
                game.getWindowedMaze(WINDOW_RECT_SIZE, WINDOW_RECT_SIZE, player, matrix)
            ),
          )

          return (
            <Grid matrix={windowRect.value} offset={playerCornerPoint.value}>
              {cell => <Cell isPlayer={cell().isPlayer} isWall={cell().isWall} />}
            </Grid>
          )
        })}
      </div>

      <div class="mt-16">
        {untrack(() => {
          const visiblePoints = s.memo(
            s.map(position, playerIndex => {
              const player = matrix.point(playerIndex)
              const visibleSet = new Set<number>([playerIndex])

              const toCheck: t.Point[] = []
              let radius = 1
              points: for (const _ of matrix) {
                if (!toCheck.length) {
                  /*
                    check points closer to the player first
                    so that we can detect gaps between visible tiles
                  */
                  toCheck.push.apply(toCheck, t.getRing(matrix, player, radius++))
                }

                const point = toCheck.pop()!

                // walls are not visible
                if (matrix.get(point)) continue

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
