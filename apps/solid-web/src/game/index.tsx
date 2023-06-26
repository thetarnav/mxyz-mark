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
} from './state'

const Game = () => {
    // const tileToVec = (tile: t.Vector) => tile.multiply(GRID_SIZE).add(1, 1)

    const startingQuadrand = t.randomInt(4) as t.Quadrand
    const playerVec = s.signal(
        /*
        place player in center of a random corner quadrant
        */
        CORNER_SHRINE_CENTERS[startingQuadrand],
        // CENTER.add(1, 1),
        { equals: t.vec_equals },
    )

    const finishQuadrand = ((startingQuadrand + 2) % 4) as t.Quadrand // opposite of start
    const finishVec = CORNER_SHRINE_CENTERS[finishQuadrand]

    const maze_state = generateInitMazeState()

    // const wallMatrix = new t.Matrix(WALLS_W * GRID_SIZE - 1, WALLS_H * GRID_SIZE - 1, () => false)
    const wallSegments = findWallSegments(maze_state)

    if (import.meta.env.DEV) {
        ;(window as any).$tp = (x: unknown, y: unknown) => {
            if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
                throw new Error('invalid input')
            }
            if (!maze_state.inBounds({ x, y })) {
                throw new Error('out of bounds')
            }
            s.set(playerVec, t.vector(x, y))
        }
    }

    const shallowFlood = s.signal(new Set<t.VecString>())
    {
        const floodStartQuadrand = t.remainder(
            startingQuadrand + (Math.random() > 0.5 ? 1 : -1), // corner shrine adjacent to start
            4,
        ) as t.Quadrand
        const floodStart = CORNER_SHRINE_CENTERS[floodStartQuadrand]
        shallowFlood.value.add(floodStart.toString())
    }

    createDirectionMovement(direction => {
        /*
            move player in direction if possible
        */
        const vec = playerVec.value.go(direction)
        const vec_state = maze_state.get(vec)

        if (!vec_state || vec_state.wall || vec_state.flooded) return

        s.set(playerVec, vec)

        /*
            expand flood set
        */
        s.mutate(shallowFlood, set => {
            // const expand_times = Math.ceil((set.deep.size + 1) / ((N_TILES * N_TILES) / 2))
            const expand_times = 1 // TODO: increase as game progresses

            for (let i = 0; i < expand_times; i++) {
                for (const pos_str of t.randomIterate([...set])) {
                    for (const neighbor of t.eachPointDirection(
                        t.Vector.fromStr(pos_str),
                        maze_state,
                    )) {
                        const neighbor_state = maze_state.get(neighbor)
                        if (!neighbor_state) continue

                        const neighbor_str = neighbor.toString()
                        if (neighbor_state.wall || neighbor_state.flooded || set.has(neighbor_str))
                            continue

                        set.add(neighbor_str)
                        return
                    }

                    set.delete(pos_str)
                    maze_state.get(t.Vector.fromStr(pos_str))!.flooded = true
                }
            }
        })
    })

    const allShrineCenters = [CENTER, ...Object.values(CORNER_SHRINE_CENTERS)]
    const isPlayerInShrine = s.memo(
        s.map(playerVec, player =>
            allShrineCenters.some(
                center => t.distance(player, center) < SHRINE_RADIUS_TILES * GRID_SIZE,
            ),
        ),
    )

    const windowed = s.memo(s.map(playerVec, player => t.windowedMatrix(WINDOW_SIZE, player)))

    const visible = s.memo(
        s.map(s.join([playerVec, windowed]), ([player, windowed]) =>
            findVisiblePoints(maze_state, wallSegments, windowed, player),
        ),
    )

    const vecToMinimap = (vec: t.Vector) =>
        vec.map(xy => Math.round(t.mapRange(xy, 0, BOARD_SIZE - 1, 0, WINDOW_SIZE - 1)))

    const minimapPlayer = s.memo(s.map(playerVec, vecToMinimap))
    const minimapFinish = vecToMinimap(finishVec)

    const getTileClass = (vec: t.Vector, fovIndex: number): string => {
        if (isPlayerInShrine.value) {
            const fovPoint = t.Matrix.vec(WINDOW_SIZE, fovIndex)
            if (minimapPlayer.value.equals(fovPoint)) return 'bg-primary'
            if (fovPoint.equals(minimapFinish)) return 'bg-amber'
        }

        const vec_str = vec.toString()
        const vec_state = maze_state.get(vec)

        if (vec_state && visible.value.has(vec_str)) {
            if (playerVec.value.equals(vec)) return 'bg-white'
            if (vec_state.flooded) return 'bg-red-5'
            if (shallowFlood.value.has(vec_str)) {
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
            <MatrixGrid matrix={windowed.value}>
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
                <p>{playerVec.value + ''}</p>
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
