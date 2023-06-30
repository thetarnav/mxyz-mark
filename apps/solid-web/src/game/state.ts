import * as t from 'src/lib/trigonometry'
import * as s from 'src/lib/signal'

export const N_TILES = 40
export const TILE_SIZE = 2
export const GRID_SIZE = TILE_SIZE + 1
export const BOARD_SIZE = N_TILES * GRID_SIZE - 1 // -1 for omitted last wall
export const WINDOW_SIZE = 15

export const SHRINE_SIZE_TILES = 4
export const SHRINE_RADIUS_TILES = 2
export const SHRINE_SIZE = SHRINE_SIZE_TILES * GRID_SIZE
export const SHRINE_CENTER = t.vector(Math.floor(SHRINE_SIZE / 2 - 1))

export const MAZE_CENTER = t.vector(1, 1).multiply(Math.floor(BOARD_SIZE / 2))
export const MAZE_CENTER_ORIGIN = MAZE_CENTER.subtract(Math.floor(SHRINE_SIZE / 2 - 1))

export const corner_shrine_corners = t.quadrants.reduce((acc, quadrand) => {
    acc[quadrand] = t.quadrand_to_vec[quadrand]
        .multiply(N_TILES - SHRINE_SIZE_TILES)
        .multiply(GRID_SIZE)
    return acc
}, {} as Record<t.Quadrand, t.Vector>)

export const corner_shrine_centers = t.quadrants.reduce((acc, quadrand) => {
    acc[quadrand] = corner_shrine_corners[quadrand].add(SHRINE_CENTER)
    return acc
}, {} as Record<t.Quadrand, t.Vector>)

export const ALL_SHRINE_CENTERS = [MAZE_CENTER, ...Object.values(corner_shrine_centers)]

export const TINTS = [0, 1, 2, 3] as const
export type Tint = (typeof TINTS)[number]

export type Maze_Tile_State = {
    wall: boolean
    flooded: boolean
    tint: Tint
}
export type Maze_Matrix = t.Matrix<Maze_Tile_State>

export type Game_State = {
    player: t.Vector
    finish: t.Vector
    maze: Maze_Matrix
    windowed: t.Matrix<t.Vector>
    visible: Map<number, boolean>
    shallow_flood: Set<t.VecString>
    turn: number
    progress_to_flood_update: number
    in_shrine: boolean
    turn_signal: s.Signal<undefined>
    show_invisible: boolean
    show_walls: boolean
}

export const initGameState = (): Game_State => {
    const game_state: Game_State = {
        player: MAZE_CENTER,
        finish: null!,
        maze: null!,
        turn: 0,
        progress_to_flood_update: 0,
        shallow_flood: new Set(),
        windowed: null!,
        visible: new Map(),
        in_shrine: false,
        turn_signal: s.signal(),
        show_invisible: false,
        show_walls: false,
    }

    const starting_q = t.randomInt(4)
    const finish_q = (starting_q + 2) % 4 // opposite of start
    const flood_start_q = // corner shrine adjacent to start
        t.remainder(starting_q + (Math.random() > 0.5 ? 1 : -1), 4)

    game_state.player = corner_shrine_centers[starting_q as t.Quadrand]
    game_state.finish = corner_shrine_centers[finish_q as t.Quadrand]
    game_state.shallow_flood.add(corner_shrine_centers[flood_start_q as t.Quadrand].toString())

    game_state.maze = generateInitMazeState()

    return game_state
}

export const isWall = (maze_state: Maze_Matrix, p: t.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.wall)
}

export const isFlooded = (maze_state: Maze_Matrix, p: t.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.flooded)
}

export const isVisible = (maze_state: Maze_Matrix, p: t.Vector) => {
    const state = maze_state.get(p)
    return !!state && !state.wall
}

