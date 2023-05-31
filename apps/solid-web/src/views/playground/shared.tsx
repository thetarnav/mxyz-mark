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

export type Pointable = { x: number; y: number }

export class Point implements Pointable {
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
  add(vec: Point): Point
  add(x: number, y: number): Point
  add(vecOrX: Point | number, y?: number): Point {
    const [dx, dy] = typeof vecOrX === 'number' ? [vecOrX, y!] : vecOrX.#arr
    return new Point(this.x + dx, this.y + dy)
  }
  equals(vec: Pointable) {
    return this.x === vec.x && this.y === vec.y
  }
  toString() {
    return this.#arr.toString()
  }
  toJSON() {
    return { x: this.x, y: this.y }
  }
}

const ZERO_VECTOR = new Point(0, 0)

export const DIRECTION_TO_VECTOR: Record<Direction, Point> = {
  [Direction.Up]: new Point(0, 1),
  [Direction.Right]: new Point(1, 0),
  [Direction.Down]: new Point(0, -1),
  [Direction.Left]: new Point(-1, 0),
}

export const DIRECTION_TO_MOVE: Record<Direction, (width: number) => number> = {
  [Direction.Up]: width => width,
  [Direction.Right]: () => 1,
  [Direction.Down]: width => -width,
  [Direction.Left]: () => -1,
}

export const DIRECTION_POINTS = [
  new Point(1, 0),
  new Point(-1, 0),
  new Point(0, 1),
  new Point(0, -1),
] as const

export const CORNER_POINTS = [
  new Point(1, 1),
  new Point(-1, 1),
  new Point(1, -1),
  new Point(-1, -1),
] as const

export const DIRECTION_AND_CORNER_POINTS = [...DIRECTION_POINTS, ...CORNER_POINTS] as const

export class Matrix<T> {
  readonly length: number
  readonly #values: T[][]
  constructor(public width: number, public height: number, fn: (x: number, y: number) => T) {
    this.length = width * height
    this.#values = Array.from({ length: width }, (_, x) =>
      Array.from({ length: height }, (_, y) => fn(x, y)),
    )
  }

  set(point: Pointable | number, value: T) {
    if (typeof point === 'number') point = this.point(point)
    if (!this.inBounds(point)) return
    this.#values[point.x][point.y] = value
  }
  get(point: Pointable | number): T | undefined {
    if (typeof point === 'number') point = this.point(point)
    return this.inBounds(point) ? this.#values[point.x][point.y] : undefined
  }
  i(point: Pointable) {
    return Matrix.i(this.width, point)
  }
  point(i: number) {
    return Matrix.vec(this.width, i)
  }
  go(from: Point | number, by: Point | number | Direction) {
    return Matrix.go(this.width, this.height, from, by)
  }
  inBounds(vec: Pointable) {
    return Matrix.inBounds(this.width, this.height, vec)
  }

  *[Symbol.iterator]() {
    for (let i = 0; i < this.length; i++) yield i
  }

  static vec(width: number, i: number): Point {
    return new Point(i % width, Math.floor(Math.abs(i / width)) * Math.sign(i))
  }
  static i(width: number, point: Pointable) {
    return point.x + point.y * width
  }
  static go(
    width: number,
    height: number,
    from: Point | number,
    by: Point | number | Direction,
  ): Point | undefined {
    if (!(by instanceof Point))
      by = typeof by === 'number' ? this.vec(width, by) : DIRECTION_TO_VECTOR[by]
    if (!(from instanceof Point)) from = this.vec(width, from)
    const sum = from.add(by)
    return this.inBounds(width, height, sum) ? sum : undefined
  }
  static inBounds(width: number, height: number, p: Pointable) {
    return p.x >= 0 && p.x < width && p.y >= 0 && p.y < height
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
  matrix: Matrix<T>
  children: (item: Accessor<T>, index: number) => JSX.Element
  offset?: Point
}) => {
  const reordered = createMemo(() => {
    const { matrix } = props,
      { width, height } = matrix,
      arr: { index: number; item: T }[] = []
    // display items in reverse y order
    // [1,2,3,4,5,6,7,8,9] | 3 -> [7,8,9,4,5,6,1,2,3]
    for (const i of matrix) {
      const point = matrix.point(i)
      const reorderedI = (height - 1 - point.y) * width + point.x
      arr.push({ index: reorderedI, item: matrix.get(reorderedI)! })
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
