import {
  Accessor,
  Component,
  Index,
  JSX,
  ParentComponent,
  createMemo,
  createSignal,
} from 'solid-js'
import { css } from 'solid-styled'
import { Range } from '@solid-primitives/range'
import { createEventListener } from '@solid-primitives/event-listener'
import clsx from 'clsx'

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
  add(vec: Vector): Vector
  add(x: number, y: number): Vector
  add(vecOrX: Vector | number, y?: number): Vector {
    const [dx, dy] = typeof vecOrX === 'number' ? [vecOrX, y!] : vecOrX.#arr
    return new Vector(this.x + dx, this.y + dy)
  }
  toString() {
    return this.#arr.toString()
  }
}

const ZERO_VECTOR = new Vector(0, 0)

export const DIRECTION_TO_VECTOR: Record<Direction, Vector> = {
  [Direction.Up]: new Vector(0, 1),
  [Direction.Right]: new Vector(1, 0),
  [Direction.Down]: new Vector(0, -1),
  [Direction.Left]: new Vector(-1, 0),
}

export const DIRECTION_TO_MOVE: Record<Direction, (width: number) => number> = {
  [Direction.Up]: width => width,
  [Direction.Right]: () => 1,
  [Direction.Down]: width => -width,
  [Direction.Left]: () => -1,
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
  readonly #values: T[][]
  constructor(public width: number, public height: number, fn: (x: number, y: number) => T) {
    this.length = width * height
    this.#values = Array.from({ length: width }, (_, x) =>
      Array.from({ length: height }, (_, y) => fn(x, y)),
    )
  }

  set(vec: Vector | number, value: T) {
    if (typeof vec === 'number') vec = this.vec(vec)
    if (!this.inBounds(vec)) return
    this.#values[vec.x][vec.y] = value
  }
  get(vec: Vector | number): T | undefined {
    if (typeof vec === 'number') vec = this.vec(vec)
    return this.inBounds(vec) ? this.#values[vec.x][vec.y] : undefined
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
  inBounds(vec: Vector) {
    return XYMatrix.inBounds(this.width, this.height, vec)
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
    return this.inBounds(width, height, sum) ? sum : undefined
  }
  static inBounds(width: number, height: number, vec: Vector) {
    return vec.x >= 0 && vec.x < width && vec.y >= 0 && vec.y < height
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

export const PlaygroundContainer = (props: { children: JSX.Element }) => {
  return <div class="flex flex-col items-center">{props.children}</div>
}

export const TriggerButton = (props: {
  onTrigger: () => void
  text: string
  key: string
  class?: string
}) => {
  const keyCode = props.key.toLowerCase()

  createEventListener(window, 'keydown', e => {
    if (e.key.toLowerCase() === keyCode) {
      props.onTrigger()
    }
  })

  const text = createMemo(() => {
    const index = props.text.toLowerCase().indexOf(keyCode)
    return index === -1 ? (
      <>
        {props.text} <span class="underline">({props.key})</span>
      </>
    ) : (
      <>
        {props.text.slice(0, index)}
        <span class="underline">{props.text[index]}</span>
        {props.text.slice(index + 1, props.text.length)}
      </>
    )
  })

  return (
    <button class={props.class} onClick={props.onTrigger}>
      {text()}
    </button>
  )
}

export const Grid = <T,>(props: {
  matrix: XYMatrix<T>
  children: (item: Accessor<T>, index: number) => JSX.Element
  offset?: Vector
}) => {
  const reordered = createMemo(() => {
    const { matrix } = props
    const { width, height } = matrix
    const arr: { index: number; item: T }[] = []
    // display items in reverse y order
    // [1,2,3,4,5,6,7,8,9] | 3 -> [7,8,9,4,5,6,1,2,3]
    for (let y = height - 1; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        const vec = new Vector(x, y)
        arr.push({ index: matrix.i(vec), item: matrix.get(vec)! })
      }
    }
    return arr
  })

  css`
    .wrapper,
    .x-axis {
      grid-template-columns: repeat(${props.matrix.width + ''}, 2rem);
    }
    .wrapper,
    .y-axis {
      grid-template-rows: repeat(${props.matrix.height + ''}, 2rem);
    }
  `

  const AxisMark: ParentComponent = props => (
    <div class="center-child text-gray-5">{props.children}</div>
  )

  const offset = () => props.offset || ZERO_VECTOR

  return (
    <div class="wrapper border-gray-6 relative grid rounded-md border">
      <Index each={reordered()}>{item => props.children(() => item().item, item().index)}</Index>
      <div class="x-axis absolute left-0 top-full mt-2 grid w-full">
        <Range start={offset().x} to={props.matrix.width + offset().x}>
          {x => <AxisMark>{x}</AxisMark>}
        </Range>
      </div>
      <div class="y-axis absolute right-full top-0 mr-3 grid h-full">
        <Range start={props.matrix.height + offset().y - 1} to={offset().y - 1}>
          {y => <AxisMark>{y}</AxisMark>}
        </Range>
      </div>
    </div>
  )
}

export const Cell: Component<{
  borders?: Partial<Record<Direction, boolean>>
  isPlayer?: boolean
  isWall?: boolean
  children?: JSX.Element
}> = props => {
  const borders = () => props.borders || {}

  return (
    <div
      class={clsx(
        'border-2px flex items-center justify-center border-transparent',
        props.isPlayer
          ? 'bg-primary text-dark'
          : props.isWall
          ? 'text-dark bg-gray-4'
          : 'text-gray-4 bg-transparent',
        {
          'border-r-light': borders()[Direction.Right],
          'border-b-light': borders()[Direction.Down],
        },
      )}
    >
      {props.children}
    </div>
  )
}
