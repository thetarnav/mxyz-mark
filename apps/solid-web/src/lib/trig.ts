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
export type VecString = `(${number}, ${number})`

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

  i(width: number) {
    return this.y * width + this.x
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

  toString(): VecString {
    return `(${this.x}, ${this.y})`
  }
  toJSON() {
    return { x: this.x, y: this.y }
  }
}

export const point = (x: number, y: number) => new Point(x, y)
export const pointFrom = (vec: Pointable) => new Point(vec.x, vec.y)
export const pointFromStr = (str: VecString) => {
  const [x, y] = str.slice(1, -1).split(', ').map(Number)
  return new Point(x, y)
}

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

  toJSON() {
    return { start: this.start.toJSON(), end: this.end.toJSON() }
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

  toString() {
    return `Matrix(${this.width}x${this.height})`
  }
}

/**
 * Creates a square matrix of points centered around a {@link center} point.
 * The returned points hold an absolute position in the original matrix.
 */
export function windowedMatrix(size: number, center: Point): Matrix<Point> {
  const dToCorner = (size - 1) / 2,
    dVec = center.add(-dToCorner, -dToCorner)

  return new Matrix(size, size, (x, y) => new Point(x, y).add(dVec))
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

/**
 * Returns the points in the matrix that are within the given radius of the center point.
 *
 * Ignores points that are out of bounds.
 */
export const getRing = (matrix: Matrix<unknown>, center: Point, radius: number) => {
  if (radius <= 0) return [new Point(center.x, center.y)]

  const x1 = center.x - radius,
    x2 = center.x + radius,
    y1 = center.y - radius,
    y2 = center.y + radius,
    points: Point[] = [],
    startX = Math.max(x1, 0),
    endX = Math.min(x2, matrix.width - 1),
    startY = Math.max(y1 + 1, 0),
    endY = Math.min(y2 - 1, matrix.height - 1)

  for (let x = startX; x <= endX; x++) {
    const bottom = new Point(x, y1)
    matrix.inBounds(bottom) && points.push(bottom)
    const top = new Point(x, y2)
    matrix.inBounds(top) && points.push(top)
  }
  for (let y = startY; y <= endY; y++) {
    const left = new Point(x1, y)
    matrix.inBounds(left) && points.push(left)
    const right = new Point(x2, y)
    matrix.inBounds(right) && points.push(right)
  }

  return points
}

/**
 * Find all horizontal and vertical walls made from tiles in the matrix.
 * Returns an array of segments.
 */
export function findWallSegments(matrix: Matrix<boolean>): Segment[] {
  const wallSegments: Segment[] = []

  const visitPoint = (x: number, y: number, newSeg: [Point?, Point?]) => {
    const p = new Point(x, y)
    if (matrix.get(p) === true) {
      newSeg[newSeg[0] === undefined ? 0 : 1] = p
    } else {
      if (newSeg[0] !== undefined && newSeg[1] !== undefined) {
        wallSegments.push(new Segment(newSeg[0]!, newSeg[1]!))
      }
      newSeg[0] = newSeg[1] = undefined
    }
  }

  const newYSeg: [Point?, Point?] = [undefined, undefined]
  for (let x = 0; x < matrix.width; x++) {
    for (let y = 0; y < matrix.height; y++) {
      visitPoint(x, y, newYSeg)
    }
  }

  const newXSeg: [Point?, Point?] = [undefined, undefined]
  for (let y = 0; y < matrix.height; y++) {
    for (let x = 0; x < matrix.width; x++) {
      visitPoint(x, y, newXSeg)
    }
  }

  return wallSegments
}
