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

const Game = () => {
    // const tileToVec = (tile: t.Vector) => tile.multiply(GRID_SIZE).add(1, 1)

    const getCornerShrineOriginTile = (quadrand: t.Quadrand) =>
        t.QUADRAND_TO_VEC[quadrand].multiply(N_TILES - SHRINE_SIZE_TILES)

    const getCornerShrineCenter = (quadrand: t.Quadrand) =>
        getCornerShrineOriginTile(quadrand)
            .multiply(GRID_SIZE)
            .add(t.vector(SHRINE_RADIUS_TILES, SHRINE_RADIUS_TILES).multiply(GRID_SIZE))
            .subtract(1, 1)

    const startingQuadrand = t.randomInt(4) as t.Quadrand
    const playerVec = s.signal(
        /*
            place player in center of a random corner quadrant
        */
        // getCornerShrineCenter(startingQuadrand),
        CENTER.add(1, 1),
        { equals: t.vec_equals },
    )
    const isPlayer = s.selector(playerVec, t.vec_equals)

    const finishQuadrand = ((startingQuadrand + 2) % 4) as t.Quadrand // opposite of start
    const finishVec = getCornerShrineCenter(finishQuadrand)

    /*
        ignore maze generation in the shrine tiles at each corner
        and in the center shrine
    */
    const ignoredShrineTiles: t.Vector[] = []
    for (const q of t.QUADRANTS) {
        const originTile = getCornerShrineOriginTile(q)
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

    game.createDirectionMovement(direction => {
        s.update(playerVec, p => {
            const newPos = wallMatrix.go(p, direction)
            return newPos && !isWall(newPos) ? newPos : p
        })
    })

    const windowed = s.map(playerVec, player => t.windowedMatrix(WINDOW_SIZE, player))

    const isVisible = s.selector(
        s.map(s.join([playerVec, windowed]), ([player, windowed]) =>
            game.findVisiblePoints(wallMatrix, wallSegments, windowed, player),
        ),
        (position: t.Vector, set) => set.has(position.toString()),
    )

    const vecToMinimap = (vec: t.Vector) =>
        vec.map(xy => Math.round(t.mapRange(xy, 0, BOARD_SIZE - 1, 0, WINDOW_SIZE - 1)))

    const minimapPlayer = s.memo(s.map(playerVec, vecToMinimap))
    const isMinimapPlayer = s.selector(minimapPlayer, t.vec_equals)

    const minimapFinish = vecToMinimap(finishVec)

    const floodSet = s.signal(new Set([CENTER.toString()]))
    const isFlooded = s.selector(floodSet, (position: t.Vector, set) =>
        set.has(position.toString()),
    )

    return (
        <>
            <MatrixGrid matrix={windowed.value}>
                {(vec, fovIndex) => {
                    const fovPoint = t.Matrix.vec(WINDOW_SIZE, fovIndex)
                    return (
                        <div
                            class={clsx(
                                'flex items-center justify-center',
                                isPlayer(vec())
                                    ? 'bg-white'
                                    : isMinimapPlayer(fovPoint)
                                    ? 'bg-primary'
                                    : fovPoint.equals(minimapFinish)
                                    ? 'bg-amber'
                                    : isFlooded(vec())
                                    ? 'bg-blue'
                                    : isVisible(vec())
                                    ? 'bg-stone-7'
                                    : 'bg-transparent',
                            )}
                        />
                    )
                }}
            </MatrixGrid>
            <div class="fixed right-12 top-12">{playerVec.value + ''}</div>
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
