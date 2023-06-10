import { createEventListenerMap } from '@solid-primitives/event-listener'
import * as t from './trig'
import * as s from './signal'
import { createEffect, createSignal, untrack } from 'solid-js'

export function generateMaze(
  width: number,
  height: number,
  ignoredVectors: readonly t.Vector[] = [],
) {
  const walls = new t.Matrix(width, height, () => ({
    [t.Direction.Right]: true,
    [t.Direction.Down]: true,
  }))

  /*
    use strings instead of vectors for === comparison
  */
  const ignoredVectorsStr = ignoredVectors.map(v => v.toString()),
    ignoredVectorsSet = new Set(ignoredVectorsStr),
    stack = ignoredVectorsStr,
    directions: t.Direction[] = []

  /*
    pick a random vector to start from
    that is not in the ignored vectors
  */
  for (const i of walls) {
    const vec = walls.vec(i)
    if (ignoredVectorsSet.has(vec.toString())) continue
    stack.push(vec.toString())
    break
  }

  /*
    walks through all vectors in the maze
    and randomly removes walls

    only remove walls from neighboring vectors that
    have been visited but haven't been mutated
    this way a path is guaranteed to exist
  */
  for (let i = ignoredVectors.length; i < walls.length; i++) {
    /*
      vectors below the index - mutated vectors
      vectors above the index - unvisited vectors
    */
    const swap = t.randomIntFrom(i, stack.length),
      vecStr = stack[swap]
    let vec = t.vectorFromStr(vecStr)
    stack[swap] = stack[i]
    stack[i] = vecStr

    for (const direction of t.DIRECTIONS_H_V) {
      const neighbor = walls.go(vec, direction)
      if (!neighbor) continue

      const str = neighbor.toString()
      if (ignoredVectorsSet.has(str)) continue

      const index = stack.indexOf(str)
      if (index === -1) stack.push(str)
      else if (index < i) directions.push(direction)
    }

    if (directions.length === 0) continue

    let dir = directions[t.randomInt(directions.length)]
    if (dir === t.Direction.Up || dir === t.Direction.Left) {
      vec = walls.go(vec, dir)!
      dir = t.OPPOSITE_DIRECTION[dir]
    }
    walls.get(vec)![dir] = false
    directions.length = 0
  }

  return walls
}

export function mazeToGrid(
  maze: ReturnType<typeof generateMaze>,
  tileSize: number,
): t.Matrix<boolean> {
  const gridSize = tileSize + 1,
    width = maze.width * gridSize - 1,
    height = maze.height * gridSize - 1

  return new t.Matrix(width, height, (x, y) => {
    const p = t.vector(x, y)
    const tileP = t.vector(p.x % gridSize, p.y % gridSize)
    // tiles
    if (tileP.x < tileSize && tileP.y < tileSize) return false
    // wall joints
    if (tileP.x === tileSize && tileP.y === tileSize) return true
    // vertical walls
    if (tileP.x === tileSize) {
      const mazeP = t.vector((p.x - tileSize) / gridSize, (p.y - tileP.y) / gridSize)
      return maze.get(mazeP)![t.Direction.Right]
    }
    // horizontal walls
    const mazeP = t.vector((p.x - tileP.x) / gridSize, (p.y - tileSize) / gridSize + 1)
    return maze.get(mazeP)![t.Direction.Down]
  })
}

export const DEFAULT_HELD_DIRECTION_STATE: Record<t.Direction, boolean> = {
  [t.Direction.Up]: false,
  [t.Direction.Right]: false,
  [t.Direction.Down]: false,
  [t.Direction.Left]: false,
}

export const KEY_TO_DIRECTION: { [K in string]?: t.Direction } = {
  ArrowUp: t.Direction.Up,
  w: t.Direction.Up,
  ArrowRight: t.Direction.Right,
  d: t.Direction.Right,
  ArrowDown: t.Direction.Down,
  s: t.Direction.Down,
  ArrowLeft: t.Direction.Left,
  a: t.Direction.Left,
}

