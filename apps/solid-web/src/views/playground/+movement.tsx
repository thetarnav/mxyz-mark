import { createEventListenerMap } from '@solid-primitives/event-listener'
import { createStaticStore } from '@solid-primitives/static-store'
import clsx from 'clsx'
import { JSX, createEffect, createMemo, createSelector, createSignal, untrack } from 'solid-js'
import { css } from 'solid-styled'
import {
  Cell,
  DIRECTIONS_H_V,
  DIRECTIONS_V_H,
  Direction,
  Grid,
  OPPOSITE_DIRECTION,
  PlaygroundContainer,
  Point,
  Matrix,
  createThrottledTrigger,
  randomInt,
  Segment,
} from './shared'

const DEFAULT_HELD_DIRECTION_STATE = {
  [Direction.Up]: false,
  [Direction.Right]: false,
  [Direction.Down]: false,
  [Direction.Left]: false,
} as const satisfies Record<Direction, boolean>

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: Direction.Up,
  w: Direction.Up,
  ArrowRight: Direction.Right,
  d: Direction.Right,
  ArrowDown: Direction.Down,
  s: Direction.Down,
  ArrowLeft: Direction.Left,
  a: Direction.Left,
}

function createHeldDirection() {
  const [heldDirections, setHeldDirections] = createStaticStore<Record<Direction, boolean>>(
    DEFAULT_HELD_DIRECTION_STATE,
  )

  let lastDirection = Direction.Up
  createEventListenerMap(window, {
    keydown(e) {
      const direction = KEY_TO_DIRECTION[e.key]
      if (direction) {
        setHeldDirections((lastDirection = direction), true)
        e.preventDefault()
      }
    },
    keyup(e) {
      const direction = KEY_TO_DIRECTION[e.key]
      if (direction) setHeldDirections(direction, false)
    },
    blur(e) {
      setHeldDirections(DEFAULT_HELD_DIRECTION_STATE)
    },
    contextmenu(e) {
      setHeldDirections(DEFAULT_HELD_DIRECTION_STATE)
    },
  })

  const current = createMemo(() => {
    const directions = { ...heldDirections }
    // prefer last direction
    const order =
      lastDirection === Direction.Up || lastDirection === Direction.Down
        ? DIRECTIONS_V_H
        : DIRECTIONS_H_V

    // only allow one direction at a time
    for (const direction of order) {
      if (directions[direction] && !directions[OPPOSITE_DIRECTION[direction]]) {
        return direction
      }
    }
  })

  return {
    current,
    directions: heldDirections,
  }
}

