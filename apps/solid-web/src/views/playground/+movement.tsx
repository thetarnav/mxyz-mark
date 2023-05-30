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
  XYMatrix,
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
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0, 0, 1, 1, 1],
  [0, 1, 0, 1, 0, 1, 0, 0, 1, 0],
  [0, 1, 0, 1, 1, 1, 0, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
]

export default function Movement(): JSX.Element {
  const W = WALLS[0].length
  const H = WALLS.length
  const matrix = new XYMatrix(W, H, i => {
    const vec = XYMatrix.vec(W, i)
    return !!WALLS[H - 1 - vec.y][vec.x]
  })

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
      <Grid matrix={matrix}>
        {(isWall, i) => <Cell isPlayer={isPlayer(i)} isWall={isWall()} index={i} />}
      </Grid>
    </PlaygroundContainer>
  )
}
