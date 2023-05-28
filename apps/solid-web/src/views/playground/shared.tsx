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

export const enum Direction {
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

const directionToMoveTable: Record<Direction, (width: number) => number> = {
  [Direction.Up]: width => -width,
  [Direction.Right]: width => +1,
  [Direction.Down]: width => +width,
  [Direction.Left]: width => -1,
}
const getAtDirectionTable: Record<Direction, (width: number, i: number) => number> = {
  [Direction.Up]: (width, i) => i - width,
  [Direction.Right]: (width, i) => i + 1,
  [Direction.Down]: (width, i) => i + width,
  [Direction.Left]: (width, i) => i - 1,
}
const canMoveToDirectionTable: Record<
  Direction,
  (width: number, length: number, i: number) => boolean
> = {
  [Direction.Up]: (width, length, i) => i >= width,
  [Direction.Right]: (width, length, i) => i % width < width - 1,
  [Direction.Down]: (width, length, i) => i < length - width,
  [Direction.Left]: (width, length, i) => i % width > 0,
}

export class XYMatrix<T> {
  readonly length: number
  readonly values: readonly T[]
  constructor(public width: number, public height: number, fn: (x: number, y: number) => T) {
    this.length = width * height
    this.values = Array.from({ length: this.length }, (_, i) => fn(this.x(i), this.y(i)))
  }

  i(x: number, y: number) {
    return x + y * this.width
  }
  get(i: number): T | undefined {
    return this.values[i]
  }
  x(i: number) {
    return i % this.width
  }
  y(i: number) {
    return Math.floor(i / this.width)
  }
  xy(i: number): [number, number] {
    return [this.x(i), this.y(i)]
  }
  go(direction: Direction, i: number): number {
    return XYMatrix.go(direction, this.width, i)
  }
  goXY(i: number, dx: number, dy: number): number {
    return this.i(this.x(i) + dx, this.y(i) + dy)
  }
  canGo(direction: Direction, i: number): boolean {
    return XYMatrix.canGo(direction, this.width, this.height, i)
  }

  rows() {
    const rows: T[][] = []
    for (let y = 0; y < this.height; y++) {
      rows.push(this.values.slice(y * this.width, (y + 1) * this.width))
    }
    return rows
  }

  [Symbol.iterator]() {
    return this.values[Symbol.iterator]()
  }

  static x(width: number, i: number) {
    return i % width
  }
  static y(width: number, i: number) {
    return Math.floor(i / width)
  }
  static xy(width: number, i: number): [number, number] {
    return [this.x(width, i), this.y(width, i)]
  }
  static i(width: number, x: number, y: number) {
    return x + y * width
  }
  static go(direction: Direction, width: number, i: number): number {
    return getAtDirectionTable[direction](width, i)
  }
  static canGo(direction: Direction, width: number, height: number, i: number): boolean {
    return canMoveToDirectionTable[direction](width, width * height, i)
  }
}

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

export const Grid: ParentComponent<{ width: number; height: number }> = props => {
  css`
    div {
      display: grid;
      grid-template-columns: repeat(${props.width + ''}, 1fr);
      grid-template-rows: repeat(${props.height + ''}, 1fr);
      width: ${props.width * 2 + 'rem'};
      height: ${props.height * 2 + 'rem'};
      border: 2px solid rgba(255, 255, 255, 0.2);
    }
  `

  return <div>{props.children}</div>
}

export const Cell: Component<{
  borders?: Partial<Record<Direction, boolean>>
  fill?: boolean
  index: number
}> = props => {
  const borderTransparent = '2px solid transparent',
    borderWhite = '2px solid white'
  const borders = () => props.borders || {}
  css`
    div {
      border-right: ${borders()[Direction.Right] ? borderWhite : borderTransparent};
      border-bottom: ${borders()[Direction.Down] ? borderWhite : borderTransparent};
      border-left: ${borders()[Direction.Left] ? borderWhite : borderTransparent};
      border-top: ${borders()[Direction.Up] ? borderWhite : borderTransparent};
      background: ${props.fill ? '#DE311B' : 'transparent'};
      color: ${props.fill ? 'black' : 'lightgray'};
    }
  `

  return <div class="flex items-center justify-center">{props.index}</div>
}
