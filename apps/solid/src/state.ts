import * as t from 'src/lib/trigonometry'
import * as s from 'src/lib/signal'
import {
    BOARD_SIZE,
    WINDOW_SIZE,
    Maze_Matrix,
    Game_State,
    ALL_SHRINE_CENTERS,
    SHRINE_RADIUS_TILES,
    GRID_SIZE,
    WINDOW_RADIUS,
} from './types'

export const vecToMinimap = (vec: t.Vector) =>
    vec.map(xy => Math.round(t.mapRange(xy, 0, BOARD_SIZE - 1, 0, WINDOW_SIZE - 1)))

export const isWall = (maze_state: Maze_Matrix, p: t.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.wall)
}

export const isFlooded = (maze_state: Maze_Matrix, p: t.Vector) => {
    const state = maze_state.get(p)
    return !!(state && state.flooded)
}

export const isVisible = (maze_state: Maze_Matrix, p: t.Vector) => {
    const state = maze_state.get(p)
    return !!state && !state.wall
}

export function updateState(game_state: Game_State, player: t.Vector) {
    game_state.player = player

    game_state.windowed = t.windowedMatrix(WINDOW_SIZE, player)

    updateVisiblePoints(game_state)

    game_state.in_shrine = ALL_SHRINE_CENTERS.some(
        center => t.distance(player, center) < SHRINE_RADIUS_TILES * GRID_SIZE,
    )
}

export function expandFlood(game_state: Game_State) {
    const { maze: maze_state } = game_state

    game_state.turn++
    game_state.progress_to_flood_update += game_state.turn / 1000
    const expand_times = Math.floor(game_state.progress_to_flood_update)
    game_state.progress_to_flood_update -= expand_times

    for (let i = 0; i < expand_times; i++) {
        for (const pos_str of t.randomIterate([...game_state.shallow_flood])) {
            for (const neighbor of t.eachPointDirection(t.Vector.fromStr(pos_str), maze_state)) {
                const neighbor_state = maze_state.get(neighbor)
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
            maze_state.get(t.Vector.fromStr(pos_str))!.flooded = true
        }
    }
}

export function setAbsolutePlayerPosition(game_state: Game_State, x: unknown, y: unknown) {
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
        throw new Error('invalid input')
    }
    const vec = t.vector(x, y)
    if (!game_state.maze.inBounds(vec)) {
        throw new Error('out of bounds')
    }
    updateState(game_state, vec)
    s.trigger(game_state.turn_signal)
}

function updatePointVisibility(game_state: Game_State, p: t.Vector): boolean {
    const { maze, player, visible } = game_state

    if (!maze.inBounds(p)) return false

    const i = maze.idx(p),
        p_state = maze.get(p)!

    let is_visible = visible.get(i)
    if (is_visible !== undefined) return !p_state.wall && is_visible
    is_visible = false

    check: {
        if (game_state.show_invisible) {
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
        if (t.distance(p, player) >= WINDOW_RADIUS + 0.5) break check

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

        const seg = t.segment(player, p),
            line = t.lineFromSegment(seg)

        /*
            path from the tile to the player cannot be blocked by invisible tiles
        */
        for (let x = player.x + sx; x !== p.x; x += sx) {
            const y = t.getLineY(line, x),
                p1 = t.vector(x, Math.floor(y)),
                p2 = t.vector(x, Math.ceil(y))
            if (!updatePointVisibility(game_state, p1) && !updatePointVisibility(game_state, p2))
                break check
        }

        for (let y = player.y + sy; y !== p.y; y += sy) {
            const x = t.getLineX(line, y),
                p1 = t.vector(Math.floor(x), y),
                p2 = t.vector(Math.ceil(x), y)
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
    const { maze, player, windowed } = game_state

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

    for (const p of windowed) updatePointVisibility(game_state, windowed.get(p)!)
}
