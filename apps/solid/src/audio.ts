import { math } from './lib'

const STEP_AUDIO_PATHS = [
    // 'hallway_step_1.mp3',
    // 'hallway_step_2.mp3',
    'hallway_step_3.mp3',
    'hallway_step_4.mp3',
    'hallway_step_5.mp3',
    'hallway_step_6.mp3',
]

let step_in_queue = false
let step_playing_since = 0
let last_step_index = 0

export function queueStepAudio() {
    if (step_in_queue) {
        return
    }

    if (step_playing_since) {
        if (Date.now() - step_playing_since > 200) {
            step_in_queue = true
        }
        return
    }

    let path_index = math.randomInt(STEP_AUDIO_PATHS.length)
    if (path_index === last_step_index) {
        path_index = (path_index + 1) % STEP_AUDIO_PATHS.length
    }
    last_step_index = path_index
    const audio_path = STEP_AUDIO_PATHS[path_index]
    const audio = new Audio(audio_path)
    audio.volume = math.randomFromTo(0.1, 0.2)
    audio.playbackRate = math.randomFromTo(0.9, 1.1)
    audio.play()

    step_playing_since = Date.now()

    setTimeout(() => {
        step_playing_since = 0
        if (step_in_queue) {
            step_in_queue = false
            queueStepAudio()
        }
    }, 420)

    setTimeout(() => playEcho(audio), 150)
}

function playEcho(audio: HTMLAudioElement) {
    if (audio.volume < 0.01) {
        return
    }
    const echo = new Audio(audio.src)
    echo.volume = audio.volume * 0.4
    echo.playbackRate = audio.playbackRate * 0.9
    echo.play()
    setTimeout(() => playEcho(echo), 150)
}
