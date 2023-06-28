import { isHydrated } from '@solid-primitives/lifecycle'
import clsx from 'clsx'
import * as solid from 'solid-js'
import { Title } from 'solid-start'
import * as s from 'src/lib/signal'
import { MatrixGrid } from 'src/lib/state'
import * as t from 'src/lib/trigonometry'
import { createDirectionMovement } from './held-direction'
import {
    corner_shrine_centers,
    generateInitMazeState,
    findWallSegments,
    maze_center,
    SHRINE_RADIUS_TILES,
    GRID_SIZE,
    WINDOW_SIZE,
    updateVisiblePoints,
    BOARD_SIZE,
    isFlooded,
    ALL_SHRINE_CENTERS,
    Game_State,
} from './state'

// const tileToVec = (tile: t.Vector) => tile.multiply(GRID_SIZE).add(1, 1)

const vecToMinimap = (vec: t.Vector) =>
    vec.map(xy => Math.round(t.mapRange(xy, 0, BOARD_SIZE - 1, 0, WINDOW_SIZE - 1)))

function updateState(game_state: Game_State, player: t.Vector) {
    game_state.player = player

    game_state.windowed = t.windowedMatrix(WINDOW_SIZE, player)

    updateVisiblePoints(game_state)

    game_state.in_shrine = ALL_SHRINE_CENTERS.some(
        center => t.distance(player, center) < SHRINE_RADIUS_TILES * GRID_SIZE,
    )
}

function expandFlood(game_state: Game_State) {
    const { maze_state } = game_state

    game_state.turn++
    game_state.progress_to_flood_update += game_state.turn / 1000
    const expand_times = Math.floor(game_state.progress_to_flood_update)
    game_state.progress_to_flood_update -= expand_times

    for (let i = 0; i < expand_times; i++) {
        for (const pos_str of t.randomIterate([...game_state.shallow_flood])) {
            for (const neighbor of t.eachPointDirection(t.Vector.fromStr(pos_str), maze_state)) {
                const neighbor_state = maze_state.get(neighbor)
                if (!neighbor_state) continue

                const neighbor_str = neighbor.toString()
                if (
                    neighbor_state.wall ||
                    neighbor_state.flooded ||
                    game_state.shallow_flood.has(neighbor_str)
                )
                    continue

                game_state.shallow_flood.add(neighbor_str)
                return
            }

            game_state.shallow_flood.delete(pos_str)
            maze_state.get(t.Vector.fromStr(pos_str))!.flooded = true
        }
    }
}

function setAbsolutePlayerPosition(game_state: Game_State, x: unknown, y: unknown) {
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
        throw new Error('invalid input')
    }
    const vec = t.vector(x, y)
    if (!game_state.maze_state.inBounds(vec)) {
        throw new Error('out of bounds')
    }
    updateState(game_state, vec)
    s.trigger(game_state.turn_signal)
}

const Game = () => {
    const game_state: Game_State = {
        /*
            place player in center of a random corner quadrant
        */
        player: maze_center,
        finish: null!,
        maze_state: null!,
        wall_segments: null!,
        turn: 0,
        progress_to_flood_update: 0,
        shallow_flood: new Set(),
        windowed: null!,
        visible: new Map(),
        in_shrine: false,
        turn_signal: s.signal(),
        show_invisible: false,
    }

    /*
        Init game state
    */
    {
        const starting_q = t.randomInt(4)
        const finish_q = (starting_q + 2) % 4 // opposite of start
        const flood_start_q = // corner shrine adjacent to start
            t.remainder(starting_q + (Math.random() > 0.5 ? 1 : -1), 4)

        game_state.player = corner_shrine_centers[starting_q as t.Quadrand]
        game_state.finish = corner_shrine_centers[finish_q as t.Quadrand]
        game_state.shallow_flood.add(corner_shrine_centers[flood_start_q as t.Quadrand].toString())

        game_state.maze_state = generateInitMazeState()
        game_state.wall_segments = findWallSegments(game_state.maze_state)
    }

    const trackGameState = () => {
        game_state.turn_signal.get()
        return game_state
    }

    if (import.meta.env.DEV) {
        ;(window as any).$tp = (x: unknown, y: unknown) => {
            setAbsolutePlayerPosition(game_state, x, y)
        }
    }

    updateState(game_state, game_state.player)

    createDirectionMovement(direction => {
        /*
            move player in direction if possible
        */
        const vec = game_state.player.go(direction)
        const vec_state = game_state.maze_state.get(vec)

        if (!vec_state || vec_state.wall || vec_state.flooded) return

        updateState(game_state, vec)
        expandFlood(game_state)
        s.trigger(game_state.turn_signal)
    })

    const minimap_finish = vecToMinimap(game_state.finish)

    const getTileClass = (vec: t.Vector, fov_idx: number): string => {
        const game_state = trackGameState()
        const { maze_state } = game_state

        if (game_state.in_shrine) {
            const fov_vec = t.Matrix.vec(WINDOW_SIZE, fov_idx)
            if (vecToMinimap(game_state.player).equals(fov_vec)) return 'bg-primary'
            if (fov_vec.equals(minimap_finish)) return 'bg-amber'
        }

        const vec_state = maze_state.get(vec)

        if (vec_state && game_state.visible.get(maze_state.i(vec))) {
            if (game_state.player.equals(vec)) return 'bg-white'
            if (vec_state.flooded) return 'bg-red-5'
            if (game_state.shallow_flood.has(vec.toString())) {
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
            <MatrixGrid matrix={trackGameState().windowed}>
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
                {solid.untrack(() => {
                    let input1!: HTMLInputElement
                    let input2!: HTMLInputElement
                    return (
                        <form
                            onSubmit={e => {
                                e.preventDefault()
                                const x = input1.valueAsNumber
                                const y = input2.valueAsNumber
                                setAbsolutePlayerPosition(game_state, x, y)
                            }}
                            class="space-x-2"
                            onKeyDown={e => {
                                if (e.key !== 'Enter') e.stopPropagation()
                            }}
                        >
                            <input
                                ref={input1}
                                value={trackGameState().player.x}
                                class="w-12"
                                type="number"
                            />
                            <input
                                ref={input2}
                                value={trackGameState().player.y}
                                class="w-12"
                                type="number"
                            />
                            <button class="hidden" />
                        </form>
                    )
                })}
                <p>turn: {trackGameState().turn}</p>
                <button
                    onClick={() => {
                        game_state.show_invisible = !game_state.show_invisible
                        updateState(game_state, game_state.player)
                        s.trigger(game_state.turn_signal)
                    }}
                >
                    {trackGameState().show_invisible ? 'hide' : 'show'} invisible
                </button>
            </div>
        </>
    )
}

export default function Home(): solid.JSX.Element {
    return (
        <>
            <Title>mxyz mark solid</Title>
            {/* <nav class="z-999 absolute left-4 top-4 flex flex-col">
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
            </nav> */}
            <main class="flex flex-col items-center gap-24 py-24">{isHydrated() && <Game />}</main>
        </>
    )
}
