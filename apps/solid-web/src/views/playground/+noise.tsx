import { Index, JSX, createSignal } from 'solid-js'
import {
  Cell,
  DIRECTION_AND_CORNER_POINTS,
  Grid,
  H,
  W,
  getXY,
  randomInt,
  randomIterate,
} from './shared'

export default function Noise(): JSX.Element {
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
}
