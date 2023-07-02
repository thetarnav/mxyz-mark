import { isHydrated } from '@solid-primitives/lifecycle'
import * as solid from 'solid-js'
import { Title } from 'solid-start'
import * as s from 'src/lib/signal'
import * as t from 'src/lib/trigonometry'
import { createDirectionMovement } from './held-direction'
import {
    WINDOW_SIZE,
    isFlooded,
    Game_State,
    Tint,
    updateState,
    expandFlood,
    setAbsolutePlayerPosition,
} from './state'
import { initGameState } from './init'

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
        <main class="center-child h-screen w-screen">
            <div
                style={`
                    width: min(80vw, 50vh);
                `}
            >
                <MatrixGrid matrix={trackGameState().windowed}>
                    {(vec, fovIndex) => (
                        <div
                            class="flex items-center justify-center"
                            style={{
                                'background-color': getTileBgColor(
                                    trackGameState(),
                                    vec(),
                                    fovIndex,
                                ),
                            }}
                        />
                    )}
                </MatrixGrid>
            </div>
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
        </main>
    )
}

export const MatrixGrid = <T,>(props: {
    matrix: t.Matrix<T>
    children: (item: solid.Accessor<T>, index: number) => solid.JSX.Element
}) => {
    const reordered = solid.createMemo(() => {
        const { matrix } = props,
            { width, height } = matrix,
            arr: { index: number; item: T }[] = []
        // display items in reverse y order
        // [1,2,3,4,5,6,7,8,9] | 3 -> [7,8,9,4,5,6,1,2,3]
        for (const i of matrix) {
            const point = matrix.vec(i)
            const reorderedI = (height - 1 - point.y) * width + point.x
            arr.push({ index: reorderedI, item: matrix.get(reorderedI)! })
        }
        return arr
    })

    return (
        <div
            class="wrapper grid"
            style={`
                grid-template-columns: repeat(${props.matrix.width + ''}, 1fr);
                grid-template-rows: repeat(${props.matrix.height + ''}, 1fr);
                aspect-ratio: ${props.matrix.width / props.matrix.height};
            `}
        >
            <solid.Index each={reordered()}>
                {item => props.children(() => item().item, item().index)}
            </solid.Index>
        </div>
    )
}

export default function Home(): solid.JSX.Element {
    return (
        <>
            <Title>mxyz mark solid</Title>
            {isHydrated() && <Game />}
        </>
    )
}
