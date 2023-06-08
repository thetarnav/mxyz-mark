import { createEventListener } from '@solid-primitives/event-listener'
import { Range } from '@solid-primitives/range'
import clsx from 'clsx'
import { Accessor, Component, JSX, ParentComponent, createMemo } from 'solid-js'
import { MatrixGrid } from 'src/lib/state'
import { Direction, Matrix, Point, ZERO_POINT } from '../../lib/trig'

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
  const AxisMark: ParentComponent = props => (
    <div class="center-child text-gray-5">{props.children}</div>
  )

  const offset = () => props.offset || ZERO_POINT

  return (
    <div class="border-gray-6 relative rounded-md border">
      <MatrixGrid matrix={props.matrix}>{props.children}</MatrixGrid>
      <div
        class="absolute left-0 top-full mt-2 grid w-full"
        style={`grid-template-columns: repeat(${props.matrix.width + ''}, 2rem)`}
      >
        <Range start={offset().x} to={props.matrix.width + offset().x}>
          {x => <AxisMark>{x}</AxisMark>}
        </Range>
      </div>
      <div
        class="absolute right-full top-0 mr-3 grid h-full"
        style={`grid-template-rows: repeat(${props.matrix.height + ''}, 2rem)`}
      >
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
