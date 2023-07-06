import { math, s, solid, t, trig } from './lib'
import COLORS from '../../../data/colors.json'
import { generateMazeMatrix } from './generate_maze'
import { updateVisiblePoints } from './fov'
import { MenuMessages, MenuMessagesNextFloor, MenuMessagesWelcome } from './messages'

export { COLORS }

export const TILE_SIZE = 2
export const GRID_SIZE = TILE_SIZE + 1
export const OUTER_WALL_SIZE = 1

export const WINDOW_SIZE = 19
export const WINDOW_RADIUS = math.floor(WINDOW_SIZE / 2)
export const WINDOW_MATRIX = trig.windowedMatrix(WINDOW_SIZE, trig.ZERO_VEC)

export const SHRINE_SIZE_TILES = 4
export const SHRINE_RADIUS_TILES = 2
export const SHRINE_SIZE = SHRINE_SIZE_TILES * GRID_SIZE
export const SHRINE_CENTER = trig.vector(math.floor(SHRINE_SIZE / 2 - 1))

export const N_TINTS = 4

export type Tint = t.Enumerate<typeof N_TINTS>

export class MazeConfig {
    n_tiles: number
    size: number
    center: trig.Vector
    center_origin: trig.Vector
    shrine_corners = {} as Record<trig.Quadrand, trig.Vector>
    shrine_centers = {} as Record<trig.Quadrand, trig.Vector>

    constructor(floor: number) {
        this.n_tiles = 22 + floor * 2
        this.size = this.n_tiles * GRID_SIZE + OUTER_WALL_SIZE
        this.center = trig.vector(math.floor(this.size / 2))
        this.center_origin = this.center.subtract(math.floor(SHRINE_SIZE / 2 - 1))

        for (const q of trig.QUADRANTS) {
            this.shrine_corners[q] = trig.quadrand_to_vec[q]
                .multiply(this.n_tiles - SHRINE_SIZE_TILES)
                .multiply(GRID_SIZE)
                .add(1)
        }

        for (const q of trig.QUADRANTS) {
            this.shrine_centers[q] = this.shrine_corners[q].add(SHRINE_CENTER)
        }
    }
}

export type MazeTileState = {
    wall: boolean
    flooded: boolean
    tint: Tint
}
export type MazeMatrix = trig.Matrix<MazeTileState>

const FLOOD_STARTING_POINTS: trig.Vector[] = [
    trig.vector(0, 0),
    trig.vector(1, 1),
    trig.vector(1, 0),
    trig.vector(0, 1),

    trig.vector(10, 0),
    trig.vector(10, 1),
    trig.vector(9, 0),
    trig.vector(9, 1),

    trig.vector(0, 10),
    trig.vector(1, 10),
    trig.vector(0, 9),
    trig.vector(1, 9),
]

export class MazePositions {
    player: trig.Vector
    start: trig.Vector
    finish: trig.Vector
    minimap_finish: trig.Vector
    shallow_flood = new Set<trig.VecString>()

    constructor(start_q: trig.Quadrand, maze_config: MazeConfig) {
        this.start = this.player = maze_config.shrine_centers[start_q]
        this.finish = maze_config.shrine_centers[trig.OPPOSITE_QUADRANTS[start_q]]
        this.minimap_finish = this.finish.map(xy =>
            Math.round(math.mapRange(xy, 0, maze_config.size - 1, 0, WINDOW_SIZE - 1)),
        )

        const start_corner = maze_config.shrine_corners[start_q],
            start_rotation = trig.quadrand_to_rotation[start_q]

        for (let vec of FLOOD_STARTING_POINTS) {
            vec = vec.rotate(start_rotation, SHRINE_CENTER).add(start_corner).round()
            this.shallow_flood.add(vec.toString())
        }
    }
}

export const FLOOD_PROGRESS_THRESHOLD = 1000
export const FLOOD_INIT_PROGRESS = 600

export class GameState {
    floor = 1
    turn = 1
    maze_config = new MazeConfig(this.floor)
    maze = generateMazeMatrix(this.maze_config)
    start_q = math.randomInt(4) as trig.Quadrand
    pos = new MazePositions(this.start_q, this.maze_config)
    visible = new Map<number, boolean>()
    progress_to_flood_update = FLOOD_INIT_PROGRESS
    in_shrine = false
    menu_messages: MenuMessages = new MenuMessagesWelcome()
    turn_signal = s.signal()
    dev = {
        hide_easing: false,
        show_invisible: false,
        noclip: false,
    }

    constructor() {
        updateState(this)
    }
}

export function updateFloor(state: GameState): void {
    state.floor++
    state.maze_config = new MazeConfig(state.floor)
    state.maze = generateMazeMatrix(state.maze_config)
    state.progress_to_flood_update = FLOOD_INIT_PROGRESS
    state.turn = 1

    state.start_q = trig.OPPOSITE_QUADRANTS[state.start_q] // old finish quadrant

    state.pos = new MazePositions(state.start_q, state.maze_config)

    state.menu_messages = new MenuMessagesNextFloor(state.floor)

    updateState(state)
}

export function resetFloor(state: GameState): void {
    state.maze = generateMazeMatrix(state.maze_config)
    state.progress_to_flood_update = FLOOD_INIT_PROGRESS
    state.turn = 1

    state.pos = new MazePositions(state.start_q, state.maze_config)

    updateState(state)
}

export function updateState(state: GameState): void {
    const player = state.pos.player

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

export function movePlayerInDirection(game_state: GameState, direction: trig.Direction): void {
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

export function setUnknownPlayerPosition(game_state: GameState, x: unknown, y: unknown): void {
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

export function expandFlood(game_state: GameState): void {
    const { maze } = game_state

    game_state.turn++
    game_state.progress_to_flood_update += game_state.turn / FLOOD_PROGRESS_THRESHOLD
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
