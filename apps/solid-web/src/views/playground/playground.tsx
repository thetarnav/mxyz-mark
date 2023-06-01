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
import { Direction, Matrix, Point, ZERO_POINT } from './trig'

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

  const offset = () => props.offset || ZERO_POINT

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
