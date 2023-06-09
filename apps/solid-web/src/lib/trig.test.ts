import * as t from './trig'
import * as v from 'vitest'

v.expect.extend({
  toIncludeSameMembers(received, expected) {
    if (!Array.isArray(received) || !Array.isArray(expected)) {
      return {
        pass: false,
        message: () => `Expected ${received} and ${expected} to be arrays`,
      }
    }

    if (received.length < expected.length) {
      const missing = expected.filter(a => !received.some(b => this.equals(a, b)))

      return {
        pass: false,
        message: () =>
          `${received}\nis shorter than\n${expected}.\nReceived: ${received.length}\nExpected: ${
            expected.length
          }\nMissing: ${missing.length && missing}`,
      }
    }

    if (received.length > expected.length) {
      const extra = received.filter(a => !expected.some(b => this.equals(b, a)))

      return {
        pass: false,
        message: () =>
          `${received}\nis longer than\n${expected}.\nReceived: ${received.length}\nExpected: ${
            expected.length
          }\nExtra: ${extra.length && extra}`,
      }
    }

    for (const secondValue of expected) {
      const index = received.findIndex(firstValue => this.equals(secondValue, firstValue))

      if (index === -1) {
        return {
          pass: false,
          message: () => `${received} does not include member ${secondValue}`,
        }
      }
    }

    return {
      pass: true,
      message: () => `${received} includes same members as ${expected}`,
    }
  },
})

interface CustomMatchers<R = unknown> {
  toIncludeSameMembers(arr: unknown[]): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

v.describe('segmentsIntersecting', () => {
  const segments: [from: t.Segment, to: t.Segment, result: boolean][] = [
    // parallel vertical
    [t.segment(t.vector(8, 1), t.vector(8, 5)), t.segment(t.vector(8, 2), t.vector(8, 3)), true],
    // parallel vertical not intersecting
    [t.segment(t.vector(1, 5), t.vector(1, 6)), t.segment(t.vector(1, 1), t.vector(1, 2)), false],
    // parallel horizontal
    [t.segment(t.vector(1, 5), t.vector(7, 5)), t.segment(t.vector(0, 5), t.vector(8, 5)), true],
    // parallel diagonal
    [t.segment(t.vector(1, 1), t.vector(4, 4)), t.segment(t.vector(2, 2), t.vector(3, 3)), true],
    [t.segment(t.vector(1, 5), t.vector(1, 7)), t.segment(t.vector(2, 5), t.vector(0, 6)), true],
    [t.segment(t.vector(1, 5), t.vector(1, 7)), t.segment(t.vector(2, 2), t.vector(0, 6)), false],
    // around corner
    [t.segment(t.vector(1, 4), t.vector(0, 5)), t.segment(t.vector(1, 5), t.vector(1, 6)), false],
    // tip
    [t.segment(t.vector(3, 1), t.vector(3, 4)), t.segment(t.vector(0, 1), t.vector(6, 1)), true],
  ]

  segments.forEach(([seg1, seg2, result]) => {
    v.it(`segmentsIntersecting(${seg1}, ${seg2})`, () => {
      v.expect(t.segmentsIntersecting(seg1, seg2)).toBe(result)
    })
  })
})

v.describe('getRing', () => {
  const tests: { params: Parameters<typeof t.getRing>; expected: ReturnType<typeof t.getRing> }[] =
    [
      {
        params: [t.vector(5, 5), 0],
        expected: [t.vector(5, 5)],
      },
      {
        params: [t.vector(5, 5), 1],
        expected: [
          t.vector(4, 4),
          t.vector(5, 4),
          t.vector(6, 4),
          t.vector(4, 6),
          t.vector(5, 6),
          t.vector(6, 6),
          t.vector(4, 5),
          t.vector(6, 5),
        ],
      },
      {
        params: [t.vector(5, 5), 2],
        expected: [
          t.vector(3, 3),
          t.vector(4, 3),
          t.vector(5, 3),
          t.vector(6, 3),
          t.vector(7, 3),

          t.vector(3, 7),
          t.vector(4, 7),
          t.vector(5, 7),
          t.vector(6, 7),
          t.vector(7, 7),

          t.vector(3, 4),
          t.vector(3, 5),
          t.vector(3, 6),

          t.vector(7, 4),
          t.vector(7, 5),
          t.vector(7, 6),
        ],
      },
    ]

  tests.forEach(({ params, expected }) => {
    v.it(`getRing(${params.join(', ')})`, () => {
      v.expect(t.getRing(...params)).toIncludeSameMembers(expected)
    })
  })
})

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

    const matrix = new t.Matrix(W, H, (x, y) => !!WALLS[H - 1 - y][x])

    const wallSegments = t.findWallSegments(matrix)

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
