import { JSX } from 'solid-js'
import { Cell, Grid, PlaygroundContainer, TriggerButton } from './playground'
import * as t from 'src/lib/trig'
import * as s from 'src/lib/signal'
import * as game from 'src/lib/game'

export default function Maze(): JSX.Element {
  const trigger = s.signal(undefined, { equals: false })

  const W = 10
  const H = 6

  const maze = s.memo(s.map(trigger, () => game.generateMaze(W, H)))

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
            borders={{
              [t.Direction.Right]: cell().right && !!maze.value.go(i, t.Direction.Right),
              [t.Direction.Down]: cell().down && !!maze.value.go(i, t.Direction.Down),
            }}
          >
            {i}
          </Cell>
        )}
      </Grid>
      <div class="mt-24">
        <Grid matrix={game.mazeToGrid(maze.get(), 2)}>
          {(cell, i) => <Cell isWall={cell()}>{i}</Cell>}
        </Grid>
      </div>
    </PlaygroundContainer>
  )
}
