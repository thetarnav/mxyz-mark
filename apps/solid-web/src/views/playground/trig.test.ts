import * as t from './trig'
import * as v from 'vitest'

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
