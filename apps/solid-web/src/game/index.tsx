import { isHydrated } from '@solid-primitives/lifecycle'
import clsx from 'clsx'
import * as solid from 'solid-js'
import { A, Title } from 'solid-start'
import * as s from 'src/lib/signal'
import { MatrixGrid } from 'src/lib/state'
import * as t from 'src/lib/trig'
import { createDirectionMovement } from './held-direction'
import {
    CORNER_SHRINE_CENTERS,
    generateInitMazeState,
    findWallSegments,
    CENTER,
    SHRINE_RADIUS_TILES,
    GRID_SIZE,
    WINDOW_SIZE,
    findVisiblePoints,
    BOARD_SIZE,
    isFlooded,
    ALL_SHRINE_CENTERS,
} from './state'

// const tileToVec = (tile: t.Vector) => tile.multiply(GRID_SIZE).add(1, 1)

const vecToMinimap = (vec: t.Vector) =>
    vec.map(xy => Math.round(t.mapRange(xy, 0, BOARD_SIZE - 1, 0, WINDOW_SIZE - 1)))

const Game = () => {
    const reactive = s.signal({
        /*
            place player in center of a random corner quadrant
        */
        player: CENTER,
        turn: 0,
        shallow_flood: new Set<t.VecString>(),
        windowed: null as any as t.Matrix<t.Vector>,
        visible: new Set<t.VecString>(),
        in_shrine: false,
    })
    let finish: t.Vector

    {
        const startingQuadrand = t.randomInt(4) as t.Quadrand
        const finishQuadrand = ((startingQuadrand + 2) % 4) as t.Quadrand // opposite of start
        const floodStartQuadrand = t.remainder(
            startingQuadrand + (Math.random() > 0.5 ? 1 : -1), // corner shrine adjacent to start
            4,
        ) as t.Quadrand

        const player = CORNER_SHRINE_CENTERS[startingQuadrand]
        finish = CORNER_SHRINE_CENTERS[finishQuadrand]
        const floodStart = CORNER_SHRINE_CENTERS[floodStartQuadrand]

        reactive.value.player = player
        reactive.value.shallow_flood.add(floodStart.toString())
    }

    const maze_state = generateInitMazeState()
    const wall_segments = findWallSegments(maze_state)

    if (import.meta.env.DEV) {
        ;(window as any).$tp = (x: unknown, y: unknown) => {
            if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
                throw new Error('invalid input')
            }
            const vec = t.vector(x, y)
            if (!maze_state.inBounds(vec)) {
                throw new Error('out of bounds')
            }
            s.mutate(reactive, state => {
                state.player = vec
            })
        }
    }

    function updateState(player: t.Vector) {
        const state = reactive.value

        state.player = player
        state.turn++

        state.windowed = t.windowedMatrix(WINDOW_SIZE, player)

        state.visible = findVisiblePoints(maze_state, wall_segments, state.windowed, player)

        state.in_shrine = ALL_SHRINE_CENTERS.some(
            center => t.distance(player, center) < SHRINE_RADIUS_TILES * GRID_SIZE,
        )

        expand_flood: {
            // const expand_times = Math.ceil((set.deep.size + 1) / ((N_TILES * N_TILES) / 2))
            const expand_times = 1 // TODO: increase as game progresses

            for (let i = 0; i < expand_times; i++) {
                for (const pos_str of t.randomIterate([...state.shallow_flood])) {
                    for (const neighbor of t.eachPointDirection(
                        t.Vector.fromStr(pos_str),
                        maze_state,
                    )) {
                        const neighbor_state = maze_state.get(neighbor)
                        if (!neighbor_state) continue

                        const neighbor_str = neighbor.toString()
                        if (
                            neighbor_state.wall ||
                            neighbor_state.flooded ||
                            state.shallow_flood.has(neighbor_str)
                        )
                            continue

                        state.shallow_flood.add(neighbor_str)
                        break expand_flood
                    }

                    state.shallow_flood.delete(pos_str)
                    maze_state.get(t.Vector.fromStr(pos_str))!.flooded = true
                }
            }
        }
    }

    updateState(reactive.value.player)

    createDirectionMovement(direction => {
        /*
            move player in direction if possible
        */
        const vec = reactive.value.player.go(direction)
        const vec_state = maze_state.get(vec)

        if (!vec_state || vec_state.wall || vec_state.flooded) return

        updateState(vec)
        s.trigger(reactive)
    })

    const minimapFinish = vecToMinimap(finish)

    const getTileClass = (vec: t.Vector, fovIndex: number): string => {
        const state = reactive.value

        if (state.in_shrine) {
            const fovPoint = t.Matrix.vec(WINDOW_SIZE, fovIndex)
            if (vecToMinimap(state.player).equals(fovPoint)) return 'bg-primary'
            if (fovPoint.equals(minimapFinish)) return 'bg-amber'
        }

        const vec_str = vec.toString()
        const vec_state = maze_state.get(vec)

        if (vec_state && state.visible.has(vec_str)) {
            if (state.player.equals(vec)) return 'bg-white'
            if (vec_state.flooded) return 'bg-red-5'
            if (state.shallow_flood.has(vec_str)) {
                for (const neighbor of t.eachPointDirection(vec, maze_state)) {
                    if (isFlooded(maze_state, neighbor)) return 'bg-orange-5'
                }
                return 'bg-orange'
            }
            return 'bg-stone-7'
        }

        return 'bg-transparent'
    }

    return (
        <>
            <MatrixGrid matrix={reactive.value.windowed}>
                {(vec, fovIndex) => (
                    <div
                        class={clsx(
                            'flex items-center justify-center',
                            getTileClass(vec(), fovIndex),
                        )}
                    />
                )}
            </MatrixGrid>
            <div class="fixed right-12 top-12">
                <p>{reactive.value.player + ''}</p>
            </div>
        </>
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
                    <A
                        href="/playground"
                        class="underline-dashed hover:underline"
                        activeClass="text-primary"
                    >
                        /playground
                    </A>
                </div>
            </nav>
            <main class="flex flex-col items-center gap-24 py-24">{isHydrated() && <Game />}</main>
        </>
    )
}
