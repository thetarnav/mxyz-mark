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
        !result.go(i, Direction.Up) ||
        !result.go(i, Direction.Right) ||
        !result.go(i, Direction.Down) ||
        !result.go(i, Direction.Left)
      )
        continue

      for (const d of randomIterate(DIRECTION_AND_CORNER_POINTS)) {
        const j = result.i(result.go(i, d)!)

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