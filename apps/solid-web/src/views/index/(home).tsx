import { createEventListenerMap } from '@solid-primitives/event-listener'
import { createStaticStore } from '@solid-primitives/static-store'
import clsx from 'clsx'
import {
  Component,
  Index,
  ParentComponent,
  createEffect,
  createMemo,
  createSelector,
  createSignal,
  untrack,
} from 'solid-js'
import { css } from 'solid-styled'

const randomInt = (max: number) => Math.floor(Math.random() * max)
const randomIntFromTo = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min

const DIRECTION_POINTS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

const CORNER_POINTS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
] as const

const DIRECTION_AND_CORNER_POINTS = [...DIRECTION_POINTS, ...CORNER_POINTS] as const

// const DIRECTIONS = ['RIGHT', 'LEFT', 'DOWN', 'UP'] as const

enum Direction {
  Right = 'RIGHT',
  Left = 'LEFT',
  Down = 'DOWN',
  Up = 'UP',
}

const DIRECTIONS_H_V = [Direction.Right, Direction.Left, Direction.Down, Direction.Up] as const
const DIRECTIONS_V_H = [Direction.Down, Direction.Up, Direction.Right, Direction.Left] as const

const OPPOSITE_DIRECTION = {
  [Direction.Right]: Direction.Left,
  [Direction.Left]: Direction.Right,
  [Direction.Down]: Direction.Up,
  [Direction.Up]: Direction.Down,
}

const DIRECTION_TO_OFFSET_MAP: Record<Direction, [number, number]> = {
  [Direction.Up]: [0, -1],
  [Direction.Right]: [1, 0],
  [Direction.Down]: [0, 1],
  [Direction.Left]: [-1, 0],
}

const W = 20
const H = 10

function* randomIterate<T>(arr: readonly T[]) {
  const copy = arr.slice()
  while (copy.length) {
    const index = randomInt(copy.length)
    yield copy.splice(index, 1)[0]
  }
}

const getXY = (width: number, i: number): [number, number] => [i % width, Math.floor(i / width)]

function createThrottledTrigger(delay: number) {
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

const Grid: ParentComponent = props => {
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

const Cell: Component<{
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

export default function Home() {
  return (
    <main class="flex flex-col items-center gap-24 py-24">
      <section>
        <h4>Noise</h4>
        {untrack(() => {
          const [track, trigger] = createSignal(undefined, { equals: false })

          function generateNoise(width: number, height: number) {
            const length = width * height
            const result = Array.from({ length }, () => false)

            const stack = Array.from({ length: length * 0.05 }, () => randomInt(length))

            while (stack.length > 0) {
              const i = stack.pop()!,
                [x, y] = getXY(width, i)

              result[i] = true

              // Skip spreading on the edges
              if (x === 0 || x === width - 1 || y === 0 || y === height - 1) continue

              for (const [dx, dy] of randomIterate(DIRECTION_AND_CORNER_POINTS)) {
                const j = x + dx + (y + dy) * width

                if (j < 0 || j >= length || result[j]) continue

                stack.push(j)
                break
              }
            }

            return result
          }

          return (
            <>
              <button onClick={() => trigger()}>Regenerate</button>
              <br />
              <br />
              <Grid>
                <Index each={(track(), generateNoise(W, H))}>
                  {(cell, i) => <Cell fill={cell()} index={i} />}
                </Index>
              </Grid>
            </>
          )
        })}
      </section>
      <section>
        <h4>Maze</h4>
        {untrack(() => {
          const [track, trigger] = createSignal(undefined, { equals: false })

          function generateMaze(
            width: number,
            height: number,
          ): { right: boolean; down: boolean }[] {
            const length = width * height,
              result = Array.from({ length }, () => ({
                right: true,
                down: true,
              })),
              stack = [0],
              neighbors: number[] = [],
              add = (j: number) => {
                const index = stack.indexOf(j)
                if (index === -1) stack.push(j)
                else if (index < stackIndex) neighbors.push(j)
              }

            let stackIndex = 0

            for (; stackIndex < length; stackIndex++) {
              const swap = randomIntFromTo(stackIndex, stack.length)
              const i = stack[swap]
              stack[swap] = stack[stackIndex]
              stack[stackIndex] = i

              // up
              if (i >= width) add(i - width)
              // right
              if ((i + 1) % width !== 0) add(i + 1)
              // down
              if (i < length - width) add(i + width)
              // left
              if (i % width !== 0) add(i - 1)

              if (neighbors.length === 0) continue

              const j = neighbors[randomInt(neighbors.length)]
              switch (j - i) {
                case -width: // up
                  result[i - width].down = false
                  break
                case -1: // left
                  result[i - 1].right = false
                  break
                case width: // down
                  result[i].down = false
                  break
                case 1: // right
                  result[i].right = false
                  break
              }

              neighbors.length = 0
            }

            return result
          }

          return (
            <>
              <button onClick={() => trigger()}>Regenerate</button>
              <br />
              <br />
              <Grid>
                <Index each={(track(), generateMaze(W, H))}>
                  {(cell, i) => (
                    <Cell borderRight={cell().right} borderBottom={cell().down} index={i} />
                  )}
                </Index>
              </Grid>
            </>
          )
        })}
      </section>
      <section>
        <h4>Movement</h4>
        {untrack(() => {
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

          const [position, setPosition] = createSignal([randomInt(W), randomInt(H)], {
            equals: ([x1, y1], [x2, y2]) => x1 === x2 && y1 === y2,
          })
          const isPlayer = createSelector(position, (i: number, [x, y]) => i === x + y * W)

          const move = (dx: number, dy: number) => {
            setPosition(([x, y]) => [
              Math.max(0, Math.min(W - 1, x + dx)),
              Math.max(0, Math.min(H - 1, y + dy)),
            ])
          }

          const scheduled = createThrottledTrigger(1000 / 4)

          createEffect(() => {
            const direction = currentDirection()
            if (direction && scheduled()) {
              move(...DIRECTION_TO_OFFSET_MAP[direction])
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
            return (
              <div class={clsx(heldDirections[props.direction] && 'held')}>{props.direction}</div>
            )
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
            <>
              <div class="held-directions">
                <DirectionKey direction={Direction.Up} />
                <div class="flex">
                  <DirectionKey direction={Direction.Left} />
                  <DirectionKey direction={Direction.Down} />
                  <DirectionKey direction={Direction.Right} />
                </div>
              </div>
              <Grid>
                {Array.from({ length: W * H }, (_, i) => (
                  <Cell fill={isPlayer(i)} index={i} />
                ))}
              </Grid>
            </>
          )
        })}
      </section>
    </main>
  )
}
