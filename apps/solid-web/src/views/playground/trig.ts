export const randomInt = (max: number) => Math.floor(Math.random() * max)
export const randomIntFromTo = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min)) + min

export const enum Direction {
  Right = 'RIGHT',
  Left = 'LEFT',
  Down = 'DOWN',
  Up = 'UP',
}

export const DIRECTIONS_H_V = [
  Direction.Right,
  Direction.Left,
  Direction.Down,
  Direction.Up,
] as const
export const DIRECTIONS_V_H = [
  Direction.Down,
  Direction.Up,
  Direction.Right,
  Direction.Left,
] as const

export const OPPOSITE_DIRECTION = {
  [Direction.Right]: Direction.Left,
  [Direction.Left]: Direction.Right,
  [Direction.Down]: Direction.Up,
  [Direction.Up]: Direction.Down,
}

export function* randomIterate<T>(arr: readonly T[]) {
  const copy = arr.slice()
  while (copy.length) {
    const index = randomInt(copy.length)
    yield copy.splice(index, 1)[0]
  }
}

export type Pointable = { get x(): number; get y(): number }

export class Point implements Pointable {
  constructor(public x: number, public y: number) {}
  get 0() {
    return this.x
  }
  get 1() {
    return this.y
  }
  *[Symbol.iterator]() {
    yield this.x
    yield this.y
  }
  add(vec: Point): Point
  add(x: number, y: number): Point
  add(vecOrX: Point | number, y?: number): Point {
    const [dx, dy] = typeof vecOrX === 'number' ? [vecOrX, y!] : vecOrX
    return new Point(this.x + dx, this.y + dy)
  }
  equals(vec: Pointable) {
    return this.x === vec.x && this.y === vec.y
  }
  toString() {
    return `(${this.x}, ${this.y})`
  }
  toJSON() {
    return { x: this.x, y: this.y }
  }
}

export const point = (x: number, y: number) => new Point(x, y)

export const ZERO_POINT = new Point(0, 0)

export class Segment {
  constructor(public start: Point, public end: Point) {}
  get x1() {
    return this.start.x
  }
  get y1() {
    return this.start.y
  }
  get x2() {
    return this.end.x
  }
  get y2() {
    return this.end.y
  }

  *[Symbol.iterator]() {
    yield this.start
    yield this.end
  }

  toString() {
    return `${this.start} -> ${this.end}`
  }
}

export const segment = (start: Point, end: Point) => new Segment(start, end)

export const DIRECTION_TO_VECTOR: Record<Direction, Point> = {
  [Direction.Up]: new Point(0, 1),
  [Direction.Right]: new Point(1, 0),
  [Direction.Down]: new Point(0, -1),
  [Direction.Left]: new Point(-1, 0),
}

export const DIRECTION_TO_MOVE: Record<Direction, (width: number) => number> = {
  [Direction.Up]: width => width,
  [Direction.Right]: () => 1,
  [Direction.Down]: width => -width,
  [Direction.Left]: () => -1,
}

export const DIRECTION_POINTS = [
  new Point(1, 0),
  new Point(-1, 0),
  new Point(0, 1),
  new Point(0, -1),
] as const

export const CORNER_POINTS = [
  new Point(1, 1),
  new Point(-1, 1),
  new Point(1, -1),
  new Point(-1, -1),
] as const

export const DIRECTION_AND_CORNER_POINTS = [...DIRECTION_POINTS, ...CORNER_POINTS] as const

