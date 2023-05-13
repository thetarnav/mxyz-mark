import transformerDirectives from '@unocss/transformer-directives'
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  transformers: [transformerDirectives()],
  theme: {
    colors: {
      primary: '#DE311B',
    },
  },
})
