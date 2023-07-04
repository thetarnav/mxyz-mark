import { s, t } from 'src/lib'
import COLORS from '../../../data/colors.json'

export { COLORS }

export const N_TILES = 36
export const TILE_SIZE = 2
export const GRID_SIZE = TILE_SIZE + 1
export const OUTER_WALL_SIZE = 1
export const BOARD_SIZE = N_TILES * GRID_SIZE + OUTER_WALL_SIZE // +1 for first wall
export const WINDOW_SIZE = 19
export const WINDOW_RADIUS = Math.floor(WINDOW_SIZE / 2)

export const SHRINE_SIZE_TILES = 4
export const SHRINE_RADIUS_TILES = 2
export const SHRINE_SIZE = SHRINE_SIZE_TILES * GRID_SIZE
export const SHRINE_CENTER = t.vector(Math.floor(SHRINE_SIZE / 2 - 1))

export const MAZE_CENTER = t.vector(1, 1).multiply(Math.floor(BOARD_SIZE / 2))
export const MAZE_CENTER_ORIGIN = MAZE_CENTER.subtract(Math.floor(SHRINE_SIZE / 2 - 1))

export const corner_shrine_corners = t.quadrants.reduce((acc, quadrand) => {
    acc[quadrand] = t.quadrand_to_vec[quadrand]
        .multiply(N_TILES - SHRINE_SIZE_TILES)
        .multiply(GRID_SIZE)
        .add(1)
    return acc
}, {} as Record<t.Quadrand, t.Vector>)

export const corner_shrine_centers = t.quadrants.reduce((acc, quadrand) => {
    acc[quadrand] = corner_shrine_corners[quadrand].add(SHRINE_CENTER)
    return acc
}, {} as Record<t.Quadrand, t.Vector>)

export const ALL_SHRINE_CENTERS = [MAZE_CENTER, ...Object.values(corner_shrine_centers)]

export const N_TINTS = 4

type Enumerate<N extends number, Acc extends number[] = []> = Acc['length'] extends N
    ? Acc[number]
    : Enumerate<N, [...Acc, Acc['length']]>

export type Tint = Enumerate<typeof N_TINTS>

export type Maze_Tile_State = {
    wall: boolean
    flooded: boolean
    tint: Tint
}
export type Maze_Matrix = t.Matrix<Maze_Tile_State>

export type Game_State = {
    player: t.Vector
    start: t.Vector
    finish: t.Vector
    minimap_finish: t.Vector
    maze: Maze_Matrix
    window: t.Matrix<t.Vector>
    visible: Map<number, boolean>
    shallow_flood: Set<t.VecString>
    turn: number
    progress_to_flood_update: number
    in_shrine: boolean
    turn_signal: s.Signal<undefined>
    dev: {
        show_invisible: boolean
        hide_easing: boolean
        noclip: boolean
    }
}

export enum Tile_Display_As {
    Invisible,
    Floor,
    Wall,
    Player,
    Start,
    Finish,
    Minimap_Finish,
    Flood_Shallow,
    Flood_Deep,
}

export const DISPLAY_TILE_TO_COLOR: Record<Tile_Display_As, string> = {
    [Tile_Display_As.Invisible]: 'transparent',
    [Tile_Display_As.Floor]: COLORS.floor,
    [Tile_Display_As.Wall]: COLORS.wall,
    [Tile_Display_As.Player]: COLORS.bone,
    [Tile_Display_As.Start]: COLORS.start,
    [Tile_Display_As.Finish]: COLORS.finish,
    [Tile_Display_As.Minimap_Finish]: COLORS.finish,
    [Tile_Display_As.Flood_Shallow]: COLORS.flood_shallow,
    [Tile_Display_As.Flood_Deep]: COLORS.flood_deep,
}

export const getDisplayAsOpacity = (tile: Tile_Display_As, tint: Tint): number => {
    switch (tile) {
        case Tile_Display_As.Floor:
            return 0.2 + 0.04 * tint
        case Tile_Display_As.Wall:
        case Tile_Display_As.Flood_Shallow:
        case Tile_Display_As.Flood_Deep:
        case Tile_Display_As.Finish:
            return 0.7 + 0.05 * tint
        case Tile_Display_As.Player:
        case Tile_Display_As.Start:
        case Tile_Display_As.Minimap_Finish:
            return 1
        case Tile_Display_As.Invisible:
            return 0
    }
}
