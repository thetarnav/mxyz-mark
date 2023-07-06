import { STEP_INTERVAL } from './held_direction'
import { math } from './lib'

const ECHO_INTERVAL = 150

const STEP_AUDIO_PATHS = [
    // 'hallway_step_1.mp3',
    // 'hallway_step_2.mp3',
    'hallway_step_3.mp3',
    'hallway_step_4.mp3',
    'hallway_step_5.mp3',
    'hallway_step_6.mp3',
]

let step_playing = false
let last_step_path: string

export function queueStepAudio() {
    if (step_playing) return

    last_step_path = math.pickRandomExclidingOne(STEP_AUDIO_PATHS, last_step_path)
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
