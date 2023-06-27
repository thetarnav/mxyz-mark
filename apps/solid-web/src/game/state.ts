import * as t from 'src/lib/trigonometry'

export const N_TILES = 36
export const TILE_SIZE = 3
export const GRID_SIZE = TILE_SIZE + 1
export const BOARD_SIZE = N_TILES * GRID_SIZE - 1 // -1 for omitted last wall
export const SHRINE_SIZE_TILES = 4
export const SHRINE_RADIUS_TILES = 2
export const SHRINE_SIZE = SHRINE_SIZE_TILES * GRID_SIZE
export const WINDOW_SIZE = 15

export const maze_center = t.vector(1, 1).multiply(Math.floor(BOARD_SIZE / 2))
export const maze_center_origin = maze_center.subtract(Math.floor(WINDOW_SIZE / 2))

export const corner_shrine_corners = t.quadrants.reduce((acc, quadrand) => {
    acc[quadrand] = t.quadrand_to_vec[quadrand]
        .multiply(N_TILES - SHRINE_SIZE_TILES)
        .multiply(GRID_SIZE)
    return acc
}, {} as Record<t.Quadrand, t.Vector>)

export const shrine_center = t.vector(SHRINE_RADIUS_TILES).multiply(GRID_SIZE).subtract(1)

export const corner_shrine_centers = t.quadrants.reduce((acc, quadrand) => {
    acc[quadrand] = corner_shrine_corners[quadrand].add(shrine_center)
    return acc
}, {} as Record<t.Quadrand, t.Vector>)

export const ALL_SHRINE_CENTERS = [maze_center, ...Object.values(corner_shrine_centers)]

export type MazeTileState = {
    wall: boolean
    flooded: boolean
    tinted: boolean
}
export type MazeMatrix = t.Matrix<MazeTileState>

export type GameState = {
    player: t.Vector
    finish: t.Vector
    maze_state: MazeMatrix
    wall_segments: t.Segment[]
    shallow_flood: Set<t.VecString>
    windowed: t.Matrix<t.Vector>
    visible: Set<t.VecString>
    turn: number
    progress_to_flood_update: number
    in_shrine: boolean
}

export const isWall = (maze_state: MazeMatrix, p: t.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.wall)
}

export const isFlooded = (maze_state: MazeMatrix, p: t.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.flooded)
}

export const isVisible = (maze_state: MazeMatrix, p: t.Vector) => {
    const state = maze_state.get(p)
    return !!state && !state.wall
}

function generateWallsInfo() {
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
            t.vector(N_TILES / 2 + SHRINE_RADIUS_TILES),
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

    return walls
}

