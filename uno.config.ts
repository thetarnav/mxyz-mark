import transformerDirectives from '@unocss/transformer-directives'
import { defineConfig, presetUno } from 'unocss'
import colors from './data/colors.json'

export default defineConfig({
    presets: [presetUno()],
    transformers: [transformerDirectives()],
    theme: {
        colors: colors,
    },
    shortcuts: {
        'center-child': 'flex items-center justify-center',
    },
})
