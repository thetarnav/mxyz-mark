import { solid, ease, s, trig, math } from 'src/lib'
import { createDirectionMovement } from './held_direction'
import {
    COLORS,
    GameState,
    Tint,
    WINDOW_MATRIX,
    WINDOW_RADIUS,
    WINDOW_SIZE,
    resetFloor,
    setUnknownPlayerPosition,
} from './state'
import { movePlayerInDirection, updateState } from './state'
import { createEventListenerMap } from '@solid-primitives/event-listener'
import { MenuMessages, MenuMessagesNextFloor, MenuMessagesWelcome } from './messages'

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

export function getDisplayAsOpacity(tile: Tile_Display_As, tint: Tint): number {
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

function getTileDisplayAs(
    game_state: GameState,
    vec: trig.Vector,
    fov_idx: number,
): Tile_Display_As {
    if (game_state.in_shrine) {
        const fov_vec = trig.Matrix.vec(WINDOW_SIZE, fov_idx)
        if (fov_vec.equals(game_state.pos.minimap_finish)) {
            return Tile_Display_As.Minimap_Finish
        }
    }

    const { maze } = game_state,
        vec_state = maze.get(vec)

    if (vec_state && game_state.visible.get(maze.idx(vec))) {
        if (game_state.pos.player.equals(vec)) {
            return Tile_Display_As.Player
        }
        if (vec_state.wall) {
            return Tile_Display_As.Wall
        }
        if (vec_state.flooded) {
            return Tile_Display_As.Flood_Deep
        }
        if (game_state.pos.shallow_flood.has(vec.toString())) {
            return Tile_Display_As.Flood_Shallow
        }
        if (vec.equals(game_state.pos.start)) {
            return Tile_Display_As.Start
        }
        if (vec.equals(game_state.pos.finish)) {
            return Tile_Display_As.Finish
        }
        return Tile_Display_As.Floor
    }

    return Tile_Display_As.Invisible
}

function getTileBgColor(game_state: GameState, fov_vec: trig.Vector, fov_idx: number): string {
    const { pos, maze, dev } = game_state,
        vec = pos.player.add(fov_vec),
        display_as = getTileDisplayAs(game_state, vec, fov_idx),
        color = DISPLAY_TILE_TO_COLOR[display_as],
        vec_state = maze.get(vec),
        tint = vec_state ? vec_state.tint : 0,
        d = trig.distance(vec, pos.player),
        easing = ease.inOutSine(math.clamp(1 - d / (WINDOW_RADIUS + 1), 0, 1)),
        opacity = getDisplayAsOpacity(display_as, tint),
        p = Math.round(opacity * 100)

    if (dev.hide_easing || display_as === Tile_Display_As.Minimap_Finish)
        return `color-mix(in hsl, ${color} ${p}%, transparent)`

    return `color-mix(in hsl, ${color} calc(${p}% * (${easing} -  (1 - ${easing}) * var(${FLICKER_VAR}))), transparent)`
}

const FLICKER_TICK_AMOUNT = 0.018
const FLICKER_TICK_MS = 16
const FLICKER_MIN = -0.05
const FLICKER_MAX = 0.36
const FLICKER_VAR = '--flicker'

export function Game() {
    const game_state = new GameState()

    /**
     * Game state is not a reactive proxy, so we need to track it manually
     */
    const game_state_sig = s.reactive(() => {
        game_state.turn_signal.get()
        return game_state
    })

    createDirectionMovement(direction => {
        movePlayerInDirection(game_state, direction)
    })

    const show_menu = s.memo(
        s.map(
            game_state_sig,
            ({ pos }) => pos.player.equals(pos.start) || pos.player.equals(pos.finish),
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
                        <MenuView messages={game_state_sig.value.menu_messages} />
                    </div>
                    <div class="center-child">
                        <div class="w-full">
                            <MatrixGrid matrix={WINDOW_MATRIX}>
                                {(fov_vec, fov_index) => (
                                    <div
                                        class="flex items-center justify-center"
                                        style={{
                                            'background-color': getTileBgColor(
                                                game_state_sig.value,
                                                fov_vec,
                                                fov_index,
                                            ),
                                        }}
                                    />
                                )}
                            </MatrixGrid>
                        </div>
                    </div>
                </div>
            </main>
            <ResetControl onReset={() => resetFloor(game_state)} />
            {import.meta.env.DEV && <DevTools state={game_state_sig.value} />}
        </>
    )
}

function MenuView(props: { messages: MenuMessages }) {
    return (
        <div>
            <solid.Switch>
                <solid.Match when={props.messages instanceof MenuMessagesWelcome && props.messages}>
                    {messages => (
                        <>
                            <p>{messages().greeting}</p>
                            <p class="mt-3">{messages().arrows}</p>
                            <div class="mt-6 flex w-max flex-col items-center gap-1">
                                <kbd>{trig.Direction.Up}</kbd>
                                <div class="flex gap-1">
                                    <kbd>{trig.Direction.Left}</kbd>
                                    <kbd>{trig.Direction.Down}</kbd>
                                    <kbd>{trig.Direction.Right}</kbd>
                                </div>
                            </div>
                            <p class="mt-6">
                                {((): solid.JSX.Element => {
                                    const parts = messages().reset.split('{{key}}')
                                    return [parts[0], <kbd>R</kbd>, parts[1]]
                                })()}
                            </p>
                        </>
                    )}
                </solid.Match>
                <solid.Match
                    when={props.messages instanceof MenuMessagesNextFloor && props.messages}
                >
                    {messages => (
                        <p>
                            {((): solid.JSX.Element => {
                                const parts = messages().next_floor.split('{{floor}}')
                                return [
                                    parts[0],
                                    <span class="text-wall">{messages().new_floor}.</span>,
                                    parts[1],
                                ]
                            })()}
                        </p>
                    )}
                </solid.Match>
            </solid.Switch>
            <p class="mt-3">{props.messages.farewell}</p>
        </div>
    )
}

const ResetControl = (props: { onReset: VoidFunction }) => {
    const pressing_reset = s.signal(false)

    s.effect(pressing_reset, v => {
        if (!v) return
        const timeout = setTimeout(() => {
            props.onReset()
            s.set(pressing_reset, false)
        }, 1200)
        return () => clearTimeout(timeout)
    })

    createEventListenerMap(window, {
        keydown(e) {
            if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return
            e.key === 'r' && s.set(pressing_reset, true)
        },
        keyup(e) {
            e.key === 'r' && s.set(pressing_reset, false)
        },
        blur() {
            s.set(pressing_reset, false)
        },
        contextmenu() {
            s.set(pressing_reset, false)
        },
    })

    return (
        <>
            {pressing_reset.value && (
                <div class="fixed top-6 left-6 text-xl text-blood animate-fade-in duration-600 animate-both">
                    GIVING UP!
                </div>
            )}
        </>
    )
}

const DevTools = (props: { state: GameState }) => {
    let input1!: HTMLInputElement
    let input2!: HTMLInputElement

    const ToggleSetting = (btn_props: { setting: keyof GameState['dev'] }) => {
        const get = () => props.state.dev[btn_props.setting]
        return (
            <button
                onClick={() => {
                    props.state.dev[btn_props.setting] = !get()
                    updateState(props.state)
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
                    setUnknownPlayerPosition(props.state, x, y)
                }}
                class="space-x-1"
                onKeyDown={e => {
                    if (e.key !== 'Enter') e.stopPropagation()
                }}
            >
                <input ref={input1} value={props.state.pos.player.x} class="w-12" type="number" />
                <input ref={input2} value={props.state.pos.player.y} class="w-12" type="number" />
                <button class="hidden" />
            </form>
            <p>turn: {props.state.turn}</p>
            <p>floor: {props.state.floor}</p>
            <ToggleSetting setting="show_invisible" />
            <ToggleSetting setting="hide_easing" />
            <ToggleSetting setting="noclip" />
        </div>
    )
}

export const MatrixGrid = <T,>(props: {
    matrix: trig.Matrix<T>
    children: (item: T, index: number) => solid.JSX.Element
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
                {item => props.children(item().item, item().index)}
            </solid.Index>
        </div>
    )
}
