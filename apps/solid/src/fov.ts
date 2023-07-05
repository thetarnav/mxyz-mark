import { GameState, WINDOW_MATRIX, WINDOW_RADIUS } from './state'
import { trig } from './lib'
import { isVisible } from './state'

function updatePoint(game_state: GameState, p: trig.Vector): boolean {
    const { maze, pos, visible, dev } = game_state,
        { player } = pos

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
            (Math.abs(dx) === Math.abs(dy) && !updatePoint(game_state, p.add(-sx, -sy))) ||
            (sx !== 0 &&
                !updatePoint(game_state, p.add(-sx, 0)) &&
                sy !== 0 &&
                !updatePoint(game_state, p.add(0, -sy)))
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
            if (!updatePoint(game_state, p1) && !updatePoint(game_state, p2)) break check
        }

        for (let y = player.y + sy; y !== p.y; y += sy) {
            const x = trig.getLineX(line, y),
                p1 = trig.vector(Math.floor(x), y),
                p2 = trig.vector(Math.ceil(x), y)
            if (!updatePoint(game_state, p1) && !updatePoint(game_state, p2)) break check
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

export function updateVisiblePoints(game_state: GameState): void {
    const { maze, pos } = game_state,
        { player } = pos

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

    for (const i of WINDOW_MATRIX) updatePoint(game_state, WINDOW_MATRIX.get(i)!.add(player))
}
