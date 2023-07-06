import { STEP_INTERVAL } from './held_direction'
import { math } from './lib'
import SOUNDS from '../../../data/sounds.json'

const step_ctx = new AudioContext()

const step_audio_buffers: AudioBuffer[] = []

SOUNDS.step.forEach(path =>
    fetch(path)
        .then(data => data.arrayBuffer())
        .then(arrayBuffer => step_ctx.decodeAudioData(arrayBuffer))
        .then(audioBuffer => step_audio_buffers.push(audioBuffer)),
)

function playStepAudio(
    buffer: AudioBuffer,
    last_playback_value?: number,
    last_gain_value?: number,
): void {
    const gain_value = last_gain_value ? last_gain_value * 0.4 : math.randomFromTo(0.1, 0.2)

    if (gain_value < 0.01) return

    const audio_node = step_ctx.createBufferSource()
    audio_node.buffer = buffer
    const playback_value = (audio_node.playbackRate.value =
        last_playback_value ?? math.randomFromTo(0.9, 1.1))

    const gain_node = step_ctx.createGain()
    gain_node.connect(step_ctx.destination)
    gain_node.gain.value = gain_value

    audio_node.connect(gain_node)

    audio_node.start()

    setTimeout(() => playStepAudio(buffer, playback_value, gain_value), 150)
}

let step_playing = false
let last_step: AudioBuffer

export function queueStepAudio() {
    if (step_playing || step_audio_buffers.length === 0) return

    const audio_buffer = (last_step = math.pickRandomExclidingOne(step_audio_buffers, last_step))

    playStepAudio(audio_buffer)

    step_playing = true
    setTimeout(() => (step_playing = false), STEP_INTERVAL)
}

const ambient = new Audio(SOUNDS.ambient)
ambient.volume = 0.12
ambient.loop = true

const onInteraction = () => {
    ambient.play()
    window.removeEventListener('keydown', onInteraction)
    window.removeEventListener('click', onInteraction)
}

window.addEventListener('keydown', onInteraction)
window.addEventListener('click', onInteraction)
