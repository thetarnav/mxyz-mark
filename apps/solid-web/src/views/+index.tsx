import { A, Title } from 'solid-start'
import * as solid from 'solid-js'
import * as t from 'src/lib/trig'
import * as s from 'src/lib/signal'
import * as game from 'src/lib/game'
import { css } from 'solid-styled'
import { Index } from 'solid-js'
import clsx from 'clsx'
import { isHydrated } from '@solid-primitives/lifecycle'

const Board = () => {
  const WALLS_W = 48
  const WALLS_H = 48
  const TILE_SIZE = 3

  const wallMatrix = game.mazeToGrid(game.generateMaze(WALLS_W, WALLS_H), TILE_SIZE)

  const wallSegments = t.findWallSegments(wallMatrix)

  const playerPosition = s.signal(t.randomInt(wallMatrix.length))
  const isPlayer = s.selector(playerPosition)

  const playerPoint = s.memo(s.map(playerPosition, position => wallMatrix.point(position)))

  const WINDOW_W = 19
  const WINDOW_H = 13

  const board = s.memo(
    s.map(playerPoint, player => game.getWindowedMaze(WINDOW_W, WINDOW_H, player, wallMatrix)),
  )

  const reordered = s.memo(
    s.map(board, board => {
      const { width, height } = board,
        arr: {
          index: number
          item: {
            isPlayer: boolean
            isWall: boolean
          }
        }[] = []
      // display items in reverse y order
      // [1,2,3,4,5,6,7,8,9] | 3 -> [7,8,9,4,5,6,1,2,3]
      for (const i of board) {
        const point = board.point(i)
        const reorderedI = (height - 1 - point.y) * width + point.x
        arr.push({ index: reorderedI, item: board.get(reorderedI)! })
      }
      return arr
    }),
  )

  css`
    .wrapper {
      grid-template-columns: repeat(${WINDOW_W + ''}, 2rem);
      grid-template-rows: repeat(${WINDOW_H + ''}, 2rem);
    }
  `

  console.log(wallMatrix)

  return (
    <div class="wrapper relative grid">
      <Index each={reordered.value}>
        {item => (
          <div
            class={clsx(
              'flex items-center justify-center',
              item().item.isPlayer
                ? 'bg-primary text-dark'
                : item().item.isWall
                ? 'text-dark bg-gray-4'
                : 'text-gray-4 bg-transparent',
            )}
          >
            {item().index}
          </div>
        )}
      </Index>
    </div>
  )
}

export default function Home(): solid.JSX.Element {
  return (
    <>
      <Title>mxyz mark solid</Title>
      <nav class="z-999 absolute left-4 top-4 flex flex-col">
        <div>
          <A
            href="/"
            class="underline-dashed font-semibold hover:underline"
            activeClass="text-primary"
          >
            mxyz mark solid
          </A>
        </div>
        <div>
          <A href="/playground" class="underline-dashed hover:underline" activeClass="text-primary">
            /playground
          </A>
        </div>
      </nav>
      <main class="flex flex-col items-center gap-24 py-24">{isHydrated() && <Board />}</main>
    </>
  )
}
