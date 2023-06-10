export const randomInt = (max: number) => Math.floor(Math.random() * max)
export const randomIntFrom = (min: number, max: number) =>
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
} as const

export function* randomIterate<T>(arr: readonly T[]) {
  const copy = arr.slice()
  while (copy.length) {
    const index = randomInt(copy.length)
    yield copy.splice(index, 1)[0]
  }
}

export type Pointable = { get x(): number; get y(): number }
export type VecString = `(${number}, ${number})`

export class Vector implements Pointable {
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
  add(vec: Vector): Vector
  add(x: number, y: number): Vector
  add(vecOrX: Vector | number, y?: number): Vector {
    const [dx, dy] = typeof vecOrX === 'number' ? [vecOrX, y!] : vecOrX
    return new Vector(this.x + dx, this.y + dy)
  }
  subtract(vec: Vector): Vector
  subtract(x: number, y: number): Vector
  subtract(vecOrX: Vector | number, y?: number): Vector {
    const [dx, dy] = typeof vecOrX === 'number' ? [vecOrX, y!] : vecOrX
    return new Vector(this.x - dx, this.y - dy)
  }
  multiply(vec: Vector | number): Vector {
    const [dx, dy] = typeof vec === 'number' ? [vec, vec] : vec
    return new Vector(this.x * dx, this.y * dy)
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

export const vector = (x: number, y: number) => new Vector(x, y)
export const vectorFrom = (vec: Pointable) => new Vector(vec.x, vec.y)
export const vectorFromStr = (str: VecString) => {
  const [x, y] = str.slice(1, -1).split(', ').map(Number)
  return new Vector(x, y)
}

export const ZERO_VEC = new Vector(0, 0)

export class Segment {
  constructor(public start: Vector, public end: Vector) {}
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
    return [this.start.toJSON(), this.end.toJSON()]
  }
  toString() {
    return `${this.start} -> ${this.end}`
  }
}

export const segment = (start: Vector, end: Vector) => new Segment(start, end)

export const segmentVector = (seg: Segment): Vector => new Vector(seg.x2 - seg.x1, seg.y2 - seg.y1)

export function segmentLength(seg: Segment): number {
  /*
    Pythagorean theorem
    a^2 + b^2 = c^2
    a = x2 - x1
    b = y2 - y1
    c = length
    length^2 = (x2 - x1)^2 + (y2 - y1)^2
    length = sqrt((x2 - x1)^2 + (y2 - y1)^2)
  */
  return Math.sqrt((seg.x2 - seg.x1) ** 2 + (seg.y2 - seg.y1) ** 2)
}

export const DIRECTION_TO_VECTOR: Record<Direction, Vector> = {
  [Direction.Up]: new Vector(0, 1),
  [Direction.Right]: new Vector(1, 0),
  [Direction.Down]: new Vector(0, -1),
  [Direction.Left]: new Vector(-1, 0),
}

export const DIRECTION_TO_MOVE: Record<Direction, (width: number) => number> = {
  [Direction.Up]: width => width,
  [Direction.Right]: () => 1,
  [Direction.Down]: width => -width,
  [Direction.Left]: () => -1,
}

export const DIRECTION_POINTS = [
  new Vector(1, 0),
  new Vector(-1, 0),
  new Vector(0, 1),
  new Vector(0, -1),
] as const

export const CORNER_POINTS = [
  new Vector(1, 1),
  new Vector(-1, 1),
  new Vector(1, -1),
  new Vector(-1, -1),
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
  go(from: Vector | number, by: Vector | number | Direction) {
    return Matrix.go(this.width, this.height, from, by)
  }
  inBounds(vec: Pointable) {
    return Matrix.inBounds(this.width, this.height, vec)
  }

  *[Symbol.iterator]() {
    for (let i = 0; i < this.length; i++) yield i
  }

  static vec(width: number, i: number): Vector {
    return new Vector(i % width, Math.floor(Math.abs(i / width)) * Math.sign(i))
  }
  static i(width: number, point: Pointable) {
    return point.x + point.y * width
  }
  static go(
    width: number,
    height: number,
    from: Vector | number,
    by: Vector | number | Direction,
  ): Vector | undefined {
    if (!(by instanceof Vector))
      by = typeof by === 'number' ? this.vec(width, by) : DIRECTION_TO_VECTOR[by]
    if (!(from instanceof Vector)) from = this.vec(width, from)
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
export function windowedMatrix(size: number, center: Vector): Matrix<Vector> {
  const dToCorner = (size - 1) / 2,
    dVec = center.add(-dToCorner, -dToCorner)

  return new Matrix(size, size, (x, y) => new Vector(x, y).add(dVec))
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
 */
export const getRing = (center: Vector, radius: number) => {
  if (radius < 0) return []
  if (radius === 0) return [center]

  const x1 = center.x - radius,
    x2 = center.x + radius,
    y1 = center.y - radius,
    y2 = center.y + radius,
    points: Vector[] = Array(8 * radius)

  let i = 0
  for (let x = x1; x <= x2; x++) {
    points[i++] = new Vector(x, y1)
    points[i++] = new Vector(x, y2)
  }
  for (let y = y1 + 1; y <= y2 - 1; y++) {
    points[i++] = new Vector(x1, y)
    points[i++] = new Vector(x2, y)
  }

  return points
}

/**
 * Find all horizontal and vertical walls made from tiles in the matrix.
 * Returns an array of segments.
 */
export function findWallSegments(matrix: Matrix<boolean>): Segment[] {
  const wallSegments: Segment[] = []

  const visitPoint = (x: number, y: number, newSeg: [Vector?, Vector?]) => {
    const p = new Vector(x, y)
    if (matrix.get(p) === true) {
      newSeg[newSeg[0] === undefined ? 0 : 1] = p
    } else {
      if (newSeg[0] !== undefined && newSeg[1] !== undefined) {
        wallSegments.push(new Segment(newSeg[0]!, newSeg[1]!))
      }
      newSeg[0] = newSeg[1] = undefined
    }
  }

  const newYSeg: [Vector?, Vector?] = [undefined, undefined]
  for (let x = 0; x < matrix.width; x++) {
    for (let y = 0; y < matrix.height; y++) {
      visitPoint(x, y, newYSeg)
    }
  }

  const newXSeg: [Vector?, Vector?] = [undefined, undefined]
  for (let y = 0; y < matrix.height; y++) {
    for (let x = 0; x < matrix.width; x++) {
      visitPoint(x, y, newXSeg)
    }
  }

  return wallSegments
}
