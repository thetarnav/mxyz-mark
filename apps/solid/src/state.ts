import { math, s, trig } from 'src/lib'
import {
    WINDOW_SIZE,
    Maze_Matrix,
    Game_State,
    SHRINE_RADIUS_TILES,
    GRID_SIZE,
    WINDOW_RADIUS,
} from './init'

export const isWall = (maze_state: Maze_Matrix, p: trig.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.wall)
}

export const isFlooded = (maze_state: Maze_Matrix, p: trig.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.flooded)
}

export const isVisible = (maze_state: Maze_Matrix, p: trig.Vector) => {
    const state = maze_state.get(p)
    return !!state && !state.wall
}

export function updateState(state: Game_State, player: trig.Vector) {
    state.player = player

    state.window = trig.windowedMatrix(WINDOW_SIZE, player)

    updateVisiblePoints(state)

    state.in_shrine = false
    for (const vec of Object.values(state.maze_config.shrine_centers).concat(
        state.maze_config.center,
    )) {
        if (trig.distance(player, vec) < SHRINE_RADIUS_TILES * GRID_SIZE) {
            state.in_shrine = true
            break
        }
    }
}

export function expandFlood(game_state: Game_State) {
    const { maze } = game_state

    game_state.turn++
    game_state.progress_to_flood_update += game_state.turn / 1000
    const expand_times = Math.floor(game_state.progress_to_flood_update)
    game_state.progress_to_flood_update -= expand_times

    for (let i = 0; i < expand_times; i++) {
        for (const pos_str of math.randomIterate([...game_state.shallow_flood])) {
            for (const neighbor of trig.eachPointDirection(trig.Vector.fromStr(pos_str), maze)) {
                const neighbor_state = maze.get(neighbor)
                if (!neighbor_state) continue

                const neighbor_str = neighbor.toString()
                if (
                    neighbor_state.wall ||
                    neighbor_state.flooded ||
                    game_state.shallow_flood.has(neighbor_str)
                )
                    continue

                game_state.shallow_flood.add(neighbor_str)
                return
            }

            game_state.shallow_flood.delete(pos_str)
            maze.get(trig.Vector.fromStr(pos_str))!.flooded = true
        }
    }
}

export function setAbsolutePlayerPosition(game_state: Game_State, x: unknown, y: unknown) {
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
        throw new Error('invalid input')
    }
    const vec = trig.vector(x, y)
    if (!game_state.maze.inBounds(vec)) {
        throw new Error('out of bounds')
    }
    updateState(game_state, vec)
    s.trigger(game_state.turn_signal)
}

function updatePointVisibility(game_state: Game_State, p: trig.Vector): boolean {
    const { maze, player, visible, dev } = game_state

    if (!maze.inBounds(p)) return false

    const i = maze.idx(p),
        p_state = maze.get(p)!

    let is_visible = visible.get(i)
    if (is_visible !== undefined) return !p_state.wall && is_visible
    is_visible = false

    check: {
        if (dev.show_invisible) {
            is_visible = true
            break check
        }

        const dx = p.x - player.x,
            dy = p.y - player.y,
            sx = Math.sign(dx),
            sy = Math.sign(dy)

        /*
            round window corners
        */
        if (trig.distance(p, player) >= WINDOW_RADIUS + 0.5) break check

        /*
            don't allow for gaps between visible tiles
            at least one neighbor must be visible
        */
        if (
            (Math.abs(dx) === Math.abs(dy) &&
                !updatePointVisibility(game_state, p.add(-sx, -sy))) ||
            (sx !== 0 &&
                !updatePointVisibility(game_state, p.add(-sx, 0)) &&
                sy !== 0 &&
                !updatePointVisibility(game_state, p.add(0, -sy)))
        )
            break check

        const seg = trig.segment(player, p),
            line = trig.lineFromSegment(seg)

        /*
            path from the tile to the player cannot be blocked by invisible tiles
        */
        for (let x = player.x + sx; x !== p.x; x += sx) {
            const y = trig.getLineY(line, x),
                p1 = trig.vector(x, Math.floor(y)),
                p2 = trig.vector(x, Math.ceil(y))
            if (!updatePointVisibility(game_state, p1) && !updatePointVisibility(game_state, p2))
                break check
        }

        for (let y = player.y + sy; y !== p.y; y += sy) {
            const x = trig.getLineX(line, y),
                p1 = trig.vector(Math.floor(x), y),
                p2 = trig.vector(Math.ceil(x), y)
            if (!updatePointVisibility(game_state, p1) && !updatePointVisibility(game_state, p2))
                break check
        }

        is_visible = true
    }

    if (is_visible && p_state.wall) {
        visible.set(i, true)
        return false
    }

    visible.set(i, is_visible)
    return is_visible
}

export function updateVisiblePoints(game_state: Game_State): void {
    const { maze, player, window } = game_state

    /*
        player and all wall-less tiles around him are visible
    */
    game_state.visible = new Map([[maze.idx(player), true]])

    for (let x = -1; x <= 1; x += 2) {
        const p = player.add(x, 0)
        if (isVisible(maze, p)) game_state.visible.set(maze.idx(p), true)
    }
    for (let y = -1; y <= 1; y += 2) {
        const p = player.add(0, y)
        if (isVisible(maze, p)) game_state.visible.set(maze.idx(p), true)
    }

    for (const p of window) updatePointVisibility(game_state, window.get(p)!)
}
