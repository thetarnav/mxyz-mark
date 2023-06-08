import * as t from './trig'
import * as v from 'vitest'

v.expect.extend({
  toIncludeSameMembers(received, expected) {
    return {
      pass: toIncludeSameMembersPredicate(this.equals, received, expected),
      message: () => `${received} does not include the same members as ${expected}`,
    }
  },
})

type MatcherState = ThisParameterType<Parameters<typeof v.expect.extend>[0][string]>

const toIncludeSameMembersPredicate = (
  equals: MatcherState['equals'],
  actual: unknown,
  expected: unknown,
) => {
  if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) {
    return false
  }

  const remaining = expected.reduce((remaining: unknown[] | null, secondValue) => {
    if (remaining === null) return remaining

    const index = remaining.findIndex(firstValue => equals(secondValue, firstValue))

    if (index === -1) {
      return null
    }

    return remaining.slice(0, index).concat(remaining.slice(index + 1))
  }, actual)

  return !!remaining && remaining.length === 0
}

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
    [t.segment(t.point(8, 1), t.point(8, 5)), t.segment(t.point(8, 2), t.point(8, 3)), true],
    // parallel vertical not intersecting
    [t.segment(t.point(1, 5), t.point(1, 6)), t.segment(t.point(1, 1), t.point(1, 2)), false],
    // parallel horizontal
    [t.segment(t.point(1, 5), t.point(7, 5)), t.segment(t.point(0, 5), t.point(8, 5)), true],
    // parallel diagonal
    [t.segment(t.point(1, 1), t.point(4, 4)), t.segment(t.point(2, 2), t.point(3, 3)), true],
    [t.segment(t.point(1, 5), t.point(1, 7)), t.segment(t.point(2, 5), t.point(0, 6)), true],
    [t.segment(t.point(1, 5), t.point(1, 7)), t.segment(t.point(2, 2), t.point(0, 6)), false],
    // around corner
    [t.segment(t.point(1, 4), t.point(0, 5)), t.segment(t.point(1, 5), t.point(1, 6)), false],
    // tip
    [t.segment(t.point(3, 1), t.point(3, 4)), t.segment(t.point(0, 1), t.point(6, 1)), true],
  ]

  segments.forEach(([seg1, seg2, result]) => {
    v.it(`segmentsIntersecting(${seg1}, ${seg2})`, () => {
      v.expect(t.segmentsIntersecting(seg1, seg2)).toBe(result)
    })
  })
})

v.describe('getRing', () => {
  const matrix = new t.Matrix(10, 10, i => i)

  const tests: { params: Parameters<typeof t.getRing>; expected: ReturnType<typeof t.getRing> }[] =
    [
      {
        params: [matrix, t.point(5, 5), 0],
        expected: [t.point(5, 5)],
      },
      {
        params: [matrix, t.point(5, 5), 1],
        expected: [
          t.point(4, 4),
          t.point(5, 4),
          t.point(6, 4),
          t.point(4, 6),
          t.point(5, 6),
          t.point(6, 6),
          t.point(4, 5),
          t.point(6, 5),
        ],
      },
      {
        params: [matrix, t.point(5, 5), 2],
        expected: [
          t.point(3, 3),
          t.point(4, 3),
          t.point(5, 3),
          t.point(6, 3),
          t.point(7, 3),

          t.point(3, 7),
          t.point(4, 7),
          t.point(5, 7),
          t.point(6, 7),
          t.point(7, 7),

          t.point(3, 4),
          t.point(3, 5),
          t.point(3, 6),

          t.point(7, 4),
          t.point(7, 5),
          t.point(7, 6),
        ],
      },
      {
        params: [matrix, t.point(0, 0), 1],
        expected: [t.point(0, 1), t.point(1, 1), t.point(1, 0)],
      },
    ]

  tests.forEach(({ params, expected }) => {
    v.it(`getRing(${params.join(', ')})`, () => {
      v.expect(t.getRing(...params)).toIncludeSameMembers(expected)
    })
  })
})
