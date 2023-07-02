import { isHydrated } from '@solid-primitives/lifecycle'
import * as solid from 'solid-js'
import { Title } from 'solid-start'
import * as s from 'src/lib/signal'
import { MatrixGrid } from 'src/lib/state'
import * as t from 'src/lib/trigonometry'
import { createDirectionMovement } from './held-direction'
import {
    SHRINE_RADIUS_TILES,
    GRID_SIZE,
    WINDOW_SIZE,
    updateVisiblePoints,
    isFlooded,
    ALL_SHRINE_CENTERS,
    Game_State,
    initGameState,
    Tint,
} from './state'

// const tileToVec = (tile: t.Vector) => tile.multiply(GRID_SIZE).add(1, 1)

function updateState(game_state: Game_State, player: t.Vector) {
    game_state.player = player

    game_state.windowed = t.windowedMatrix(WINDOW_SIZE, player)

    updateVisiblePoints(game_state)

    game_state.in_shrine = ALL_SHRINE_CENTERS.some(
        center => t.distance(player, center) < SHRINE_RADIUS_TILES * GRID_SIZE,
    )
}

function expandFlood(game_state: Game_State) {
    const { maze: maze_state } = game_state

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
    if (!game_state.maze.inBounds(vec)) {
        throw new Error('out of bounds')
    }
    updateState(game_state, vec)
    s.trigger(game_state.turn_signal)
}

export enum Tile_Display_As {
    Invisible,
    Floor,
    Wall,
    Player,
    Start,
    Finish,
    Minimap_Finish,
    Flood_Shallow,
    Flood_Deep,
    Flood_Gradient,
}

const getTileDisplayAs = (
    game_state: Game_State,
    vec: t.Vector,
    fov_idx: number,
): Tile_Display_As => {
    if (game_state.in_shrine) {
        const fov_vec = t.Matrix.vec(WINDOW_SIZE, fov_idx)
        if (fov_vec.equals(game_state.minimap_finish)) {
            return Tile_Display_As.Minimap_Finish
        }
    }

    const { maze } = game_state,
        vec_state = maze.get(vec)

    if (vec_state && game_state.visible.get(maze.idx(vec))) {
        if (game_state.player.equals(vec)) {
            return Tile_Display_As.Player
        }
        if (vec_state.wall) {
            return Tile_Display_As.Wall
        }
        if (vec_state.flooded) {
            return Tile_Display_As.Flood_Deep
        }
        if (game_state.shallow_flood.has(vec.toString())) {
            for (const neighbor of t.eachPointDirection(vec, maze)) {
                if (isFlooded(maze, neighbor)) {
                    return Tile_Display_As.Flood_Gradient
                }
            }
            return Tile_Display_As.Flood_Shallow
        }
        if (vec.equals(game_state.start)) {
            return Tile_Display_As.Start
        }
        if (vec.equals(game_state.finish)) {
            return Tile_Display_As.Finish
        }
        return Tile_Display_As.Floor
    }

    return Tile_Display_As.Invisible
}

export const DISPLAY_TILE_TO_COLOR: Record<Tile_Display_As, string> = {
    [Tile_Display_As.Invisible]: 'transparent',
    [Tile_Display_As.Floor]: '#AE9E8A',
    [Tile_Display_As.Wall]: '#AE9E8A',
    [Tile_Display_As.Player]: '#FFF',
    [Tile_Display_As.Start]: '#7D8C63',
    [Tile_Display_As.Finish]: '#9E7900',
    [Tile_Display_As.Minimap_Finish]: '#F7B544',
    [Tile_Display_As.Flood_Shallow]: '#F59A50',
    [Tile_Display_As.Flood_Gradient]: '#FF7D2B',
    [Tile_Display_As.Flood_Deep]: '#F15927',
}

const getDisplayAsOpacity = (tile: Tile_Display_As, tint: Tint): number => {
    switch (tile) {
        case Tile_Display_As.Floor:
            return 0.2 + 0.04 * tint
        case Tile_Display_As.Wall:
        case Tile_Display_As.Flood_Shallow:
        case Tile_Display_As.Flood_Deep:
        case Tile_Display_As.Flood_Gradient:
        case Tile_Display_As.Finish:
            return 0.7 + 0.05 * tint
        case Tile_Display_As.Player:
        case Tile_Display_As.Start:
        case Tile_Display_As.Minimap_Finish:
            return 1
        case Tile_Display_As.Invisible:
            return 0
    }
}

const getTileBgColor = (game_state: Game_State, vec: t.Vector, fov_idx: number): string => {
    const display_as = getTileDisplayAs(game_state, vec, fov_idx),
        color = DISPLAY_TILE_TO_COLOR[display_as],
        vec_state = game_state.maze.get(vec),
        tint = vec_state ? vec_state.tint : 0,
        opacity = getDisplayAsOpacity(display_as, tint),
        p = Math.round(opacity * 100)
    return `color-mix(in lch, ${color} ${p}%, transparent)`
}

const Game = () => {
    const game_state = initGameState()

    /**
     * Game state is not a reactive proxy, so we need to track it manually
     */
    const trackGameState = () => {
        game_state.turn_signal.get()
        return game_state
    }

    updateState(game_state, game_state.player)

    createDirectionMovement(direction => {
        /*
            move player in direction if possible
        */
        const vec = game_state.player.go(direction)
        const vec_state = game_state.maze.get(vec)

        if (!game_state.noclip && (!vec_state || vec_state.wall || vec_state.flooded)) return

        updateState(game_state, vec)
        expandFlood(game_state)
        s.trigger(game_state.turn_signal)
    })

    return (
        <>
            <MatrixGrid matrix={trackGameState().windowed}>
                {(vec, fovIndex) => (
                    <div
                        class="flex items-center justify-center"
                        style={{
                            'background-color': getTileBgColor(trackGameState(), vec(), fovIndex),
                        }}
                    />
                )}
            </MatrixGrid>
            <div class="fixed right-12 top-12 flex flex-col space-y-2">
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
                        game_state.noclip = !game_state.noclip
                        s.trigger(game_state.turn_signal)
                    }}
                >
                    {trackGameState().noclip ? 'disable' : 'enable'} noclip
                </button>
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
