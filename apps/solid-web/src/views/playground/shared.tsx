import { Component, ParentComponent, createSignal } from 'solid-js'
import { css } from 'solid-styled'

export const randomInt = (max: number) => Math.floor(Math.random() * max)
export const randomIntFromTo = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min)) + min

export const DIRECTION_POINTS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

export const CORNER_POINTS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const

export const DIRECTION_AND_CORNER_POINTS = [...DIRECTION_POINTS, ...CORNER_POINTS] as const

// export const DIRECTIONS = ['RIGHT', 'LEFT', 'DOWN', 'UP'] as const

export enum Direction {
  Right = 'RIGHT',
  Left = 'LEFT',
  Down = 'DOWN',
  Up = 'UP',
}

export const DIRECTIONS_H_V = [
  Direction.Right,
  Direction.Left,
  Direction.Down,
  Direction.Up,
] as const
export const DIRECTIONS_V_H = [
  Direction.Down,
  Direction.Up,
  Direction.Right,
  Direction.Left,
] as const

export const OPPOSITE_DIRECTION = {
  [Direction.Right]: Direction.Left,
  [Direction.Left]: Direction.Right,
  [Direction.Down]: Direction.Up,
  [Direction.Up]: Direction.Down,
}

export const DIRECTION_TO_OFFSET_MAP: Record<Direction, [number, number]> = {
  [Direction.Up]: [0, -1],
  [Direction.Right]: [1, 0],
  [Direction.Down]: [0, 1],
  [Direction.Left]: [-1, 0],
}

export const W = 20
export const H = 10

export function* randomIterate<T>(arr: readonly T[]) {
  const copy = arr.slice()
  while (copy.length) {
    const index = randomInt(copy.length)
    yield copy.splice(index, 1)[0]
  }
}

export const getXY = (width: number, i: number): [number, number] => [
  i % width,
  Math.floor(i / width),
]

export function createThrottledTrigger(delay: number) {
  const [track, trigger] = createSignal(undefined, { equals: false })
  let timeout: ReturnType<typeof setTimeout> | undefined

  return () => {
    track()

    if (timeout) return false

    timeout = setTimeout(() => {
      timeout = undefined
      trigger()
    }, delay)

    return true
  }
}

export const Grid: ParentComponent = props => {
  css`
    div {
      display: grid;
      grid-template-columns: repeat(${W + ''}, 1fr);
      grid-template-rows: repeat(${H + ''}, 1fr);
      width: ${W * 2 + 'rem'};
      height: ${H * 2 + 'rem'};
      border: 2px solid rgba(255, 255, 255, 0.2);
    }
  `

  return <div>{props.children}</div>
}

export const Cell: Component<{
  borderBottom?: boolean
  borderRight?: boolean
  fill?: boolean
  index: number
}> = props => {
  css`
    div {
      border-right: ${props.borderRight ? '2px solid white' : '2px solid transparent'};
      border-bottom: ${props.borderBottom ? '2px solid white' : '2px solid transparent'};
      background: ${props.fill ? '#DE311B' : 'transparent'};
      color: ${props.fill ? 'black' : 'lightgray'};
    }
  `

  return <div class="flex justify-center items-center">{props.index}</div>
}
