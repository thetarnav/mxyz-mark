import { isHydrated } from '@solid-primitives/lifecycle'
import clsx from 'clsx'
import * as solid from 'solid-js'
import { A, Title } from 'solid-start'
import * as game from 'src/lib/game'
import * as s from 'src/lib/signal'
import { MatrixGrid } from 'src/lib/state'
import * as t from 'src/lib/trig'

const N_TILES = 36
const TILE_SIZE = 3
const GRID_SIZE = TILE_SIZE + 1
const BOARD_SIZE = N_TILES * GRID_SIZE - 1 // -1 for omitted last wall
const SHRINE_SIZE_TILES = 4
const SHRINE_RADIUS_TILES = 2
const SHRINE_SIZE = SHRINE_SIZE_TILES * GRID_SIZE
const WINDOW_SIZE = 15
const CENTER = t.vector(1, 1).multiply(Math.floor(BOARD_SIZE / 2))

const CORNER_SHRINE_ORIGINS = t.QUADRANTS.reduce((acc, quadrand) => {
    acc[quadrand] = t.QUADRAND_TO_VEC[quadrand].multiply(N_TILES - SHRINE_SIZE_TILES)
    return acc
}, {} as Record<t.Quadrand, t.Vector>)

const CORNER_SHRINE_CENTERS = t.QUADRANTS.reduce((acc, quadrand) => {
    const canter = CORNER_SHRINE_ORIGINS[quadrand]
        .multiply(GRID_SIZE)
        .add(t.vector(SHRINE_RADIUS_TILES, SHRINE_RADIUS_TILES).multiply(GRID_SIZE))
        .subtract(1, 1)
    acc[quadrand] = canter
    return acc
}, {} as Record<t.Quadrand, t.Vector>)

