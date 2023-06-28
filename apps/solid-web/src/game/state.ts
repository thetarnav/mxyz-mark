import * as t from 'src/lib/trigonometry'
import * as s from 'src/lib/signal'

export const N_TILES = 36
export const TILE_SIZE = 3
export const GRID_SIZE = TILE_SIZE + 1
export const BOARD_SIZE = N_TILES * GRID_SIZE - 1 // -1 for omitted last wall
export const WINDOW_SIZE = 15

export const SHRINE_SIZE_TILES = 4
export const SHRINE_RADIUS_TILES = 2
export const SHRINE_SIZE = SHRINE_SIZE_TILES * GRID_SIZE
export const SHRINE_CENTER = t.vector(Math.floor(SHRINE_SIZE / 2 - 1))

export const maze_center = t.vector(1, 1).multiply(Math.floor(BOARD_SIZE / 2))
export const maze_center_origin = maze_center.subtract(Math.floor(WINDOW_SIZE / 2))

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

export const ALL_SHRINE_CENTERS = [maze_center, ...Object.values(corner_shrine_centers)]

export type Maze_Tile_State = {
    wall: boolean
    flooded: boolean
    tinted: boolean
}
export type Maze_Matrix = t.Matrix<Maze_Tile_State>

export type Game_State = {
    player: t.Vector
    finish: t.Vector
    maze_state: Maze_Matrix
    windowed: t.Matrix<t.Vector>
    visible: Map<number, boolean>
    shallow_flood: Set<t.VecString>
    turn: number
    progress_to_flood_update: number
    in_shrine: boolean
    turn_signal: s.Signal<undefined>
    show_invisible: boolean
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
        t.vector(4, 4),
        t.vector(3, 4),
        t.vector(4, 3),
        t.vector(3, 5),
        t.vector(5, 3),
        t.vector(3, 6),
        t.vector(6, 3),
        t.vector(3, 8),
        t.vector(8, 3),
        t.vector(3, 9),
        t.vector(9, 3),
        t.vector(0, 11),
        t.vector(1, 11),
        t.vector(3, 11),
        t.vector(0, 14),
        t.vector(11, 0),
        t.vector(11, 1),
        t.vector(11, 3),
        t.vector(14, 0),
        t.vector(14, 14),
    ],
    Circle: [
        t.vector(0, 0),
        t.vector(0, 14),
        t.vector(14, 0),
        t.vector(14, 14),
        //
        t.vector(3, 4),
        t.vector(4, 4),
        t.vector(5, 4),
        t.vector(4, 3),
        t.vector(4, 5),
        //
        t.vector(9, 4),
        t.vector(10, 4),
        t.vector(11, 4),
        t.vector(10, 3),
        t.vector(10, 5),
        //
        t.vector(3, 10),
        t.vector(4, 10),
        t.vector(5, 10),
        t.vector(4, 9),
        t.vector(4, 11),
        //
        t.vector(9, 10),
        t.vector(10, 10),
        t.vector(11, 10),
        t.vector(10, 9),
        t.vector(10, 11),
    ],
} satisfies Record<string, t.Pointable[]>

function isWallsPointWall(
    p: t.Vector,
    walls: t.Matrix<{
        [t.Direction.Right]: boolean
        [t.Direction.Down]: boolean
    }>,
): boolean {
    const tileP = t.vector(p.x % GRID_SIZE, p.y % GRID_SIZE)
    // tiles
    if (tileP.x < TILE_SIZE && tileP.y < TILE_SIZE) return false
    // wall joints
    if (tileP.x === TILE_SIZE && tileP.y === TILE_SIZE) return true
    // vertical walls
    if (tileP.x === TILE_SIZE) {
        const mazeP = t.vector((p.x - TILE_SIZE) / GRID_SIZE, (p.y - tileP.y) / GRID_SIZE)
        return walls.get(mazeP)![t.Direction.Right]
    }
    // horizontal walls
    const mazeP = t.vector((p.x - tileP.x) / GRID_SIZE, (p.y - TILE_SIZE) / GRID_SIZE + 1)
    return walls.get(mazeP)![t.Direction.Down]
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

    /*
        use strings instead of vectors for === comparison
    */
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
    const state = new t.Matrix(BOARD_SIZE, BOARD_SIZE, (x, y) => {
        const p = t.vector(x, y)

        return {
            wall: isWallsPointWall(p, walls),
            flooded: false,
            tinted: false,
        }
    })

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
    const bottomLeft = maze_center.subtract(SHRINE_RADIUS_TILES * GRID_SIZE)
    const topRight = maze_center.add(SHRINE_RADIUS_TILES * GRID_SIZE)
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
        state.get(vec.add(maze_center_origin))!.wall = true
    }

    return state
}

function updatePointVisibility(game_state: Game_State, p: t.Vector): boolean {
    const { maze_state, player, visible, windowed } = game_state

    if (!maze_state.inBounds(p)) return false

    const i = maze_state.i(p)
    let is_visible = visible.get(i)
    if (is_visible !== undefined) return is_visible
    is_visible = false

    check: {
        /*
            walls are not visible
        */
        if (!isVisible(maze_state, p)) break check

        if (game_state.show_invisible) {
            is_visible = true
            break check
        }

        const dx = p.x - player.x,
            dy = p.y - player.y,
            sx = Math.sign(dx),
            sy = Math.sign(dy)

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

        const seg = t.segment(player, p)
        const line = t.lineFromSegment(seg)

        /*
            a tile must not have a wall segment between it and the player
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

        /*
            a tile must be within the player's round field of view
        */
        if (t.segmentLength(seg) >= (windowed.width - 1) / 2 + 0.5) break check

        is_visible = true
    }

    visible.set(i, is_visible)
    return is_visible
}

export function updateVisiblePoints(game_state: Game_State): void {
    const { maze_state, player, windowed } = game_state

    /*
        player and all wall-less tiles around him are visible
    */
    game_state.visible = new Map([[maze_state.i(player), true]])

    for (let x = -1; x <= 1; x += 2) {
        const p = player.add(x, 0)
        if (isVisible(maze_state, p)) game_state.visible.set(maze_state.i(p), true)
    }
    for (let y = -1; y <= 1; y += 2) {
        const p = player.add(0, y)
        if (isVisible(maze_state, p)) game_state.visible.set(maze_state.i(p), true)
    }

    for (const p of windowed) updatePointVisibility(game_state, windowed.get(p)!)
}