export const shrine_structure_paths = {
    Corner: [
        t.vector(0, 0),
        t.vector(10, 10),
        t.vector(0, 10),
        t.vector(10, 0),

        t.vector(2, 2),
        t.vector(3, 2),
        t.vector(2, 3),

        t.vector(1, 5),

        t.vector(2, 8),
        t.vector(3, 8),
        t.vector(2, 7),

        t.vector(5, 1),

        t.vector(8, 2),
        t.vector(8, 3),
        t.vector(7, 2),
    ],
    Circle: [
        t.vector(0, 0),
        t.vector(10, 10),
        t.vector(0, 10),
        t.vector(10, 0),

        t.vector(2, 2),
        t.vector(3, 2),
        t.vector(2, 3),

        t.vector(2, 8),
        t.vector(3, 8),
        t.vector(2, 7),

        t.vector(8, 2),
        t.vector(8, 3),
        t.vector(7, 2),

        t.vector(8, 8),
        t.vector(7, 8),
        t.vector(8, 7),
    ],
} satisfies Record<string, t.Pointable[]>

function isWallsPointWall(
    p: t.Vector,
    walls: t.Matrix<{
        [t.Direction.Right]: boolean
        [t.Direction.Down]: boolean
    }>,
): boolean {
    const tile_p = t.vector(p.x % GRID_SIZE, p.y % GRID_SIZE)
    // wall joints
    if (tile_p.x === TILE_SIZE && tile_p.y === TILE_SIZE) return false // will be handled later
    // tiles
    if (tile_p.x < TILE_SIZE && tile_p.y < TILE_SIZE) return false
    // vertical walls
    if (tile_p.x === TILE_SIZE) {
        const walls_p = t.vector((p.x - TILE_SIZE) / GRID_SIZE, (p.y - tile_p.y) / GRID_SIZE)
        return walls.get(walls_p)![t.Direction.Right]
    }
    // horizontal walls
    const walls_p = t.vector((p.x - tile_p.x) / GRID_SIZE, (p.y - TILE_SIZE) / GRID_SIZE + 1)
    return walls.get(walls_p)![t.Direction.Down]
}

