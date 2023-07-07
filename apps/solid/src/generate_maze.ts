import {
    MazeConfig,
    SHRINE_SIZE_TILES,
    SHRINE_RADIUS_TILES,
    GRID_SIZE,
    TILE_SIZE,
    MazeMatrix,
    MazeTileState,
    SHRINE_SIZE,
    SHRINE_CENTER,
    N_TINTS,
    Tint,
} from './state'
import { trig, math } from './lib'

export type WallsMatrix = trig.Matrix<Record<trig.Direction.Right | trig.Direction.Down, boolean>>

export function generateMazeWalls(maze_state: MazeConfig): WallsMatrix {
    const walls: WallsMatrix = new trig.Matrix(maze_state.n_tiles, maze_state.n_tiles, () => ({
        [trig.Direction.Right]: true,
        [trig.Direction.Down]: true,
    }))

    /*
        ignore maze generation in the shrine tiles at each corner
        and in the center shrine
    */
    const ignoredVectorsSet = new Set<trig.VecString>()
    for (const q of trig.QUADRANTS) {
        const originTile = trig.quadrand_to_vec[q].multiply(maze_state.n_tiles - SHRINE_SIZE_TILES)
        for (const vec of trig
            .segment(trig.ZERO_VEC, trig.vector(SHRINE_SIZE_TILES - 1))
            .points()) {
            ignoredVectorsSet.add(originTile.add(vec).toString())
        }
    }
    for (const vec of trig
        .segment(
            trig.vector(maze_state.n_tiles / 2 - SHRINE_RADIUS_TILES),
            trig.vector(maze_state.n_tiles / 2 + SHRINE_RADIUS_TILES - 1),
        )
        .points()) {
        ignoredVectorsSet.add(vec.toString())
    }

    const stack = [...ignoredVectorsSet],
        directions: trig.Direction[] = []

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
        const swap = math.randomIntFrom(i, stack.length),
            vecStr = stack[swap]
        let vec = trig.vectorFromStr(vecStr)
        stack[swap] = stack[i]
        stack[i] = vecStr

        for (const direction of trig.DIRECTIONS_H_V) {
            const neighbor = walls.go(vec, direction)
            if (!neighbor) continue

            const str = neighbor.toString()
            if (ignoredVectorsSet.has(str)) continue

            const index = stack.indexOf(str)
            if (index === -1) stack.push(str)
            else if (index < i) directions.push(direction)
        }

        if (directions.length === 0) continue

        let dir = directions[math.randomInt(directions.length)]
        if (dir === trig.Direction.Up || dir === trig.Direction.Left) {
            vec = walls.go(vec, dir)!
            dir = trig.OPPOSITE_DIRECTION[dir]
        }
        walls.get(vec)![dir] = false
        directions.length = 0
    }

    return walls
}

const CORNER_STRUCTURE_POINTS: trig.Vector[] = [
    trig.vector(0, 0),
    trig.vector(10, 10),
    trig.vector(0, 10),
    trig.vector(10, 0),

    trig.vector(2, 2),
    trig.vector(3, 2),
    trig.vector(2, 3),

    trig.vector(1, 5),

    trig.vector(2, 8),
    trig.vector(3, 8),
    trig.vector(2, 7),

    trig.vector(5, 1),

    trig.vector(8, 2),
    trig.vector(8, 3),
    trig.vector(7, 2),
]

const CENTER_STRUCTURE_POINTS: trig.Vector[] = [
    trig.vector(0, 0),
    trig.vector(10, 10),
    trig.vector(0, 10),
    trig.vector(10, 0),

    trig.vector(2, 2),
    trig.vector(3, 2),
    trig.vector(2, 3),

    trig.vector(2, 8),
    trig.vector(3, 8),
    trig.vector(2, 7),

    trig.vector(8, 2),
    trig.vector(8, 3),
    trig.vector(7, 2),

    trig.vector(8, 8),
    trig.vector(7, 8),
    trig.vector(8, 7),
]

function isWallsPointWall(p: trig.Vector, walls: WallsMatrix, maze_config: MazeConfig): boolean {
    if (p.x === 0 || p.y === 0 || p.x === maze_config.size - 1 || p.y === maze_config.size - 1)
        return true

    const x = p.x - 1,
        y = p.y - 1,
        tile_p = trig.vector(x % GRID_SIZE, y % GRID_SIZE)

    // wall joints
    if (tile_p.x === TILE_SIZE && tile_p.y === TILE_SIZE) return false // will be handled later
    // tiles
    if (tile_p.x < TILE_SIZE && tile_p.y < TILE_SIZE) return false
    // vertical walls
    if (tile_p.x === TILE_SIZE) {
        const walls_p = trig.vector((x - TILE_SIZE) / GRID_SIZE, (y - tile_p.y) / GRID_SIZE)
        return walls.get(walls_p)![trig.Direction.Right]
    }
    // horizontal walls
    const walls_p = trig.vector((x - tile_p.x) / GRID_SIZE, (y - TILE_SIZE) / GRID_SIZE + 1)
    return walls.get(walls_p)![trig.Direction.Down]
}

export const isWall = (maze_state: MazeMatrix, p: trig.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.wall)
}

