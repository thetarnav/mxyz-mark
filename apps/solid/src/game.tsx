import { solid, ease, s, trig, math } from 'src/lib'
import { createDirectionMovement } from './held-direction'
import { COLORS, Game_State, Tint, WINDOW_RADIUS, WINDOW_SIZE, initGameState } from './init'
import { getWelcomeMessage } from './messages'
import { expandFlood, setAbsolutePlayerPosition, updateState } from './state'

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
}

export const DISPLAY_TILE_TO_COLOR: Record<Tile_Display_As, string> = {
    [Tile_Display_As.Invisible]: 'transparent',
    [Tile_Display_As.Floor]: COLORS.floor,
    [Tile_Display_As.Wall]: COLORS.wall,
    [Tile_Display_As.Player]: COLORS.bone,
    [Tile_Display_As.Start]: COLORS.start,
    [Tile_Display_As.Finish]: COLORS.finish,
    [Tile_Display_As.Minimap_Finish]: COLORS.finish,
    [Tile_Display_As.Flood_Shallow]: COLORS.flood_shallow,
    [Tile_Display_As.Flood_Deep]: COLORS.flood_deep,
}

export const getDisplayAsOpacity = (tile: Tile_Display_As, tint: Tint): number => {
    switch (tile) {
        case Tile_Display_As.Floor:
            return 0.2 + 0.04 * tint
        case Tile_Display_As.Wall:
        case Tile_Display_As.Flood_Shallow:
        case Tile_Display_As.Flood_Deep:
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

const getTileDisplayAs = (
    game_state: Game_State,
    vec: trig.Vector,
    fov_idx: number,
): Tile_Display_As => {
    if (game_state.in_shrine) {
        const fov_vec = trig.Matrix.vec(WINDOW_SIZE, fov_idx)
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

const getTileBgColor = (game_state: Game_State, vec: trig.Vector, fov_idx: number): string => {
    const display_as = getTileDisplayAs(game_state, vec, fov_idx),
        color = DISPLAY_TILE_TO_COLOR[display_as],
        vec_state = game_state.maze.get(vec),
        tint = vec_state ? vec_state.tint : 0,
        d = trig.distance(vec, game_state.player),
        easing = ease.inOutSine(math.clamp(1 - d / (WINDOW_RADIUS + 1), 0, 1)),
        opacity = getDisplayAsOpacity(display_as, tint),
        p = Math.round(opacity * 100)

    if (game_state.dev.hide_easing || display_as === Tile_Display_As.Minimap_Finish)
        return `color-mix(in hsl, ${color} ${p}%, transparent)`

    return `color-mix(in hsl, ${color} calc(${p}% * (${easing} -  (1 - ${easing}) * var(${FLICKER_VAR}))), transparent)`
}

const FLICKER_TICK_AMOUNT = 0.018
const FLICKER_TICK_MS = 16
const FLICKER_MIN = -0.05
const FLICKER_MAX = 0.36
const FLICKER_VAR = '--flicker'

export const Game = () => {
    const game_state = initGameState(math.randomInt(4) as trig.Quadrand, 0)

    /**
     * Game state is not a reactive proxy, so we need to track it manually
     */
    const game_state_sig = s.reactive(() => {
        game_state.turn_signal.get()
        return game_state
    })

    updateState(game_state, game_state.player)

    createDirectionMovement(direction => {
        /*
            move player in direction if possible
        */
        const vec = game_state.player.go(direction)
        const vec_state = game_state.maze.get(vec)

        if (!game_state.dev.noclip && (!vec_state || vec_state.wall || vec_state.flooded)) return

        updateState(game_state, vec)
        expandFlood(game_state)
        s.trigger(game_state.turn_signal)
    })

    const show_menu = s.memo(
        s.map(
            game_state_sig,
            ({ player, start, finish }) => player.equals(start) || player.equals(finish),
        ),
    )

    let container!: HTMLDivElement
    let flicker_mod = 0
    let last_time = Date.now()
    const frame = () => {
        const now = Date.now()
        const prev = flicker_mod
        let tick = Math.random() * FLICKER_TICK_AMOUNT * 2 - FLICKER_TICK_AMOUNT
        tick *= Math.min(1, (now - last_time) / FLICKER_TICK_MS)
        last_time = now
        flicker_mod = math.bounce(flicker_mod + tick, FLICKER_MIN, FLICKER_MAX)
        if (Math.abs(flicker_mod - prev) > 0.01) {
            container.style.setProperty(FLICKER_VAR, flicker_mod + '')
        }
        raf = requestAnimationFrame(frame)
    }
    let raf = requestAnimationFrame(frame)
    solid.onCleanup(() => cancelAnimationFrame(raf))

    return (
        <>
            <main class="center-child h-screen w-screen">
                <div
                    ref={container}
                    class="grid delay-200"
                    style={{
                        '--width': 'min(85vw, 52rem)',
                        '--gap': '3rem',
                        'grid-gap': 'var(--gap)',
                        width: 'var(--width)',
                        'grid-template': '1fr / 1fr 1fr',
                        translate: show_menu.value
                            ? ''
                            : 'calc(-0.25 * var(--width) - var(--gap) / 2) 0 0.001px',
                        transition: 'translate 0.6s ease-in-out',
                    }}
                >
                    <div
                        class="center-child transition-600 delay-200"
                        style={{ opacity: show_menu.value ? 1 : 0 }}
                    >
                        {(() => {
                            const welcome = getWelcomeMessage()
                            const DirectionKey = (props: { direction: trig.Direction }) => (
                                <div class="flex h-6 w-6 items-center justify-center border-2 border-wall">
                                    {props.direction}
                                </div>
                            )
                            return (
                                <div>
                                    <p>{welcome.greeting}</p>
                                    <p class="mt-3">{welcome.explanation}</p>
                                    <div class="mt-6 flex w-max flex-col items-center gap-1">
                                        <DirectionKey direction={trig.Direction.Up} />
                                        <div class="flex gap-1">
                                            <DirectionKey direction={trig.Direction.Left} />
                                            <DirectionKey direction={trig.Direction.Down} />
                                            <DirectionKey direction={trig.Direction.Right} />
                                        </div>
                                    </div>
                                    <p class="mt-6">{welcome.farewell}</p>
                                </div>
                            )
                        })()}
                    </div>
                    <div class="center-child">
                        <div class="w-full">
                            <MatrixGrid matrix={game_state_sig.value.window}>
                                {(vec, fovIndex) => (
                                    <div
                                        class="flex items-center justify-center"
                                        style={{
                                            'background-color': getTileBgColor(
                                                game_state_sig.value,
                                                vec(),
                                                fovIndex,
                                            ),
                                        }}
                                    />
                                )}
                            </MatrixGrid>
                        </div>
                    </div>
                </div>
            </main>
            {import.meta.env.DEV && <DevTools state={game_state_sig.value} />}
        </>
    )
}

const DevTools = (props: { state: Game_State }) => {
    let input1!: HTMLInputElement
    let input2!: HTMLInputElement

    const ToggleSetting = (btn_props: { setting: keyof Game_State['dev'] }) => {
        const get = () => props.state.dev[btn_props.setting]
        return (
            <button
                onClick={() => {
                    props.state.dev[btn_props.setting] = !get()
                    updateState(props.state, props.state.player)
                    s.trigger(props.state.turn_signal)
                }}
            >
                {btn_props.setting} {get() ? 'on' : 'off'}
            </button>
        )
    }

    return (
        <div class="fixed right-6 top-6 flex flex-col space-y-2">
            <form
                onSubmit={e => {
                    e.preventDefault()
                    const x = input1.valueAsNumber
                    const y = input2.valueAsNumber
                    setAbsolutePlayerPosition(props.state, x, y)
                }}
                class="space-x-1"
                onKeyDown={e => {
                    if (e.key !== 'Enter') e.stopPropagation()
                }}
            >
                <input ref={input1} value={props.state.player.x} class="w-12" type="number" />
                <input ref={input2} value={props.state.player.y} class="w-12" type="number" />
                <button class="hidden" />
            </form>
            <p>turn: {props.state.turn}</p>
            <ToggleSetting setting="show_invisible" />
            <ToggleSetting setting="hide_easing" />
            <ToggleSetting setting="noclip" />
        </div>
    )
}

export const MatrixGrid = <T,>(props: {
    matrix: trig.Matrix<T>
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
