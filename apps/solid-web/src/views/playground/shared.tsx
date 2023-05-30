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
import { Repeat } from '@solid-primitives/range'
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
  add(vec: Vector) {
    return new Vector(this.x + vec.x, this.y + vec.y)
  }
  toString() {
    return this.#arr.toString()
  }
}

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
  readonly #values: T[]
  constructor(public width: number, public height: number, fn: (i: number) => T) {
    this.length = width * height
    this.#values = Array.from({ length: this.length }, (_, i) => fn(i))
  }

  set(i: number, value: T) {
    this.#values[i] = value
  }
  get(i: number): T | undefined {
    return this.#values[i]
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
}) => {
  const reordered = createMemo(() => {
    const { matrix } = props
    const { width, length } = matrix
    const arr: { index: number; item: T }[] = []
    for (let i = 0; i < length; i++) {
      // display items in reverse y order
      // [1,2,3,4,5,6,7,8,9] | 3 -> [7,8,9,4,5,6,1,2,3]
      const index = Math.floor((length - 1 - i) / width) * width + (i % width)
      arr.push({ index, item: matrix.get(index)! })
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

  return (
    <div class="wrapper border-gray-6 relative grid rounded-md border">
      <Index each={reordered()}>{item => props.children(() => item().item, item().index)}</Index>
      <div class="x-axis absolute left-0 top-full mt-2 grid w-full">
        <Repeat times={props.matrix.width}>{x => <AxisMark>{x}</AxisMark>}</Repeat>
      </div>
      <div class="y-axis absolute right-full top-0 mr-3 grid h-full">
        <Repeat times={props.matrix.height}>
          {y => <AxisMark>{props.matrix.height - 1 - y}</AxisMark>}
        </Repeat>
      </div>
    </div>
  )
}

export const Cell: Component<{
  borders?: Partial<Record<Direction, boolean>>
  isPlayer?: boolean
  isWall?: boolean
  index: number
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
      {props.index}
    </div>
  )
}