export function generateMazeMatrix(maze_config: MazeConfig): MazeMatrix {
    const walls = generateMazeWalls(maze_config)

    /*
        turn the walls info into a state matrix grid
    */
    const state = new trig.Matrix(maze_config.size, maze_config.size, (x, y): MazeTileState => {
        const p = trig.vector(x, y)

        return {
            wall: isWallsPointWall(p, walls, maze_config),
            flooded: false,
            tint: 0,
        }
    })

    tintMazeTiles(state)

    /*
        round the tunnel corners
    */
    for (const i of state) {
        const p = state.vec(i)
        if ((p.x - 1) % GRID_SIZE === TILE_SIZE && (p.y - 1) % GRID_SIZE === TILE_SIZE) {
            const l = p.go(trig.Direction.Left),
                u = p.go(trig.Direction.Up),
                r = p.go(trig.Direction.Right),
                d = p.go(trig.Direction.Down),
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
                const p = from.go(l_wall ? trig.Direction.Left : trig.Direction.Right)
                state.get(p)!.wall = true
            }
        }
    }

    for (const q of trig.QUADRANTS) {
        const corner = maze_config.shrine_corners[q]

        /*
            Clear walls inside the corner shrines
        */
        for (const vec of trig
            .segment(trig.ZERO_VEC, trig.vector(SHRINE_SIZE - 2))
            .add(corner)
            .points()) {
            const vec_state = state.get(vec)!
            vec_state.wall = false
        }

        /*
            Make corner shrine exits (one on each maze-facing edge)
        */
        for (let i = 0; i < TILE_SIZE; i++) {
            const base = trig.vector(2 * GRID_SIZE + i, SHRINE_SIZE - 1)

            let p = base.rotate(trig.quadrand_to_rotation[q], SHRINE_CENTER).round().add(corner)
            let p_state = state.get(p)!

            p_state.wall = false

            p = base
                .flip(trig.vector(SHRINE_CENTER.x, SHRINE_SIZE - 1))
                .rotate(trig.quadrand_to_rotation[q] - trig.toRadian(90), SHRINE_CENTER)
                .round()
                .add(corner)
            p_state = state.get(p)!

            p_state.wall = false
        }
    }

    /*
        Clear walls inside the center shrine
    */
    const bottom_left = maze_config.center.subtract(SHRINE_RADIUS_TILES * GRID_SIZE)
    const top_right = maze_config.center.add(SHRINE_RADIUS_TILES * GRID_SIZE)
    for (const vec of trig.segment(bottom_left.add(1), top_right.subtract(1)).points()) {
        state.get(vec)!.wall = false
    }
    const exit_tiles = Array.from({ length: 4 }, () => (1 + math.randomInt(2)) * GRID_SIZE)
    for (let x = 0; x < TILE_SIZE; x++) {
        state.get({ x: bottom_left.x + exit_tiles[0] + x + 1, y: bottom_left.y })!.wall = false
        state.get({ x: bottom_left.x + exit_tiles[1] + x + 1, y: top_right.y })!.wall = false
    }
    for (let y = 0; y < TILE_SIZE; y++) {
        state.get({ x: bottom_left.x, y: bottom_left.y + exit_tiles[2] + y + 1 })!.wall = false
        state.get({ x: top_right.x, y: bottom_left.y + exit_tiles[3] + y + 1 })!.wall = false
    }

    /*
        add shrine structures
    */
    for (const q of trig.QUADRANTS) {
        const corner = maze_config.shrine_corners[q],
            rotation = trig.quadrand_to_rotation[q]

        for (let vec of CORNER_STRUCTURE_POINTS) {
            vec = vec.rotate(rotation, SHRINE_CENTER).add(corner).round()
            state.get(vec)!.wall = true
        }
    }

    for (const vec of CENTER_STRUCTURE_POINTS) {
        state.get(vec.add(maze_config.center_origin))!.wall = true
    }

    return state
}

const tintMazeTiles = (maze_state: trig.Matrix<MazeTileState>) => {
    /*
        Wave Function Collapse-ish tinting
    */

    const possibles: number[] = new Array(maze_state.length)
    const stack: number[] = new Array(maze_state.length)

    for (let i = 0; i < maze_state.length; i++) {
        possibles[i * 2] = 0
        possibles[i * 2 + 1] = N_TINTS - 1
        stack[i] = i
    }

    while (stack.length) {
        const idx = stack.pop()!,
            from = idx * 2,
            to = from + 1

        if (possibles[to] - possibles[from] === 0) continue

        const pick = math.randomIntFrom(possibles[from], possibles[to] + 1) as Tint,
            p = maze_state.vec(idx),
            p_state = maze_state.get(p)!

        p_state.tint = possibles[from] = possibles[to] = pick

        for (const n of trig.vec_neighbors(p)) {
            const n_idx = maze_state.idx(n)
            if (!(n_idx in possibles)) continue

            const n_from = n_idx * 2,
                n_to = n_from + 1
            if (possibles[n_to] - possibles[n_from] === 0) continue

            possibles[n_from] = Math.max(possibles[n_from], pick - 1)
            possibles[n_to] = Math.min(possibles[n_to], pick + 1)
            const range = possibles[n_to] - possibles[n_from]

            for (let i = stack.length - 1; i >= 0; i--) {
                const s_idx = stack[i],
                    s_from = s_idx * 2,
                    s_to = s_from + 1,
                    i_range = possibles[s_to] - possibles[s_from]

                if (range <= i_range) {
                    stack.splice(i + 1, 0, n_idx)
                    break
                }
            }
        }
    }
}
