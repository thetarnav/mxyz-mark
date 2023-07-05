import { math, s, t, trig } from './lib'
import COLORS from '../../../data/colors.json'
import { generateMazeMatrix } from './generate_maze'
import { updateVisiblePoints } from './fov'

export { COLORS }

export const N_TINTS = 4

export type Tint = t.Enumerate<typeof N_TINTS>

export type Maze_Config = {
    n_tiles: number
    size: number
    center: trig.Vector
    center_origin: trig.Vector
    shrine_corners: Record<trig.Quadrand, trig.Vector>
    shrine_centers: Record<trig.Quadrand, trig.Vector>
}

export type Maze_Tile_State = {
    wall: boolean
    flooded: boolean
    tint: Tint
}
export type Maze_Matrix = trig.Matrix<Maze_Tile_State>

export type Game_State = {
    floor: number
    turn: number
    maze_config: Maze_Config
    maze: Maze_Matrix
    player: trig.Vector
    start_q: trig.Quadrand
    start: trig.Vector
    finish: trig.Vector
    minimap_finish: trig.Vector
    window: trig.Matrix<trig.Vector>
    visible: Map<number, boolean>
    shallow_flood: Set<trig.VecString>
    progress_to_flood_update: number
    in_shrine: boolean
    turn_signal: s.Signal<undefined>
    dev: {
        show_invisible: boolean
        hide_easing: boolean
        noclip: boolean
    }
}

export const isWall = (maze_state: Maze_Matrix, p: trig.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.wall)
}

export const isFlooded = (maze_state: Maze_Matrix, p: trig.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.flooded)
}

export const isVisible = (maze_state: Maze_Matrix, p: trig.Vector) => {
    const state = maze_state.get(p)
    return !!state && !state.wall
}

export const TILE_SIZE = 2
export const GRID_SIZE = TILE_SIZE + 1
export const OUTER_WALL_SIZE = 1
export const WINDOW_SIZE = 19
export const WINDOW_RADIUS = Math.floor(WINDOW_SIZE / 2)

export const SHRINE_SIZE_TILES = 4
export const SHRINE_RADIUS_TILES = 2
export const SHRINE_SIZE = SHRINE_SIZE_TILES * GRID_SIZE
export const SHRINE_CENTER = trig.vector(Math.floor(SHRINE_SIZE / 2 - 1))

export function initMazeConfig(floor: number): Maze_Config {
    const n_tiles = 22 + floor * 2,
        size = n_tiles * GRID_SIZE + OUTER_WALL_SIZE, // +1 for first wall
        center = trig.vector(math.floor(size / 2)),
        center_origin = center.subtract(Math.floor(SHRINE_SIZE / 2 - 1))

    const shrine_corners = {} as Record<trig.Quadrand, trig.Vector>,
        shrine_centers = {} as Record<trig.Quadrand, trig.Vector>

    for (const q of trig.QUADRANTS) {
        shrine_corners[q] = trig.quadrand_to_vec[q]
            .multiply(n_tiles - SHRINE_SIZE_TILES)
            .multiply(GRID_SIZE)
            .add(1)
    }

    for (const q of trig.QUADRANTS) {
        shrine_centers[q] = shrine_corners[q].add(SHRINE_CENTER)
    }

    return {
        n_tiles,
        size,
        center,
        center_origin,
        shrine_corners,
        shrine_centers,
    }
}

function getStartingPoints(
    start_q: trig.Quadrand,
    maze_config: Maze_Config,
): {
    start: trig.Vector
    finish: trig.Vector
    minimap_finish: trig.Vector
    flood_start: trig.Vector
} {
    const start = maze_config.shrine_centers[start_q],
        finish = maze_config.shrine_centers[trig.OPPOSITE_QUADRANTS[start_q]],
        minimap_finish = finish.map(xy =>
            Math.round(math.mapRange(xy, 0, maze_config.size - 1, 0, WINDOW_SIZE - 1)),
        ),
        flood_start = maze_config.shrine_centers[math.pickRandom(trig.ADJACENT_QUADRANTS[start_q])]

    return { start, finish, minimap_finish, flood_start }
}

