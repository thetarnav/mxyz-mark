import { STEP_INTERVAL } from './held_direction'
import { math } from './lib'
import SOUNDS from '../../../data/sounds.json'

let audio_ctx: AudioContext | undefined

/*
    Prefetch audio files
*/
const step_array_buffers = SOUNDS.step.map(path => fetch(path).then(data => data.arrayBuffer()))
const ambient_array_buffer = fetch(SOUNDS.ambient).then(data => data.arrayBuffer())

const step_audio_buffers: AudioBuffer[] = []

function playStepAudio(
    buffer: AudioBuffer,
    last_playback_value?: number,
    last_gain_value?: number,
): void {
    if (!audio_ctx) return

    const gain_value = last_gain_value ? last_gain_value * 0.4 : math.randomFromTo(0.24, 0.35)
    const playback_value = last_playback_value ?? math.randomFromTo(0.9, 1.1)

    if (gain_value < 0.01) return

    const gain_node = audio_ctx.createGain()
    gain_node.connect(audio_ctx.destination)
    gain_node.gain.value = gain_value

    const audio_node = audio_ctx.createBufferSource()
    audio_node.buffer = buffer
    audio_node.playbackRate.value = playback_value
    audio_node.connect(gain_node)
    audio_node.start()

    setTimeout(() => {
        playStepAudio(buffer, playback_value, gain_value)
    }, 150)
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

const onInteraction = (e: KeyboardEvent | MouseEvent) => {
    if (
        e instanceof KeyboardEvent &&
        (e.key === 'Alt' || e.key === 'Control' || e.key === 'Shift' || e.key === 'Meta')
    )
        return

    const ctx = (audio_ctx = new AudioContext())

    step_array_buffers.forEach(arrayBuffer =>
        arrayBuffer
            .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
            .then(audioBuffer => step_audio_buffers.push(audioBuffer)),
    )

    ambient_array_buffer
        .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            const gain_node = ctx.createGain()
            gain_node.connect(ctx.destination)
            gain_node.gain.value = 0.22

            const audio_node = ctx.createBufferSource()
            audio_node.buffer = audioBuffer
            audio_node.loop = true
            audio_node.connect(gain_node)
            audio_node.start()
        })

    window.removeEventListener('keydown', onInteraction)
    window.removeEventListener('click', onInteraction)
}

window.addEventListener('keydown', onInteraction)
window.addEventListener('click', onInteraction)
