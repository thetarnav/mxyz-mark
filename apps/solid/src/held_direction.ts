import { solid, s, trig } from 'src/lib'
import { createEventListenerMap } from '@solid-primitives/event-listener'

export const STEP_INTERVAL = 200

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

    let last_direction = trig.Direction.Up
    let last_pointer_id: number | undefined

    function updatePointerDirections(e: trig.Pointable): void {
        const center = trig.vector(window.innerWidth / 2, window.innerHeight / 2)
        const angle = trig.angleBetween(e, center)
        const deg = trig.toDegrees(angle)
        const new_directions = { ...DEFAULT_HELD_DIRECTION_STATE }

        if (deg >= -45 && deg <= 45) {
            last_direction = trig.Direction.Left
        } else if (deg >= 45 && deg <= 135) {
            last_direction = trig.Direction.Up
        } else if (deg >= 135 || deg <= -135) {
            last_direction = trig.Direction.Right
        } else if (deg >= -135 && deg <= -45) {
            last_direction = trig.Direction.Down
        }

        new_directions[last_direction] = true
        s.set(directions, new_directions)
    }

    createEventListenerMap(window, {
        keydown(e) {
            if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return
            const direction = KEY_TO_DIRECTION[e.key]
            if (direction) {
                s.set_nested(directions, (last_direction = direction), true)
            }
        },
        keyup(e) {
            const direction = KEY_TO_DIRECTION[e.key]
            if (direction) s.set_nested(directions, direction, false)
        },
        blur() {
            s.set(directions, DEFAULT_HELD_DIRECTION_STATE)
            last_pointer_id = undefined
        },
        contextmenu() {
            s.set(directions, DEFAULT_HELD_DIRECTION_STATE)
            last_pointer_id = undefined
        },
        pointerdown(e) {
            if (last_pointer_id !== undefined) return

            let el = e.target as HTMLElement | null
            while (el) {
                if (
                    el instanceof HTMLButtonElement ||
                    el instanceof HTMLAnchorElement ||
                    el instanceof HTMLInputElement
                ) {
                    return
                }
                el = el.parentElement
            }

            last_pointer_id = e.pointerId
            updatePointerDirections(e)
        },
        pointermove(e) {
            if (last_pointer_id !== e.pointerId) return
            updatePointerDirections(e)
        },
        pointerup(e) {
            if (last_pointer_id !== e.pointerId) return
            last_pointer_id = undefined
            s.set(directions, DEFAULT_HELD_DIRECTION_STATE)
        },
        pointerleave(e) {
            if (last_pointer_id !== e.pointerId) return
            last_pointer_id = undefined
            s.set(directions, DEFAULT_HELD_DIRECTION_STATE)
        },
        pointercancel(e) {
            if (last_pointer_id !== e.pointerId) return
            last_pointer_id = undefined
            s.set(directions, DEFAULT_HELD_DIRECTION_STATE)
        },
    })

    const current = s.memo(
        s.map(directions, directions => {
            // prefer last direction
            const order =
                last_direction === trig.Direction.Up || last_direction === trig.Direction.Down
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

    const scheduled = createThrottledTrigger(STEP_INTERVAL)

    solid.createEffect(() => {
        const direction = heldDirections.current.value
        if (direction && scheduled()) solid.untrack(() => onMove(direction))
    })

    return heldDirections.directions
}
