import { createEventListenerMap } from '@solid-primitives/event-listener'
import { createStaticStore } from '@solid-primitives/static-store'
import clsx from 'clsx'
import { JSX, createEffect, createMemo, createSelector, createSignal } from 'solid-js'
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

export default function Movement(): JSX.Element {
  const defaultHeldDirectionsState = {
    [Direction.Up]: false,
    [Direction.Right]: false,
    [Direction.Down]: false,
    [Direction.Left]: false,
  } as const satisfies Record<Direction, boolean>

  const [heldDirections, setHeldDirections] = createStaticStore<Record<Direction, boolean>>(
    defaultHeldDirectionsState,
  )

  const keyToDirectionMap: Record<string, Direction> = {
    ArrowUp: Direction.Up,
    w: Direction.Up,
    ArrowRight: Direction.Right,
    d: Direction.Right,
    ArrowDown: Direction.Down,
    s: Direction.Down,
    ArrowLeft: Direction.Left,
    a: Direction.Left,
  }

  let lastDirection = Direction.Up
  createEventListenerMap(window, {
    keydown(e) {
      const direction = keyToDirectionMap[e.key]
      if (direction) {
        setHeldDirections((lastDirection = direction), true)
        e.preventDefault()
      }
    },
    keyup(e) {
      const direction = keyToDirectionMap[e.key]
      if (direction) setHeldDirections(direction, false)
    },
    blur(e) {
      setHeldDirections(defaultHeldDirectionsState)
    },
    contextmenu(e) {
      setHeldDirections(defaultHeldDirectionsState)
    },
  })

  const currentDirection = createMemo(() => {
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

  const W = 20
  const H = 10
  const matrix = new XYMatrix(W, H, i => i)

  const [position, setPosition] = createSignal(randomInt(matrix.length))
  const isPlayer = createSelector(position)

  const scheduled = createThrottledTrigger(1000 / 4)

  createEffect(() => {
    const direction = currentDirection()
    if (direction && scheduled()) {
      setPosition(p => {
        const newPos = matrix.go(p, direction)
        return newPos === undefined ? p : matrix.i(newPos)
      })
    }
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
      <Grid matrix={matrix}>{(_, i) => <Cell fill={isPlayer(i)} index={i} />}</Grid>
    </PlaygroundContainer>
  )
}
