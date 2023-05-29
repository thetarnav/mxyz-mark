import { Component, ParentComponent, createSignal } from 'solid-js'
import { css } from 'solid-styled'

export const randomInt = (max: number) => Math.floor(Math.random() * max)
export const randomIntFromTo = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min)) + min

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

export const W = 20
export const H = 10

export function* randomIterate<T>(arr: readonly T[]) {
  const copy = arr.slice()
  while (copy.length) {
    const index = randomInt(copy.length)
    yield copy.splice(index, 1)[0]
  }
}

export class Vector {
  #arr: readonly [number, number]
  constructor(x: number, y: number) {
    this.#arr = [x, y]
  }
  get x() {
    return this.#arr[0]
  }
  get y() {
    return this.#arr[1]
  }
  add(vec: Vector) {
    return new Vector(this.x + vec.x, this.y + vec.y)
  }
}

export const DIRECTION_TO_VECTOR: Record<Direction, Vector> = {
  [Direction.Up]: new Vector(0, -1),
  [Direction.Right]: new Vector(1, 0),
  [Direction.Down]: new Vector(0, 1),
  [Direction.Left]: new Vector(-1, 0),
}

export const DIRECTION_POINTS = [
  new Vector(1, 0),
  new Vector(-1, 0),
  new Vector(0, 1),
  new Vector(0, -1),
] as const

export const CORNER_POINTS = [
  new Vector(1, 1),
  new Vector(-1, 1),
  new Vector(1, -1),
  new Vector(-1, -1),
] as const

export const DIRECTION_AND_CORNER_POINTS = [...DIRECTION_POINTS, ...CORNER_POINTS] as const

export class XYMatrix<T> {
  readonly length: number
  readonly values: readonly T[]
  constructor(public width: number, public height: number, fn: (i: number) => T) {
    this.length = width * height
    this.values = Array.from({ length: this.length }, (_, i) => fn(i))
  }

  get(i: number): T | undefined {
    return this.values[i]
  }
  i(vec: Vector) {
    return XYMatrix.i(this.width, vec)
  }
  vec(i: number) {
    return XYMatrix.vec(this.width, i)
  }
  go(from: Vector | number, by: Vector | number | Direction) {
    return XYMatrix.go(this.width, this.height, from, by)
  }

  static vec(width: number, i: number): Vector {
    return new Vector(i % width, Math.floor(Math.abs(i / width)) * Math.sign(i))
  }
  static i(width: number, vec: Vector) {
    return vec.x + vec.y * width
  }
  static go(
    width: number,
    height: number,
    from: Vector | number,
    by: Vector | number | Direction,
  ): Vector | undefined {
    if (!(by instanceof Vector))
      by = typeof by === 'number' ? this.vec(width, by) : DIRECTION_TO_VECTOR[by]
    if (!(from instanceof Vector)) from = this.vec(width, from)
    const sum = from.add(by)
    return sum.x >= 0 && sum.x < width && sum.y >= 0 && sum.y < height ? sum : undefined
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
