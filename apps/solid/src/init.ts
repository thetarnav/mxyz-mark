import * as t from 'src/lib/trigonometry'
import * as s from 'src/lib/signal'
import {
    BOARD_SIZE,
    GRID_SIZE,
    Game_State,
    MAZE_CENTER,
    MAZE_CENTER_ORIGIN,
    Maze_Matrix,
    Maze_Tile_State,
    N_TILES,
    N_TINTS,
    SHRINE_CENTER,
    SHRINE_RADIUS_TILES,
    SHRINE_SIZE,
    SHRINE_SIZE_TILES,
    TILE_SIZE,
    Tint,
    corner_shrine_centers,
    corner_shrine_corners,
    isWall,
    vecToMinimap,
} from './state'

export const initGameState = (): Game_State => {
    const game_state: Game_State = {
        player: MAZE_CENTER,
        start: null!,
        finish: null!,
        minimap_finish: null!,
        maze: null!,
        turn: 0,
        progress_to_flood_update: 0,
        shallow_flood: new Set(),
        windowed: null!,
        visible: new Map(),
        in_shrine: false,
        turn_signal: s.signal(),
        show_invisible: false,
        noclip: false,
    }

    const starting_q = t.randomInt(4)
    const finish_q = (starting_q + 2) % 4 // opposite of start
    const flood_start_q = // corner shrine adjacent to start
        t.remainder(starting_q + (Math.random() > 0.5 ? 1 : -1), 4)

    game_state.start = game_state.player = corner_shrine_centers[starting_q as t.Quadrand]
    game_state.finish = corner_shrine_centers[finish_q as t.Quadrand]
    game_state.shallow_flood.add(corner_shrine_centers[flood_start_q as t.Quadrand].toString())

    game_state.maze = generateInitMazeState()

    game_state.minimap_finish = vecToMinimap(game_state.finish)

    return game_state
}

export const generateMazeWalls = () => {
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

    return walls
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
    if (p.x === 0 || p.y === 0 || p.x === BOARD_SIZE - 1 || p.y === BOARD_SIZE - 1) return true

    const x = p.x - 1,
        y = p.y - 1,
        tile_p = t.vector(x % GRID_SIZE, y % GRID_SIZE)

    // wall joints
    if (tile_p.x === TILE_SIZE && tile_p.y === TILE_SIZE) return false // will be handled later
    // tiles
    if (tile_p.x < TILE_SIZE && tile_p.y < TILE_SIZE) return false
    // vertical walls
    if (tile_p.x === TILE_SIZE) {
        const walls_p = t.vector((x - TILE_SIZE) / GRID_SIZE, (y - tile_p.y) / GRID_SIZE)
        return walls.get(walls_p)![t.Direction.Right]
    }
    // horizontal walls
    const walls_p = t.vector((x - tile_p.x) / GRID_SIZE, (y - TILE_SIZE) / GRID_SIZE + 1)
    return walls.get(walls_p)![t.Direction.Down]
}

export function generateInitMazeState(): Maze_Matrix {
    const walls = generateMazeWalls()

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

    tintMazeTiles(state)

    /*
        round the tunnel corners
    */
    for (const i of state) {
        const p = state.vec(i)
        if ((p.x - 1) % GRID_SIZE === TILE_SIZE && (p.y - 1) % GRID_SIZE === TILE_SIZE) {
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
            const vec_state = state.get(vec)!
            vec_state.wall = false
        }

        /*
            Make corner shrine exits (one on each maze-facing edge)
        */
        for (let i = 0; i < TILE_SIZE; i++) {
            const base = t.vector(2 * GRID_SIZE + i, SHRINE_SIZE - 1)

            let p = base.rotate(t.quadrand_to_rotation[q], SHRINE_CENTER).round().add(corner)
            let p_state = state.get(p)!

            p_state.wall = false

            p = base
                .flip(t.vector(SHRINE_CENTER.x, SHRINE_SIZE - 1))
                .rotate(t.quadrand_to_rotation[q] - t.toRadian(90), SHRINE_CENTER)
                .round()
                .add(corner)
            p_state = state.get(p)!

            p_state.wall = false
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
        const corner = corner_shrine_corners[q],
            wall_structure = shrine_structure_paths.Corner,
            rotation = t.quadrand_to_rotation[q]

        for (let vec of wall_structure) {
            vec = vec.rotate(rotation, SHRINE_CENTER).add(corner).round()
            state.get(vec)!.wall = true
        }
    }

    for (const vec of shrine_structure_paths.Circle) {
        state.get(vec.add(MAZE_CENTER_ORIGIN))!.wall = true
    }

    return state
}

const tintMazeTiles = (maze_state: t.Matrix<Maze_Tile_State>) => {
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

        const pick = t.randomIntFrom(possibles[from], possibles[to] + 1) as Tint,
            p = maze_state.vec(idx),
            p_state = maze_state.get(p)!

        p_state.tint = possibles[from] = possibles[to] = pick

        for (const n of t.vec_neighbors(p)) {
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