export function createHeldDirection() {
  const directions = s.signal(DEFAULT_HELD_DIRECTION_STATE)

  let lastDirection = t.Direction.Up
  createEventListenerMap(window, {
    keydown(e) {
      const direction = KEY_TO_DIRECTION[e.key]
      if (direction) {
        s.update(directions, p => ({ ...p, [(lastDirection = direction)]: true }))
        e.preventDefault()
      }
    },
    keyup(e) {
      const direction = KEY_TO_DIRECTION[e.key]
      if (direction) s.update(directions, p => ({ ...p, [direction]: false }))
    },
    blur() {
      s.set(directions, DEFAULT_HELD_DIRECTION_STATE)
    },
    contextmenu() {
      s.set(directions, DEFAULT_HELD_DIRECTION_STATE)
    },
  })

  const current = s.memo(
    s.map(directions, directions => {
      // prefer last direction
      const order =
        lastDirection === t.Direction.Up || lastDirection === t.Direction.Down
          ? t.DIRECTIONS_V_H
          : t.DIRECTIONS_H_V

      // only allow one direction at a time
      for (const direction of order) {
        if (directions[direction] && !directions[t.OPPOSITE_DIRECTION[direction]]) {
          return direction
        }
      }
    }),
  )

  return {
    current,
    directions,
  }
}

export function createThrottledTrigger(delay: number) {
  const [track, trigger] = createSignal(undefined, { equals: false })
  let timeout: ReturnType<typeof setTimeout> | undefined

  return () => {
    track()

    if (timeout) return false

    timeout = setTimeout(() => {
      timeout = undefined
      trigger()
    }, delay)

    return true
  }
}

export function createDirectionMovement(onMove: (direction: t.Direction) => void) {
  const heldDirections = createHeldDirection()

  const scheduled = createThrottledTrigger(1000 / 6)

  createEffect(() => {
    const direction = heldDirections.current.value
    if (direction && scheduled()) untrack(() => onMove(direction))
  })

  return heldDirections.directions
}

export function findVisiblePoints(
  wallMatrix: t.Matrix<boolean>,
  wallSegments: t.Segment[],
  windowedMatrix: t.Matrix<t.Vector>,
  player: t.Vector,
): Set<t.VecString> {
  /*
    player and all wall-less tiles around him are visible
  */
  const visibleSet = new Set(
      t
        .getRing(player, 1)
        .filter(p => wallMatrix.get(p) === false)
        .concat(player)
        .map(p => p.toString()),
    ),
    radius = (windowedMatrix.width - 1) / 2,
    windowedPlayerVec = t.vector(radius, radius)

  /*
    check points closer to the player first
    so that we can detect gaps between visible tiles
  */
  for (let r = 2; r <= radius; r++) {
    ring: for (const wPoint of t.getRing(windowedPlayerVec, r)) {
      const point = windowedMatrix.get(wPoint)

      /*
       walls are not visible
      */
      if (!point || wallMatrix.get(point) !== false) continue

      /*
        don't allow for gaps between visible tiles
        at least one neighbor must be visible
      */
      gaps: {
        /*
          X @ X
        */
        if (point.x > player.x) {
          if (visibleSet.has(point.add(-1, 0).toString())) break gaps
        } else if (point.x < player.x) {
          if (visibleSet.has(point.add(1, 0).toString())) break gaps
        }

        /*
          X
          @
          X
        */
        if (point.y > player.y) {
          if (visibleSet.has(point.add(0, -1).toString())) break gaps
        } else if (point.y < player.y) {
          if (visibleSet.has(point.add(0, 1).toString())) break gaps
        }

        /*
          X   X
            @
          X   X
        */
        if (point.x > player.x && point.y > player.y) {
          if (visibleSet.has(point.add(-1, -1).toString())) break gaps
        } else if (point.x < player.x && point.y < player.y) {
          if (visibleSet.has(point.add(1, 1).toString())) break gaps
        } else if (point.x > player.x && point.y < player.y) {
          if (visibleSet.has(point.add(-1, 1).toString())) break gaps
        } else if (point.x < player.x && point.y > player.y) {
          if (visibleSet.has(point.add(1, -1).toString())) break gaps
        }

        continue
      }

      const tileSeg = t.segment(player, point)

      /*
        a tile must be within the player's round field of view
      */
      if (t.segmentLength(tileSeg) >= radius + 0.5) continue

      /*
        a tile must not have a wall segment between it and the player
      */
      for (const wallSeg of wallSegments) {
        if (t.segmentsIntersecting(tileSeg, wallSeg)) continue ring
      }

      visibleSet.add(point.toString())
    }
  }

  return visibleSet
}
