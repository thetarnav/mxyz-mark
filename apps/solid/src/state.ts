import { math, s, solid, t, trig } from './lib'
import COLORS from '../../../data/colors.json'
import { generateMazeMatrix } from './generate_maze'
import { updateVisiblePoints } from './fov'
import { MenuMessages, MenuMessagesNextFloor, MenuMessagesWelcome } from './messages'

export { COLORS }

export const N_TINTS = 4

export type Tint = t.Enumerate<typeof N_TINTS>

export type MazeConfig = {
    n_tiles: number
    size: number
    center: trig.Vector
    center_origin: trig.Vector
    shrine_corners: Record<trig.Quadrand, trig.Vector>
    shrine_centers: Record<trig.Quadrand, trig.Vector>
}

export type MazeTileState = {
    wall: boolean
    flooded: boolean
    tint: Tint
}
export type MazeMatrix = trig.Matrix<MazeTileState>

export class MazePositions {
    player: trig.Vector
    start: trig.Vector
    finish: trig.Vector
    minimap_finish: trig.Vector
    shallow_flood = new Set<trig.VecString>()

    constructor(start_q: trig.Quadrand, maze_config: MazeConfig) {
        const starting_points = getStartingPoints(start_q, maze_config)

        this.start = this.player = starting_points.start
        this.finish = starting_points.finish
        this.minimap_finish = starting_points.minimap_finish
        this.shallow_flood.add(starting_points.flood_start.toString())
    }
}

export class GameState {
    floor = 1
    turn = 1
    maze_config = initMazeConfig(0)
    maze: MazeMatrix
    start_q = math.randomInt(4) as trig.Quadrand
    pos: MazePositions
    window!: trig.Matrix<trig.Vector>
    visible = new Map<number, boolean>()
    progress_to_flood_update = 0
    in_shrine = false
    menu_messages: MenuMessages = new MenuMessagesWelcome()
    turn_signal = s.signal()
    dev = {
        hide_easing: false,
        show_invisible: false,
        noclip: false,
    }

    constructor() {
        this.pos = new MazePositions(this.start_q, this.maze_config)
        this.maze = generateMazeMatrix(this.maze_config)

        updateState(this)
    }
}

export const isWall = (maze_state: MazeMatrix, p: trig.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.wall)
}

export const isFlooded = (maze_state: MazeMatrix, p: trig.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.flooded)
}

export const isVisible = (maze_state: MazeMatrix, p: trig.Vector) => {
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

export function initMazeConfig(floor: number): MazeConfig {
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
    maze_config: MazeConfig,
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

export function updateFloor(state: GameState) {
    state.floor++
    state.maze_config = initMazeConfig(state.floor)
    state.maze = generateMazeMatrix(state.maze_config)
    state.progress_to_flood_update = 0
    state.turn = 1

    state.start_q = trig.OPPOSITE_QUADRANTS[state.start_q] // old finish quadrant

    state.pos = new MazePositions(state.start_q, state.maze_config)

    state.menu_messages = new MenuMessagesNextFloor(state.floor)

    updateState(state)
}

export function resetFloor(state: GameState) {
    state.maze = generateMazeMatrix(state.maze_config)
    state.progress_to_flood_update = 0
    state.turn = 1

    state.pos = new MazePositions(state.start_q, state.maze_config)

    updateState(state)
}

export function updateState(state: GameState) {
    const player = state.pos.player

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

    s.trigger(state.turn_signal)
}

export function movePlayerInDirection(game_state: GameState, direction: trig.Direction) {
    solid.batch(() => {
        /*
            move player in direction if possible
        */
        const vec = game_state.pos.player.go(direction)
        const vec_state = game_state.maze.get(vec)

        if (!game_state.dev.noclip && (!vec_state || vec_state.wall || vec_state.flooded)) return

        /*
            round ended, make a new maze
        */
        if (vec.equals(game_state.pos.finish)) {
            updateFloor(game_state)
        } else {
            game_state.pos.player = vec
            updateState(game_state)
            expandFlood(game_state)
        }
    })
}

export function setUnknownPlayerPosition(game_state: GameState, x: unknown, y: unknown) {
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
        throw new Error('invalid input')
    }
    const vec = trig.vector(x, y)
    if (!game_state.maze.inBounds(vec)) {
        throw new Error('out of bounds')
    }
    game_state.pos.player = vec
    updateState(game_state)
}

export function expandFlood(game_state: GameState) {
    const { maze } = game_state

    game_state.turn++
    game_state.progress_to_flood_update += game_state.turn / 1000
    const expand_times = Math.floor(game_state.progress_to_flood_update)
    game_state.progress_to_flood_update -= expand_times

    for (let i = 0; i < expand_times; i++) {
        for (const pos_str of math.randomIterate([...game_state.pos.shallow_flood])) {
            for (const neighbor of trig.eachPointDirection(trig.Vector.fromStr(pos_str), maze)) {
                const neighbor_state = maze.get(neighbor)
                if (!neighbor_state) continue

                const neighbor_str = neighbor.toString()
                if (
                    neighbor_state.wall ||
                    neighbor_state.flooded ||
                    game_state.pos.shallow_flood.has(neighbor_str)
                )
                    continue

                game_state.pos.shallow_flood.add(neighbor_str)
                return
            }

            game_state.pos.shallow_flood.delete(pos_str)
            maze.get(trig.Vector.fromStr(pos_str))!.flooded = true
        }
    }
}
