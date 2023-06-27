import { JSX, createSignal } from 'solid-js'
import { Cell, Grid, PlaygroundContainer, TriggerButton } from './playground'
import {
    Matrix,
    randomInt,
    Direction,
    randomIterate,
    DIRECTION_AND_CORNER_POINTS,
} from '../../lib/trigonometry'

export default function Noise(): JSX.Element {
    const [track, trigger] = createSignal(undefined, { equals: false })

    function generateNoise(width: number, height: number) {
        const result = new Matrix(width, height, () => false)

        const stack = Array.from({ length: result.length * 0.05 }, () => randomInt(result.length))

        while (stack.length > 0) {
            const i = stack.pop()!

            result.set(i, true)

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

                if (result.get(j)) continue

                stack.push(j)
                break
            }
        }

        return result
    }

    const W = 20
    const H = 10

    return (
        <PlaygroundContainer>
            <TriggerButton class="mb-8" onTrigger={() => trigger()} key="R" text="Regenerate" />
            <Grid matrix={(track(), generateNoise(W, H))}>
                {(cell, i) => <Cell isPlayer={cell()}>{i}</Cell>}
            </Grid>
        </PlaygroundContainer>
    )
}