const Game = () => {
    // const tileToVec = (tile: t.Vector) => tile.multiply(GRID_SIZE).add(1, 1)

    const startingQuadrand = t.randomInt(4) as t.Quadrand
    const playerVec = s.signal(
        /*
        place player in center of a random corner quadrant
        */
        CORNER_SHRINE_CENTERS[startingQuadrand],
        // CENTER.add(1, 1),
        { equals: t.vec_equals },
    )

    const finishQuadrand = ((startingQuadrand + 2) % 4) as t.Quadrand // opposite of start
    const finishVec = CORNER_SHRINE_CENTERS[finishQuadrand]

    /*
        ignore maze generation in the shrine tiles at each corner
        and in the center shrine
    */
    const ignoredShrineTiles: t.Vector[] = []
    for (const q of t.QUADRANTS) {
        const originTile = CORNER_SHRINE_ORIGINS[q]
        for (const vec of t.segment(t.ZERO_VEC, t.vector(SHRINE_SIZE_TILES - 1)).points()) {
            ignoredShrineTiles.push(originTile.add(vec))
        }
    }
    for (const vec of t
        .segment(
            t.vector(N_TILES / 2 - SHRINE_RADIUS_TILES),
            t.vector(N_TILES / 2 + SHRINE_RADIUS_TILES),
        )
        .points()) {
        ignoredShrineTiles.push(vec)
    }

    const wallMatrix = game.mazeToGrid(
        game.generateMaze(N_TILES, N_TILES, ignoredShrineTiles),
        TILE_SIZE,
    )

    {
        const getRandomExit = () => t.randomInt(SHRINE_SIZE_TILES - 1) * GRID_SIZE

        for (const q of t.QUADRANTS) {
            /*
                Clear walls inside the corner shrines
            */
            const qVec = t.QUADRAND_TO_VEC[q]
            const corner = qVec
                .multiply(t.vector(wallMatrix.width - 1, wallMatrix.height - 1))
                .subtract(qVec.multiply(SHRINE_SIZE - 2))

            for (const vec of t.segment(t.ZERO_VEC, t.vector(SHRINE_SIZE - 2)).points()) {
                wallMatrix.set(corner.add(vec), false)
            }

            /*
                Make corner shrine exits (one on each maze-facing edge)
            */
            const wall = qVec.map(xy => (1 - xy) * SHRINE_SIZE - 1),
                exit = t.vector(getRandomExit(), getRandomExit())

            for (let x = 0; x < TILE_SIZE; x++) {
                wallMatrix.set(corner.add(x + exit.x, wall.y), false)
            }
            for (let y = 0; y < TILE_SIZE; y++) {
                wallMatrix.set(corner.add(wall.x, y + exit.y), false)
            }
        }

        /*
            Clear walls inside the center shrine
        */
        const bottomLeft = CENTER.subtract(SHRINE_RADIUS_TILES * GRID_SIZE)
        const topRight = CENTER.add(SHRINE_RADIUS_TILES * GRID_SIZE)
        for (const vec of t.segment(bottomLeft.add(1), topRight.subtract(1)).points()) {
            wallMatrix.set(vec, false)
        }
        const exitTiles = Array.from({ length: 4 }, getRandomExit)
        for (let x = 0; x < TILE_SIZE; x++) {
            wallMatrix.set({ x: bottomLeft.x + exitTiles[0] + x + 1, y: bottomLeft.y }, false)
            wallMatrix.set({ x: bottomLeft.x + exitTiles[1] + x + 1, y: topRight.y }, false)
        }
        for (let y = 0; y < TILE_SIZE; y++) {
            wallMatrix.set({ x: bottomLeft.x, y: bottomLeft.y + exitTiles[2] + y + 1 }, false)
            wallMatrix.set({ x: topRight.x, y: bottomLeft.y + exitTiles[3] + y + 1 }, false)
        }
    }

    // const wallMatrix = new t.Matrix(WALLS_W * GRID_SIZE - 1, WALLS_H * GRID_SIZE - 1, () => false)
    const wallSegments = t.findWallSegments(wallMatrix)

    const isWall = s.selector(
        s.reactive(() => wallMatrix),
        (position: t.Vector, matrix) => matrix.get(position) !== false,
    )

    if (import.meta.env.DEV) {
        ;(window as any).$tp = (x: unknown, y: unknown) => {
            if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
                throw new Error('invalid input')
            }
            if (!wallMatrix.inBounds({ x, y })) {
                throw new Error('out of bounds')
            }
            s.set(playerVec, t.vector(x, y))
        }
    }

    const floodStartQuadrand = t.remainder(
        startingQuadrand + (Math.random() > 0.5 ? 1 : -1), // corner shrine adjacent to start
        4,
    ) as t.Quadrand
    const floodSet = s.signal({
        deep: new Set<t.VecString>(),
        shallow: new Set([CORNER_SHRINE_CENTERS[floodStartQuadrand].toString()]),
    })

    game.createDirectionMovement(direction => {
        /*
            move player in direction if possible
        */
        const prevPlayerVec = playerVec.value
        const newPos = wallMatrix.go(prevPlayerVec, direction)

        if (!newPos || isWall(newPos) || floodSet.value.deep.has(newPos.toString())) return

        s.set(playerVec, newPos)

        /*
            expand flood set
        */
        s.mutate(floodSet, set => {
            const expand_times = Math.ceil((set.deep.size + 1) / ((N_TILES * N_TILES) / 2))

            for (let i = 0; i < expand_times; i++) {
                for (const pos of t.randomIterate([...set.shallow])) {
                    for (const neighbor of t.eachPointDirection(t.vectorFromStr(pos), wallMatrix)) {
                        const newStr = neighbor.toString()
                        if (
                            !isWall(neighbor) &&
                            !set.shallow.has(newStr) &&
                            !set.deep.has(newStr)
                        ) {
                            set.shallow.add(newStr)
                            return
                        }
                    }
                    set.shallow.delete(pos)
                    set.deep.add(pos)
                }
            }
        })
    })

    const allShrineCenters = [CENTER, ...Object.values(CORNER_SHRINE_CENTERS)]
    const isPlayerInShrine = s.memo(
        s.map(playerVec, player =>
            allShrineCenters.some(
                center => t.distance(player, center) < SHRINE_RADIUS_TILES * GRID_SIZE,
            ),
        ),
    )

    const windowed = s.memo(s.map(playerVec, player => t.windowedMatrix(WINDOW_SIZE, player)))

    const visible = s.memo(
        s.map(s.join([playerVec, windowed]), ([player, windowed]) =>
            game.findVisiblePoints(wallMatrix, wallSegments, windowed, player),
        ),
    )

    const vecToMinimap = (vec: t.Vector) =>
        vec.map(xy => Math.round(t.mapRange(xy, 0, BOARD_SIZE - 1, 0, WINDOW_SIZE - 1)))

    const minimapPlayer = s.memo(s.map(playerVec, vecToMinimap))
    const minimapFinish = vecToMinimap(finishVec)

    const getTileClass = (vec: t.Vector, fovIndex: number): string => {
        if (isPlayerInShrine.value) {
            const fovPoint = t.Matrix.vec(WINDOW_SIZE, fovIndex)
            if (minimapPlayer.value.equals(fovPoint)) return 'bg-primary'
            if (fovPoint.equals(minimapFinish)) return 'bg-amber'
        }

        const str = vec.toString()
        if (visible.value.has(str)) {
            if (playerVec.value.equals(vec)) return 'bg-white'
            if (floodSet.value.deep.has(str)) return 'bg-red-5'
            if (floodSet.value.shallow.has(str)) {
                for (const neighbor of t.eachPointDirection(vec, wallMatrix)) {
                    if (floodSet.value.deep.has(neighbor.toString())) return 'bg-orange-5'
                }
                return 'bg-orange'
            }
            return 'bg-stone-7'
        }

        return 'bg-transparent'
    }

    return (
        <>
            <MatrixGrid matrix={windowed.value}>
                {(vec, fovIndex) => (
                    <div
                        class={clsx(
                            'flex items-center justify-center',
                            getTileClass(vec(), fovIndex),
                        )}
                    />
                )}
            </MatrixGrid>
            <div class="fixed right-12 top-12">
                <p>{playerVec.value + ''}</p>
            </div>
        </>
    )
}

export default function Home(): solid.JSX.Element {
    return (
        <>
            <Title>mxyz mark solid</Title>
            <nav class="z-999 absolute left-4 top-4 flex flex-col">
                <div>
                    <A
                        href="/"
                        class="underline-dashed font-semibold hover:underline"
                        activeClass="text-primary"
                    >
                        mxyz mark solid
                    </A>
                </div>
                <div>
                    <A
                        href="/playground"
                        class="underline-dashed hover:underline"
                        activeClass="text-primary"
                    >
                        /playground
                    </A>
                </div>
            </nav>
            <main class="flex flex-col items-center gap-24 py-24">{isHydrated() && <Game />}</main>
        </>
    )
}