function isWallsPointWall(p: t.Vector, walls: ReturnType<typeof generateWallsInfo>): boolean {
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

export const shrine_structure_paths = {
    Corner: [
        t.vector(3, 3),
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
        t.vector(3, 11),
        t.vector(11, 3),
    ],
    Circle: [
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

const getRandomExit = () => t.randomInt(SHRINE_SIZE_TILES - 1) * GRID_SIZE

export function generateInitMazeState(): MazeMatrix {
    const walls = generateWallsInfo()

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
        const q_vec = t.quadrand_to_vec[q],
            wall = q_vec.map(xy => (1 - xy) * SHRINE_SIZE - 1),
            exit = t.vector(getRandomExit(), getRandomExit())

        for (let x = 0; x < TILE_SIZE; x++) {
            state.get(corner.add(x + exit.x, wall.y))!.wall = false
        }
        for (let y = 0; y < TILE_SIZE; y++) {
            state.get(corner.add(wall.x, y + exit.y))!.wall = false
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
    const exitTiles = Array.from({ length: 4 }, getRandomExit)
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
            vec = vec.rotate(rotation, shrine_center).add(corner).round()
            state.get(vec)!.wall = true
        }
    }

    for (const vec of shrine_structure_paths.Circle) {
        state.get(vec.add(maze_center_origin))!.wall = true
    }

    return state
}

/**
 * Find all horizontal and vertical walls made from tiles in the matrix.
 * Returns an array of segments.
 */
export function findWallSegments(matrix: MazeMatrix): t.Segment[] {
    const wallSegments: t.Segment[] = []

    const visitPoint = (x: number, y: number, newSeg: [t.Vector?, t.Vector?]) => {
        const p = new t.Vector(x, y)
        if (matrix.get(p)!.wall === true) {
            newSeg[newSeg[0] === undefined ? 0 : 1] = p
        } else {
            if (newSeg[0] !== undefined && newSeg[1] !== undefined) {
                wallSegments.push(new t.Segment(newSeg[0]!, newSeg[1]!))
            }
            newSeg[0] = newSeg[1] = undefined
        }
    }

    const newYSeg: [t.Vector?, t.Vector?] = [undefined, undefined]
    for (let x = 0; x < matrix.width; x++) {
        for (let y = 0; y < matrix.height; y++) {
            visitPoint(x, y, newYSeg)
        }
    }

    const newXSeg: [t.Vector?, t.Vector?] = [undefined, undefined]
    for (let y = 0; y < matrix.height; y++) {
        for (let x = 0; x < matrix.width; x++) {
            visitPoint(x, y, newXSeg)
        }
    }

    return wallSegments
}

export function findVisiblePoints(game_state: GameState): Set<t.VecString> {
    const { maze_state, player, windowed, wall_segments } = game_state

    /*
        player and all wall-less tiles around him are visible
    */
    const visibleSet = new Set(
            t
                .getRing(player, 1)
                .filter(p => isVisible(maze_state, p))
                .concat(player)
                .map(p => p.toString()),
        ),
        radius = (windowed.width - 1) / 2,
        windowedPlayerVec = t.vector(radius, radius)

    /*
        check points closer to the player first
        so that we can detect gaps between visible tiles
    */
    for (let r = 2; r <= radius; r++) {
        ring: for (const wPoint of t.getRing(windowedPlayerVec, r)) {
            const p = windowed.get(wPoint)

            /*
                walls are not visible
            */
            if (!p || !isVisible(maze_state, p)) continue

            /*
                don't allow for gaps between visible tiles
                at least one neighbor must be visible
            */
            gaps: {
                /*
                    X @ X
                */
                if (p.x > player.x) {
                    if (visibleSet.has(p.add(-1, 0).toString())) break gaps
                } else if (p.x < player.x) {
                    if (visibleSet.has(p.add(1, 0).toString())) break gaps
                }

                /*
                    X
                    @
                    X
                */
                if (p.y > player.y) {
                    if (visibleSet.has(p.add(0, -1).toString())) break gaps
                } else if (p.y < player.y) {
                    if (visibleSet.has(p.add(0, 1).toString())) break gaps
                }

                /*
                    X   X
                      @
                    X   X
                */
                if (p.x > player.x && p.y > player.y) {
                    if (visibleSet.has(p.add(-1, -1).toString())) break gaps
                } else if (p.x < player.x && p.y < player.y) {
                    if (visibleSet.has(p.add(1, 1).toString())) break gaps
                } else if (p.x > player.x && p.y < player.y) {
                    if (visibleSet.has(p.add(-1, 1).toString())) break gaps
                } else if (p.x < player.x && p.y > player.y) {
                    if (visibleSet.has(p.add(1, -1).toString())) break gaps
                }

                continue
            }

            const tileSeg = t.segment(player, p)

            /*
                a tile must be within the player's round field of view
            */
            if (t.segmentLength(tileSeg) >= radius + 0.5) continue

            /*
                a tile must not have a wall segment between it and the player
            */
            for (const wallSeg of wall_segments) {
                if (t.segmentsIntersecting(tileSeg, wallSeg)) continue ring
            }

            visibleSet.add(p.toString())
        }
    }

    return visibleSet
}
