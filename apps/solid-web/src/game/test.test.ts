import * as t from 'src/lib/trig'
import * as v from 'vitest'
import { MazeMatrix, findWallSegments } from './state'

v.describe('findWallSegments', () => {
    v.test('finds all wall segments', () => {
        const WALLS = [
            [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0], // 6
            [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0], // 5
            [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0], // 4
            [0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0], // 3
            [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0], // 2
            [0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], // 1
            [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0
            /*
             0  1  2  3  4  5  6  7  8  9  10 */
        ]

        const W = WALLS[0].length
        const H = WALLS.length

        const matrix: MazeMatrix = new t.Matrix(W, H, (x, y) => ({
            wall: !!WALLS[H - 1 - y][x],
            flooded: false,
            tinted: false,
        }))

        const wallSegments = findWallSegments(matrix)

        v.expect(wallSegments).toIncludeSameMembers([
            t.segment(t.vector(1, 0), t.vector(1, 3)),
            t.segment(t.vector(1, 5), t.vector(1, 6)),
            t.segment(t.vector(1, 6), t.vector(8, 6)),
            t.segment(t.vector(6, 5), t.vector(6, 6)),
            t.segment(t.vector(1, 3), t.vector(3, 3)),
            t.segment(t.vector(3, 1), t.vector(3, 4)),
            t.segment(t.vector(3, 1), t.vector(5, 1)),
            t.segment(t.vector(5, 1), t.vector(5, 3)),
            t.segment(t.vector(7, 3), t.vector(9, 3)),
            t.segment(t.vector(7, 1), t.vector(8, 1)),
            t.segment(t.vector(8, 1), t.vector(8, 4)),
        ])
    })
})