export function generateInitMazeState(): Maze_Matrix {
    const walls = new t.Matrix(N_TILES, N_TILES, () => ({
        [t.Direction.Right]: true,
        [t.Direction.Down]: true,
    }))

    /*
        ignore maze generation in the shrine tiles at each corner
        and in the center shrine
    */
    const ignoredVectorsSet = new Set<t.VecString>()
    for (const q of t.quadrants) {
        const originTile = t.quadrand_to_vec[q].multiply(N_TILES - SHRINE_SIZE_TILES)
        for (const vec of t.segment(t.ZERO_VEC, t.vector(SHRINE_SIZE_TILES - 1)).points()) {
            ignoredVectorsSet.add(originTile.add(vec).toString())
        }
    }
    for (const vec of t
        .segment(
            t.vector(N_TILES / 2 - SHRINE_RADIUS_TILES),
            t.vector(N_TILES / 2 + SHRINE_RADIUS_TILES - 1),
        )
        .points()) {
        ignoredVectorsSet.add(vec.toString())
    }

    const stack = [...ignoredVectorsSet],
        directions: t.Direction[] = []

    /*
        pick a random vector to start from
        that is not in the ignored vectors
    */
    for (const i of walls) {
        const vec = walls.vec(i)
        if (ignoredVectorsSet.has(vec.toString())) continue
        stack.push(vec.toString())
        break
    }

    /*
        walks through all vectors in the maze
        and randomly removes walls

        only remove walls from neighboring vectors that
        have been visited but haven't been mutated
        this way a path is guaranteed to exist
    */
    for (let i = stack.length - 1; i < walls.length; i++) {
        /*
            vectors below the index - mutated vectors
            vectors above the index - unvisited vectors
        */
        const swap = t.randomIntFrom(i, stack.length),
            vecStr = stack[swap]
        let vec = t.vectorFromStr(vecStr)
        stack[swap] = stack[i]
        stack[i] = vecStr

        for (const direction of t.DIRECTIONS_H_V) {
            const neighbor = walls.go(vec, direction)
            if (!neighbor) continue

            const str = neighbor.toString()
            if (ignoredVectorsSet.has(str)) continue

            const index = stack.indexOf(str)
            if (index === -1) stack.push(str)
            else if (index < i) directions.push(direction)
        }

        if (directions.length === 0) continue

        let dir = directions[t.randomInt(directions.length)]
        if (dir === t.Direction.Up || dir === t.Direction.Left) {
            vec = walls.go(vec, dir)!
            dir = t.OPPOSITE_DIRECTION[dir]
        }
        walls.get(vec)![dir] = false
        directions.length = 0
    }

    /*
        turn the walls info into a state matrix grid
    */
    const state = new t.Matrix(BOARD_SIZE, BOARD_SIZE, (x, y): Maze_Tile_State => {
        const p = t.vector(x, y)

        return {
            wall: isWallsPointWall(p, walls),
            flooded: false,
            tint: 0,
        }
    })

    /*
        round the tunnel corners
    */
    for (const i of state) {
        const p = state.vec(i)
        if (p.x % GRID_SIZE === TILE_SIZE && p.y % GRID_SIZE === TILE_SIZE) {
            const l = p.go(t.Direction.Left),
                u = p.go(t.Direction.Up),
                r = p.go(t.Direction.Right),
                d = p.go(t.Direction.Down),
                u_wall = isWall(state, u),
                l_wall = isWall(state, l),
                r_wall = isWall(state, r),
                d_wall = isWall(state, d)

            if ((u_wall && d_wall) || (l_wall && r_wall) || Math.random() < 0.5) {
                state.get(p)!.wall = true
            }
            // @ts-expect-error we adding booleans
            else if (u_wall + l_wall + r_wall + d_wall > 1) {
                const from = u_wall ? u : d
                const p = from.go(l_wall ? t.Direction.Left : t.Direction.Right)
                state.get(p)!.wall = true
            }
        }
    }

    for (const q of t.quadrants) {
        const corner = corner_shrine_corners[q]

        /*
            Clear walls inside the corner shrines
        */
        for (const vec of t
            .segment(t.ZERO_VEC, t.vector(SHRINE_SIZE - 2))
            .add(corner)
            .points()) {
            state.get(vec)!.wall = false
        }

        /*
            Make corner shrine exits (one on each maze-facing edge)
        */

        for (let i = 0; i < TILE_SIZE; i++) {
            const base = t.vector(2 * GRID_SIZE + i, SHRINE_SIZE - 1)

            let p = base.rotate(t.quadrand_to_rotation[q], SHRINE_CENTER).round().add(corner)

            state.get(p)!.wall = false

            p = base
                .flip(t.vector(SHRINE_CENTER.x, SHRINE_SIZE - 1))
                .rotate(t.quadrand_to_rotation[q] - t.toRadian(90), SHRINE_CENTER)
                .round()
                .add(corner)

            state.get(p)!.wall = false
        }
    }

    /*
        Clear walls inside the center shrine
    */
    const bottomLeft = MAZE_CENTER.subtract(SHRINE_RADIUS_TILES * GRID_SIZE)
    const topRight = MAZE_CENTER.add(SHRINE_RADIUS_TILES * GRID_SIZE)
    for (const vec of t.segment(bottomLeft.add(1), topRight.subtract(1)).points()) {
        state.get(vec)!.wall = false
    }
    const exitTiles = Array.from({ length: 4 }, () => (1 + t.randomInt(2)) * GRID_SIZE)
    for (let x = 0; x < TILE_SIZE; x++) {
        state.get({ x: bottomLeft.x + exitTiles[0] + x + 1, y: bottomLeft.y })!.wall = false
        state.get({ x: bottomLeft.x + exitTiles[1] + x + 1, y: topRight.y })!.wall = false
    }
    for (let y = 0; y < TILE_SIZE; y++) {
        state.get({ x: bottomLeft.x, y: bottomLeft.y + exitTiles[2] + y + 1 })!.wall = false
        state.get({ x: topRight.x, y: bottomLeft.y + exitTiles[3] + y + 1 })!.wall = false
    }

    /*
        add shrine structures
    */
    for (const q of t.quadrants) {
        const corner = corner_shrine_corners[q]
        const structure = shrine_structure_paths.Corner
        const rotation = t.quadrand_to_rotation[q]

        for (let vec of structure) {
            vec = vec.rotate(rotation, SHRINE_CENTER).add(corner).round()
            state.get(vec)!.wall = true
        }
    }

    for (const vec of shrine_structure_paths.Circle) {
        state.get(vec.add(MAZE_CENTER_ORIGIN))!.wall = true
    }

    tintMazeTiles(state)

    return state
}

