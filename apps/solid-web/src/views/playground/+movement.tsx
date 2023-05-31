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

const wallLines: [Point, Point][] = []

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
    point.x + 1 < x && wallLines.push([point, new Point(x - 1, point.y)])

    j = i

    while (matrix.get(j) && !seen.v.has(j) && y < H) {
      seen.v.add(j)
      y++
      j += W
    }
    point.y + 1 < y && wallLines.push([point, new Point(point.x, y - 1)])
  }
}

export default function Movement(): JSX.Element {
  let initialPosition = randomInt(matrix.length)
  while (matrix.get(initialPosition)) {
    initialPosition = randomInt(matrix.length)
  }

  const [position, setPosition] = createSignal(initialPosition)
  const isPlayer = createSelector(position)

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

  css`
    .held-directions {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 1rem;
    }
  `

  return (
    <PlaygroundContainer>
      <div class="held-directions">
        <DirectionKey direction={Direction.Up} />
        <div class="flex">
          <DirectionKey direction={Direction.Left} />
          <DirectionKey direction={Direction.Down} />
          <DirectionKey direction={Direction.Right} />
        </div>
      </div>

      <div class="flex items-start gap-12">
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
    </PlaygroundContainer>
  )
}
