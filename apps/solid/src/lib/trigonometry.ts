import { math } from '.'

export const toRadian = (degrees: number) => (degrees * math.PI) / 180

export const toDegrees = (radians: number) => (radians * 180) / math.PI

export const enum Direction {
    Up = '^',
    Down = 'v',
    Right = '>',
    Left = '<',
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

export type Pointable = { get x(): number; get y(): number }
export type VecString = `(${number}, ${number})`

export class Vector implements Pointable {
    x: number
    y: number
    constructor(x: number, y?: number) {
        this.x = x
        this.y = y ?? x
    }
    static from(vec: Pointable) {
        return new Vector(vec.x, vec.y)
    }
    static fromStr(str: VecString) {
        const [x, y] = str.slice(1, -1).split(', ').map(Number)
        return new Vector(x, y)
    }

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
    add(x: number, y?: number): Vector
    add(vecOrX: Vector | number, y?: number): Vector {
        const [dx, dy] = typeof vecOrX === 'number' ? [vecOrX, y ?? vecOrX] : vecOrX
        return new Vector(this.x + dx, this.y + dy)
    }
    subtract(vec: Vector): Vector
    subtract(x: number, y?: number): Vector
    subtract(vecOrX: Vector | number, y?: number): Vector {
        const [dx, dy] = typeof vecOrX === 'number' ? [vecOrX, y ?? vecOrX] : vecOrX
        return new Vector(this.x - dx, this.y - dy)
    }
    multiply(vec: Vector | number): Vector {
        const [dx, dy] = typeof vec === 'number' ? [vec, vec] : vec
        return new Vector(this.x * dx, this.y * dy)
    }
    map(fn: (xy: number) => number): Vector {
        return new Vector(fn(this.x), fn(this.y))
    }
    equals(vec: Pointable) {
        return vec_equals(this, vec)
    }
    go(direction: Direction, amount = 1): Vector {
        let d = DIRECTION_TO_VECTOR[direction]
        if (amount != 1) d = d.multiply(amount)
        return this.add(d)
    }
    rotate(rad: number, center: Pointable = ZERO_VEC) {
        return rotate(this, rad, center)
    }
    round(): Vector {
        return new Vector(math.round(this.x), math.round(this.y))
    }
    flip(center: Pointable = ZERO_VEC): Vector {
        return flip_vector(this, center)
    }

    toString(): VecString {
        return `(${this.x}, ${this.y})`
    }
    toJSON() {
        return { x: this.x, y: this.y }
    }
}

export const ZERO_VEC = new Vector(0, 0)

export const vector = (x: number, y?: number) => new Vector(x, y)
export const vectorFrom = (vec: Pointable) => new Vector(vec.x, vec.y)
export const vectorFromStr = (str: VecString) => {
    const [x, y] = str.slice(1, -1).split(', ').map(Number)
    return new Vector(x, y)
}

export const rotate = (vec: Pointable, rad: number, center: Pointable = ZERO_VEC) => {
    const cos = math.cos(rad),
        sin = math.sin(rad),
        x = center.x + (vec.x - center.x) * cos - (vec.y - center.y) * sin,
        y = center.y + (vec.x - center.x) * sin + (vec.y - center.y) * cos
    return new Vector(x, y)
}

export const flip_vector = (vec: Pointable, center: Pointable = ZERO_VEC) => {
    return new Vector(center.x * 2 - vec.x, center.y * 2 - vec.y)
}

export const vec_equals = (a: Pointable, b: Pointable) =>
    math.numberEquals(a.x, b.x) && math.numberEquals(a.y, b.y)

export const vec_neighbors = (vec: Vector) => {
    return DIRECTIONS_H_V.map(d => vec.go(d))
}

export function angleBetween(a: Pointable, b: Pointable) {
    return math.atan2(b.y - a.y, b.x - a.x)
}

/**
 * Quadrants are reversed from the normal cartesian plane
 * So that the origin is in the bottom left
 */
export const enum Quadrand {
    Bottom_Left = 0,
    Bottom_Right = 1,
    Top_Right = 2,
    Top_Left = 3,
}
export const QUADRANTS = [
    Quadrand.Bottom_Left,
    Quadrand.Bottom_Right,
    Quadrand.Top_Right,
    Quadrand.Top_Left,
] as const

export const quadrand_to_vec: Record<Quadrand, Vector> = {
    [Quadrand.Top_Right]: new Vector(1, 1),
    [Quadrand.Top_Left]: new Vector(0, 1),
    [Quadrand.Bottom_Left]: new Vector(0, 0),
    [Quadrand.Bottom_Right]: new Vector(1, 0),
}

export const quadrand_to_rotation: Record<Quadrand, number> = {
    [Quadrand.Bottom_Left]: 0,
    [Quadrand.Bottom_Right]: math.PI / 2,
    [Quadrand.Top_Right]: math.PI,
    [Quadrand.Top_Left]: (3 * math.PI) / 2,
}

export const OPPOSITE_QUADRANTS: Record<Quadrand, Quadrand> = {
    [Quadrand.Bottom_Left]: Quadrand.Top_Right,
    [Quadrand.Bottom_Right]: Quadrand.Top_Left,
    [Quadrand.Top_Right]: Quadrand.Bottom_Left,
    [Quadrand.Top_Left]: Quadrand.Bottom_Right,
}

export const ADJACENT_QUADRANTS: Record<Quadrand, Quadrand[]> = {
    [Quadrand.Bottom_Left]: [Quadrand.Bottom_Right, Quadrand.Top_Left],
    [Quadrand.Bottom_Right]: [Quadrand.Bottom_Left, Quadrand.Top_Right],
    [Quadrand.Top_Right]: [Quadrand.Bottom_Right, Quadrand.Top_Left],
    [Quadrand.Top_Left]: [Quadrand.Bottom_Left, Quadrand.Top_Right],
}

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
    *points() {
        for (let x = this.x1; x <= this.x2; x++) {
            for (let y = this.y1; y <= this.y2; y++) {
                yield new Vector(x, y)
            }
        }
    }

    add(vec: Vector): Segment
    add(x: number, y?: number): Segment
    add(a: any, b?: any): Segment {
        return new Segment(this.start.add(a, b), this.end.add(a, b))
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

export const distance = (a: Pointable, b: Pointable) =>
    math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

/*
    Pythagorean theorem
    a^2 + b^2 = c^2
    a = x2 - x1
    b = y2 - y1
    c = length
    length^2 = (x2 - x1)^2 + (y2 - y1)^2
    length = sqrt((x2 - x1)^2 + (y2 - y1)^2)
*/
export const segmentLength = (seg: Segment) => distance(seg.start, seg.end)

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

    set(point: Pointable | number, value: T): void {
        if (typeof point === 'number') point = this.vec(point)
        if (!this.inBounds(point)) return
        this.#values[point.x][point.y] = value
    }
    get(point: Pointable | number): T | undefined {
        if (typeof point === 'number') point = this.vec(point)
        return this.#values[point.x]?.[point.y]
    }
    idx(point: Pointable) {
        return Matrix.i(this.width, point)
    }
    vec(i: number) {
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
        return new Vector(i % width, math.floor(math.abs(i / width)) * math.sign(i))
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

// export const move_vec_index = (width: number, i: number, x: number, y: number) => {
//     const ix = i % width,
//         iy = math.floor(math.abs(i / width)) * math.sign(i)
//     if (i % width < x || i % width >= width - x) return undefined
//     i += x + y * width
// }

export function* eachPointDirection<T>(point: Vector | number, matrix: Matrix<T>) {
    for (const dir of DIRECTION_POINTS) {
        const next = matrix.go(point, dir)
        if (next !== undefined) yield next
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

class Line {
    constructor(public a: number, public b: number, public c: number) {}

    get 0() {
        return this.a
    }
    get 1() {
        return this.b
    }
    get 2() {
        return this.c
    }
    *[Symbol.iterator]() {
        yield this.a
        yield this.b
        yield this.c
    }
}

/*
    general form: ax + by + c = 0
    slope-intercept form: y = sx + i
    -sx + y - i = 0
    normal: a = -s, b = 1, c = -i
    vertical: a = 1, b = 0, c = -x
*/
export const lineFromSegment = (seg: Segment): Line => {
    if (seg.x1 === seg.x2) {
        return new Line(1, 0, -seg.x1)
    }
    const s = (seg.y2 - seg.y1) / (seg.x2 - seg.x1)
    const i = seg.y1 - s * seg.x1
    return new Line(-s, 1, -i)
}

export function getLineX(line: Line, y: number) {
    return (-line.b * y - line.c) / line.a
}

export function getLineY(line: Line, x: number) {
    return (-line.a * x - line.c) / line.b
}

export function segmentsIntersecting(seg1: Segment, seg2: Segment): boolean {
    const [a1, b1, c1] = lineFromSegment(seg1)
    const [a2, b2, c2] = lineFromSegment(seg2)

    // check if parallel
    if (a1 === a2 && b1 === b2) {
        // check if on same line
        if (c1 === c2) {
            // check if overlapping
            return (
                math.rangesIntersecting(seg1.x1, seg1.x2, seg2.x1, seg2.x2) &&
                math.rangesIntersecting(seg1.y1, seg1.y2, seg2.y1, seg2.y2)
            )
        }
        return false
    }

    // https://www.vedantu.com/formula/point-of-intersection-formula
    const det = a1 * b2 - a2 * b1
    const x = (b1 * c2 - b2 * c1) / det
    const y = (a2 * c1 - a1 * c2) / det

    return (
        math.between(seg1.x1, x, seg1.x2) &&
        math.between(seg2.x1, x, seg2.x2) &&
        math.between(seg1.y1, y, seg1.y2) &&
        math.between(seg2.y1, y, seg2.y2)
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