const tintMazeTiles = (state: t.Matrix<Maze_Tile_State>) => {
    /*
        Wave Function Collapse-ish tinting
    */

    const possibles = Array.from({ length: state.length }, () => new Set(TINTS))

    const stack = Array.from(state)

    while (stack.length) {
        const idx = stack.pop()!
        const p = state.vec(idx)
        const p_possible = possibles[idx]

        if (p_possible.size === 0) continue

        const pick = t.pick_random(Array.from(p_possible))
        p_possible.clear()

        const p_state = state.get(p)!
        p_state.tint = pick

        for (const n of t.vec_neighbors(p)) {
            const n_i = state.i(n)
            if (!(n_i in possibles)) continue

            const n_possible = possibles[n_i]
            if (n_possible.size === 0) continue

            for (const t of n_possible) {
                if (t > pick + 1 || t < pick - 1) {
                    n_possible.delete(t)
                }
            }

            for (let stack_i = stack.length - 1; stack_i >= 0; stack_i--) {
                if (possibles[stack[stack_i]].size >= n_possible.size) {
                    stack.splice(stack_i + 1, 0, n_i)
                    break
                }
            }
        }
    }
}

function updatePointVisibility(game_state: Game_State, p: t.Vector): boolean {
    const { maze, player, visible, windowed } = game_state

    if (!maze.inBounds(p)) return false

    const i = maze.i(p)
    let is_visible = visible.get(i)
    if (is_visible !== undefined) return is_visible
    is_visible = false

    check: {
        const p_state = maze.get(p)!

        if (!game_state.show_walls && p_state.wall) break check

        if (game_state.show_invisible) {
            is_visible = true
            break check
        }

        const dx = p.x - player.x,
            dy = p.y - player.y,
            sx = Math.sign(dx),
            sy = Math.sign(dy)

        /*
            round window corners
        */
        if (t.distance(p, player) >= (windowed.width - 1) / 2 + 0.5) break check

        /*
            don't allow for gaps between visible tiles
            at least one neighbor must be visible
        */
        if (
            (Math.abs(dx) === Math.abs(dy) &&
                !updatePointVisibility(game_state, p.add(-sx, -sy))) ||
            (sx !== 0 &&
                !updatePointVisibility(game_state, p.add(-sx, 0)) &&
                sy !== 0 &&
                !updatePointVisibility(game_state, p.add(0, -sy)))
        )
            break check

        const seg = t.segment(player, p),
            line = t.lineFromSegment(seg)

        /*
            path from the tile to the player cannot be blocked by invisible tiles
        */
        for (let x = player.x + sx; x !== p.x; x += sx) {
            const y = t.getLineY(line, x),
                p1 = t.vector(x, Math.floor(y)),
                p2 = t.vector(x, Math.ceil(y))
            if (!updatePointVisibility(game_state, p1) && !updatePointVisibility(game_state, p2))
                break check
        }

        for (let y = player.y + sy; y !== p.y; y += sy) {
            const x = t.getLineX(line, y),
                p1 = t.vector(Math.floor(x), y),
                p2 = t.vector(Math.ceil(x), y)
            if (!updatePointVisibility(game_state, p1) && !updatePointVisibility(game_state, p2))
                break check
        }

        is_visible = true
    }

    visible.set(i, is_visible)
    return is_visible
}

export function updateVisiblePoints(game_state: Game_State): void {
    const { maze, player, windowed } = game_state

    /*
        player and all wall-less tiles around him are visible
    */
    game_state.visible = new Map([[maze.i(player), true]])

    for (let x = -1; x <= 1; x += 2) {
        const p = player.add(x, 0)
        if (isVisible(maze, p)) game_state.visible.set(maze.i(p), true)
    }
    for (let y = -1; y <= 1; y += 2) {
        const p = player.add(0, y)
        if (isVisible(maze, p)) game_state.visible.set(maze.i(p), true)
    }

    for (const p of windowed) updatePointVisibility(game_state, windowed.get(p)!)
}