export class Matrix<T> {
  readonly length: number
  readonly #values: T[][]
  constructor(public width: number, public height: number, fn: (x: number, y: number) => T) {
    this.length = width * height
    this.#values = Array.from({ length: width }, (_, x) =>
      Array.from({ length: height }, (_, y) => fn(x, y)),
    )
  }

  set(point: Pointable | number, value: T) {
    if (typeof point === 'number') point = this.point(point)
    if (!this.inBounds(point)) return
    this.#values[point.x][point.y] = value
  }
  get(point: Pointable | number): T | undefined {
    if (typeof point === 'number') point = this.point(point)
    return this.inBounds(point) ? this.#values[point.x][point.y] : undefined
  }
  i(point: Pointable) {
    return Matrix.i(this.width, point)
  }
  point(i: number) {
    return Matrix.vec(this.width, i)
  }
  go(from: Point | number, by: Point | number | Direction) {
    return Matrix.go(this.width, this.height, from, by)
  }
  inBounds(vec: Pointable) {
    return Matrix.inBounds(this.width, this.height, vec)
  }

  *[Symbol.iterator]() {
    for (let i = 0; i < this.length; i++) yield i
  }

  static vec(width: number, i: number): Point {
    return new Point(i % width, Math.floor(Math.abs(i / width)) * Math.sign(i))
  }
  static i(width: number, point: Pointable) {
    return point.x + point.y * width
  }
  static go(
    width: number,
    height: number,
    from: Point | number,
    by: Point | number | Direction,
  ): Point | undefined {
    if (!(by instanceof Point))
      by = typeof by === 'number' ? this.vec(width, by) : DIRECTION_TO_VECTOR[by]
    if (!(from instanceof Point)) from = this.vec(width, from)
    const sum = from.add(by)
    return this.inBounds(width, height, sum) ? sum : undefined
  }
  static inBounds(width: number, height: number, p: Pointable) {
    return p.x >= 0 && p.x < width && p.y >= 0 && p.y < height
  }
}

export function findWallSegments(matrix: Matrix<boolean>) {
  const W = matrix.width,
    H = matrix.height

  const wallSegments: Segment[] = []

  const seen = {
    h: new Set<number>(),
    v: new Set<number>(),
  }

  for (const i of matrix) {
    const point = matrix.point(i)

    let x = point.x,
      y = point.y,
      j = i

    while (matrix.get(j) && !seen.h.has(j) && x < W) {
      seen.h.add(j)
      x++
      j++
    }
    point.x + 1 < x && wallSegments.push(new Segment(point, new Point(x - 1, point.y)))

    j = i

    while (matrix.get(j) && !seen.v.has(j) && y < H) {
      seen.v.add(j)
      y++
      j += W
    }
    point.y + 1 < y && wallSegments.push(new Segment(point, new Point(point.x, y - 1)))
  }

  return wallSegments
}

export const between = (a: number, b: number, c: number): boolean => {
  if (a > c) [a, c] = [c, a]
  return a - Number.EPSILON <= b && b <= c + Number.EPSILON
}

export const rangesIntersecting = (a1: number, b1: number, a2: number, b2: number) => {
  if (a1 > b1) [a1, b1] = [b1, a1]
  if (a2 > b2) [a2, b2] = [b2, a2]
  return a1 <= b2 && a2 <= b1
}

// general form: ax + by + c = 0
// slope-intercept form: y = sx + i
// -sx + y - i = 0
// normal: a = -s, b = 1, c = -i
// vertical: a = 1, b = 0, c = -x
export const segmentToGeneralForm = (seg: Segment): [a: number, b: number, c: number] => {
  if (seg.x1 === seg.x2) {
    return [1, 0, -seg.x1]
  }
  const s = (seg.y2 - seg.y1) / (seg.x2 - seg.x1)
  const i = seg.y1 - s * seg.x1
  return [-s, 1, -i]
}

export function segmentsIntersecting(seg1: Segment, seg2: Segment): boolean {
  const [a1, b1, c1] = segmentToGeneralForm(seg1)
  const [a2, b2, c2] = segmentToGeneralForm(seg2)

  // check if parallel
  if (a1 === a2 && b1 === b2) {
    // check if on same line
    if (c1 === c2) {
      // check if overlapping
      return (
        rangesIntersecting(seg1.x1, seg1.x2, seg2.x1, seg2.x2) &&
        rangesIntersecting(seg1.y1, seg1.y2, seg2.y1, seg2.y2)
      )
    }
    return false
  }

  // https://www.vedantu.com/formula/point-of-intersection-formula
  const det = a1 * b2 - a2 * b1
  const x = (b1 * c2 - b2 * c1) / det
  const y = (a2 * c1 - a1 * c2) / det

  return (
    between(seg1.x1, x, seg1.x2) &&
    between(seg2.x1, x, seg2.x2) &&
    between(seg1.y1, y, seg1.y2) &&
    between(seg2.y1, y, seg2.y2)
  )
}