function updateStartingPoints(state: Game_State) {
    const starting_points = getStartingPoints(state.start_q, state.maze_config)

    state.start = state.player = starting_points.start
    state.finish = starting_points.finish
    state.minimap_finish = starting_points.minimap_finish
    state.shallow_flood.clear()
    state.shallow_flood.add(starting_points.flood_start.toString())
}

export function initGameState(): Game_State {
    const state: Game_State = {
        floor: 1,
        turn: 1,
        maze_config: initMazeConfig(0),
        maze: null!,
        player: null!,
        start_q: math.randomInt(4) as trig.Quadrand,
        start: null!,
        finish: null!,
        minimap_finish: null!,
        progress_to_flood_update: 0,
        shallow_flood: new Set(),
        window: null!,
        visible: new Map(),
        in_shrine: false,
        turn_signal: s.signal(),
        dev: {
            hide_easing: false,
            show_invisible: false,
            noclip: false,
        },
    }

    updateStartingPoints(state)

    state.maze = generateMazeMatrix(state.maze_config)

    updateState(state, state.player)

    return state
}

export function updateFloor(state: Game_State) {
    state.floor++
    state.maze_config = initMazeConfig(state.floor)
    state.maze = generateMazeMatrix(state.maze_config)
    state.progress_to_flood_update = 0
    state.turn = 1

    state.start_q = trig.OPPOSITE_QUADRANTS[state.start_q] // old finish quadrant

    updateStartingPoints(state)

    updateState(state, state.player)
}

export function resetFloor(state: Game_State) {
    state.maze = generateMazeMatrix(state.maze_config)
    state.progress_to_flood_update = 0
    state.turn = 1

    updateStartingPoints(state)

    updateState(state, state.player)
}

export function updateState(state: Game_State, player: trig.Vector) {
    state.player = player

    state.window = trig.windowedMatrix(WINDOW_SIZE, player)

    updateVisiblePoints(state)

    state.in_shrine = false
    for (const vec of Object.values(state.maze_config.shrine_centers).concat(
        state.maze_config.center,
    )) {
        if (trig.distance(player, vec) < SHRINE_RADIUS_TILES * GRID_SIZE) {
            state.in_shrine = true
            break
        }
    }
}

export function movePlayerInDirection(game_state: Game_State, direction: trig.Direction) {
    /*
        move player in direction if possible
    */
    const vec = game_state.player.go(direction)
    const vec_state = game_state.maze.get(vec)

    if (!game_state.dev.noclip && (!vec_state || vec_state.wall || vec_state.flooded)) return

    /*
        round ended, make a new maze
    */
    if (vec.equals(game_state.finish)) {
        updateFloor(game_state)
    } else {
        updateState(game_state, vec)
        expandFlood(game_state)
    }

    s.trigger(game_state.turn_signal)
}

export function setUnknownPlayerPosition(game_state: Game_State, x: unknown, y: unknown) {
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
        throw new Error('invalid input')
    }
    const vec = trig.vector(x, y)
    if (!game_state.maze.inBounds(vec)) {
        throw new Error('out of bounds')
    }
    updateState(game_state, vec)
    s.trigger(game_state.turn_signal)
}

export function expandFlood(game_state: Game_State) {
    const { maze } = game_state

    game_state.turn++
    game_state.progress_to_flood_update += game_state.turn / 1000
    const expand_times = Math.floor(game_state.progress_to_flood_update)
    game_state.progress_to_flood_update -= expand_times

    for (let i = 0; i < expand_times; i++) {
        for (const pos_str of math.randomIterate([...game_state.shallow_flood])) {
            for (const neighbor of trig.eachPointDirection(trig.Vector.fromStr(pos_str), maze)) {
                const neighbor_state = maze.get(neighbor)
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
            maze.get(trig.Vector.fromStr(pos_str))!.flooded = true
        }
    }
}