function createDirectionMovement(onMove: (direction: Direction) => void) {
  const heldDirections = createHeldDirection()

  const scheduled = createThrottledTrigger(1000 / 4)

  createEffect(() => {
    const direction = heldDirections.current()
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

const matrix = new Matrix(W, H, (x, y) => !!WALLS[H - 1 - y][x])

const wallSegments: Segment[] = []

// find all wall lines
{
  const seen = {
    h: new Set<number>(),
    v: new Set<number>(),
  }

  for (const i of matrix) {
    const point = matrix.point(i)

    let x = point.x,
      y = point.y,
      j = i

    while (matrix.get(j) && !seen.h.has(j) && x < W) {
      seen.h.add(j)
      x++
      j++
    }
    point.x + 1 < x && wallSegments.push(new Segment(point, new Point(x - 1, point.y)))

    j = i

    while (matrix.get(j) && !seen.v.has(j) && y < H) {
      seen.v.add(j)
      y++
      j += W
    }
    point.y + 1 < y && wallSegments.push(new Segment(point, new Point(point.x, y - 1)))
  }
}

export default function Movement(): JSX.Element {
  let initialPosition = randomInt(matrix.length)
  while (matrix.get(initialPosition)) {
    initialPosition = randomInt(matrix.length)
  }

  const [position, setPosition] = createSignal(initialPosition)
  const isPlayer = createSelector<number, number>(position)

  const heldDirections = createDirectionMovement(direction => {
    setPosition(p => {
      const newPos = matrix.go(p, direction)
      if (!newPos) return p
      const i = matrix.i(newPos)
      return matrix.get(i) ? p : i
    })
  })

  const DirectionKey = (props: { direction: Direction }) => {
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
    return <div class={clsx(heldDirections[props.direction] && 'held')}>{props.direction}</div>
  }

  return (
    <PlaygroundContainer>
      <div class="mb-8 flex flex-col items-center">
        <DirectionKey direction={Direction.Up} />
        <div class="flex">
          <DirectionKey direction={Direction.Left} />
          <DirectionKey direction={Direction.Down} />
          <DirectionKey direction={Direction.Right} />
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

          const playerCornerVec = createMemo(() => matrix.point(position()).add(-1, -1))

          const windowRect = createMemo(() => {
            const player = playerCornerVec()

            return new Matrix(WINDOW_RECT_SIZE, WINDOW_RECT_SIZE, (x, y) => {
              const vec = new Point(x, y).add(player)

              if (x === (WINDOW_RECT_SIZE - 1) / 2 && y === (WINDOW_RECT_SIZE - 1) / 2)
                return { isPlayer: true, isWall: false }

              let isWall = matrix.get(vec)
              if (isWall === undefined) isWall = true

              return { isPlayer: false, isWall }
            })
          })

          return (
            <Grid matrix={windowRect()} offset={playerCornerVec()}>
              {cell => <Cell isPlayer={cell().isPlayer} isWall={cell().isWall} />}
            </Grid>
          )
        })}
      </div>

      <div class="mt-16">
        {untrack(() => {
          const between = (a: number, b: number, c: number): boolean => {
            if (a > c) [a, c] = [c, a]
            return a - Number.EPSILON <= b && b <= c + Number.EPSILON
          }

          const rangesIntersecting = (a1: number, b1: number, a2: number, b2: number) => {
            if (a1 > b1) [a1, b1] = [b1, a1]
            if (a2 > b2) [a2, b2] = [b2, a2]
            return a1 <= b2 && a2 <= b1
          }

          // general form: ax + by + c = 0
          // slope-intercept form: y = sx + i
          // -sx + y - i = 0
          // normal: a = -s, b = 1, c = -i
          // vertical: a = 1, b = 0, c = -x
          const segmentToGeneralForm = (seg: Segment): [a: number, b: number, c: number] => {
            if (seg.x1 === seg.x2) {
              return [1, 0, -seg.x1]
            }
            const s = (seg.y2 - seg.y1) / (seg.x2 - seg.x1)
            const i = seg.y1 - s * seg.x1
            return [-s, 1, -i]
          }

          function segmentsIntersecting(seg1: Segment, seg2: Segment): boolean {
            const [a1, b1, c1] = segmentToGeneralForm(seg1)
            const [a2, b2, c2] = segmentToGeneralForm(seg2)

            // check if parallel
            if (a1 === a2 && b1 === b2) {
              // check if on same line
              if (c1 === c2) {
                // check if overlapping
                return (
                  rangesIntersecting(seg1.x1, seg1.x2, seg2.x1, seg2.x2) &&
                  rangesIntersecting(seg1.y1, seg1.y2, seg2.y1, seg2.y2)
                )
              }
              return false
            }

            // https://www.vedantu.com/formula/point-of-intersection-formula
            const det = a1 * b2 - a2 * b1
            const x = (b1 * c2 - b2 * c1) / det
            const y = (a2 * c1 - a1 * c2) / det

            return (
              between(seg1.x1, x, seg1.x2) &&
              between(seg2.x1, x, seg2.x2) &&
              between(seg1.y1, y, seg1.y2) &&
              between(seg2.y1, y, seg2.y2)
            )
          }

          {
            console.groupCollapsed('segmentsIntersecting')
            const segments = [
              // parallel vertical
              [
                new Segment(new Point(8, 1), new Point(8, 5)),
                new Segment(new Point(8, 2), new Point(8, 3)),
              ],
              // parallel vertical not intersecting
              [
                new Segment(new Point(1, 5), new Point(1, 6)),
                new Segment(new Point(1, 1), new Point(1, 2)),
              ],
              // parallel horizontal
              [
                new Segment(new Point(1, 5), new Point(7, 5)),
                new Segment(new Point(0, 5), new Point(8, 5)),
              ],
              // parallel diagonal
              [
                new Segment(new Point(1, 1), new Point(4, 4)),
                new Segment(new Point(2, 2), new Point(3, 3)),
              ],
              [
                new Segment(new Point(1, 5), new Point(1, 7)),
                new Segment(new Point(2, 5), new Point(0, 6)),
              ],
              [
                new Segment(new Point(1, 5), new Point(1, 7)),
                new Segment(new Point(2, 2), new Point(0, 6)),
              ],
              // around corner
              [
                new Segment(new Point(1, 4), new Point(0, 5)),
                new Segment(new Point(1, 5), new Point(1, 6)),
              ],
              // tip
              [
                new Segment(new Point(3, 1), new Point(3, 4)),
                new Segment(new Point(0, 1), new Point(6, 1)),
              ],
            ] as const
            segments.forEach(([seg1, seg2]) => {
              console.log(`intersecting ${seg1} and ${seg2}: ${segmentsIntersecting(seg1, seg2)}`)
            })
            console.groupEnd()
          }

          const visiblePoints = createMemo(() => {
            const playerIndex = position()
            const player = matrix.point(playerIndex)

            const visiblePoints = new Set<number>()

            for (const i of matrix) {
              if (matrix.get(i)) continue

              const tileSeg = new Segment(player, matrix.point(i))

              if (wallSegments.every(wallSeg => !segmentsIntersecting(tileSeg, wallSeg)))
                visiblePoints.add(i)
            }

            return visiblePoints
          })

          const isVisible = createSelector(visiblePoints, (i: number, set) => set.has(i))

          return (
            <Grid matrix={matrix}>
              {(isWall, i) => (
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
