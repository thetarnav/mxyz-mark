import * as t from '../lib/trig'
import * as s from '../lib/signal'
import * as solid from 'solid-js'
import { createEventListenerMap } from '@solid-primitives/event-listener'

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

export function createDirectionMovement(onMove: (direction: t.Direction) => void) {
    const heldDirections = createHeldDirection()

    const scheduled = createThrottledTrigger(1000 / 6)

    solid.createEffect(() => {
        const direction = heldDirections.current.value
        if (direction && scheduled()) solid.untrack(() => onMove(direction))
    })

    return heldDirections.directions
}
