import { JSX } from 'solid-js'
import { Cell, Grid, PlaygroundContainer, TriggerButton } from './playground'
import * as t from 'src/lib/trig'
import * as s from 'src/lib/signal'
import * as game from 'src/lib/game'

export default function Maze(): JSX.Element {
    const trigger = s.signal(undefined, { equals: false })

    const W = 10
    const H = 6

    const ignoredVectors = [
        // bottom left
        t.vector(0, 0),
        t.vector(0, 1),
        t.vector(1, 0),
        t.vector(1, 1),
        // top right
        t.vector(W - 1, H - 1),
        t.vector(W - 1, H - 2),
        t.vector(W - 2, H - 1),
        t.vector(W - 2, H - 2),
    ]

    const maze = s.memo(s.map(trigger, () => game.generateMaze(W, H, ignoredVectors)))

    const walls = s.memo(
        s.map(maze, maze => {
            const walls = game.mazeToGrid(maze, 2)

            // bottom left
            for (let x = 0; x < 5; x++) {
                for (let y = 0; y < 5; y++) {
                    walls.set(t.vector(x, y), false)
                }
            }

            // top right
            for (let x = walls.width - 5; x < walls.width; x++) {
                for (let y = walls.height - 5; y < walls.height; y++) {
                    walls.set(t.vector(x, y), false)
                }
            }

            return walls
        }),
    )

    return (
        <PlaygroundContainer>
            <TriggerButton
                class="mb-8"
                onTrigger={() => s.set(trigger, undefined)}
                text="Regenerate"
                key="R"
            />
            <Grid matrix={maze.value}>
                {(cell, i) => (
                    <Cell
                        borders={([t.Direction.Right, t.Direction.Down] as const).reduce(
                            (rec, dir) => {
                                rec[dir] = cell()[dir] && !!maze.value.go(i, dir)
                                return rec
                            },
                            {} as Record<t.Direction, boolean>,
                        )}
                    >
                        {i}
                    </Cell>
                )}
            </Grid>
            <div class="mt-24">
                <Grid matrix={walls.value}>{(cell, i) => <Cell isWall={cell()}>{i}</Cell>}</Grid>
            </div>
        </PlaygroundContainer>
    )
}
