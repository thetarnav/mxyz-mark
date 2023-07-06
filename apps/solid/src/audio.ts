import { STEP_INTERVAL } from './held_direction'
import { math } from './lib'
import SOUNDS from '../../../data/sounds.json'

const ECHO_INTERVAL = 150

let step_playing = false
let last_step_path: string

export function queueStepAudio() {
    if (step_playing) return

    last_step_path = math.pickRandomExclidingOne(SOUNDS.step, last_step_path)
    const audio = new Audio(last_step_path)
    audio.volume = math.randomFromTo(0.1, 0.2)
    audio.playbackRate = math.randomFromTo(0.9, 1.1)
    audio.play()

    step_playing = true
    setTimeout(() => (step_playing = false), STEP_INTERVAL)

    setTimeout(() => playEcho(audio), ECHO_INTERVAL)
}

function playEcho(audio: HTMLAudioElement) {
    if (audio.volume < 0.01) return

    const echo = new Audio(audio.src)
    echo.volume = audio.volume * 0.4
    echo.play()
    setTimeout(() => playEcho(echo), ECHO_INTERVAL)
}

const ambient = new Audio(SOUNDS.ambient)
ambient.volume = 0.1

const onInteraction = () => {
    ambient.play()
}

window.addEventListener('keydown', onInteraction, { once: true })
window.addEventListener('click', onInteraction, { once: true })

ambient.addEventListener('ended', () => {
    ambient.currentTime = 0
    ambient.play()
})
