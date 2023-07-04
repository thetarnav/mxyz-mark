import { solid, s, trig } from 'src/lib'
import { createEventListenerMap } from '@solid-primitives/event-listener'

export const DEFAULT_HELD_DIRECTION_STATE: Record<trig.Direction, boolean> = {
    [trig.Direction.Up]: false,
    [trig.Direction.Right]: false,
    [trig.Direction.Down]: false,
    [trig.Direction.Left]: false,
}

export const KEY_TO_DIRECTION: { [K in string]?: trig.Direction } = {
    ArrowUp: trig.Direction.Up,
    w: trig.Direction.Up,
    ArrowRight: trig.Direction.Right,
    d: trig.Direction.Right,
    ArrowDown: trig.Direction.Down,
    s: trig.Direction.Down,
    ArrowLeft: trig.Direction.Left,
    a: trig.Direction.Left,
}

export function createHeldDirection() {
    const directions = s.signal(DEFAULT_HELD_DIRECTION_STATE)

    let lastDirection = trig.Direction.Up
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
                lastDirection === trig.Direction.Up || lastDirection === trig.Direction.Down
                    ? trig.DIRECTIONS_V_H
                    : trig.DIRECTIONS_H_V

            // only allow one direction at a time
            for (const direction of order) {
                if (directions[direction] && !directions[trig.OPPOSITE_DIRECTION[direction]]) {
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
    const [track, trigger] = solid.createSignal(undefined, { equals: false })
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

export function createDirectionMovement(onMove: (direction: trig.Direction) => void) {
    const heldDirections = createHeldDirection()

    const scheduled = createThrottledTrigger(1000 / 6)

    solid.createEffect(() => {
        const direction = heldDirections.current.value
        if (direction && scheduled()) solid.untrack(() => onMove(direction))
    })

    return heldDirections.directions
}
