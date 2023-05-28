import { Index, JSX, createSignal } from 'solid-js'
import {
  Cell,
  DIRECTION_AND_CORNER_POINTS,
  Direction,
  Grid,
  H,
  W,
  XYMatrix,
  randomInt,
  randomIterate,
} from './shared'

export default function Noise(): JSX.Element {
  const [track, trigger] = createSignal(undefined, { equals: false })

  function generateNoise(width: number, height: number) {
    const result = new XYMatrix(width, height, () => ({ fill: false }))

    const stack = Array.from({ length: result.length * 0.05 }, () => randomInt(result.length))

    while (stack.length > 0) {
      const i = stack.pop()!

      result.get(i)!.fill = true

      // Skip spreading on the edges
      if (
        !result.canGo(Direction.Up, i) ||
        !result.canGo(Direction.Right, i) ||
        !result.canGo(Direction.Down, i) ||
        !result.canGo(Direction.Left, i)
      )
        continue

      for (const [dx, dy] of randomIterate(DIRECTION_AND_CORNER_POINTS)) {
        const j = result.goXY(i, dx, dy)

        if (result.get(j)!.fill) continue

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
      <Grid width={W} height={H}>
        <Index each={(track(), generateNoise(W, H).values)}>
          {(cell, i) => <Cell fill={cell().fill} index={i} />}
        </Index>
      </Grid>
    </>
  )
}
