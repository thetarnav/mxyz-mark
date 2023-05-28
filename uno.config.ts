import transformerDirectives from '@unocss/transformer-directives'
import { defineConfig, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno()],
  transformers: [transformerDirectives()],
  theme: {
    colors: {
      primary: '#DE311B',
      gray: {
        50: '#fafafa',
        100: '#f5f5f5',
        1: '#f5f5f5',
        200: '#e5e5e5',
        2: '#e5e5e5',
        300: '#d4d4d4',
        3: '#d4d4d4',
        400: '#a3a3a3',
        4: '#a3a3a3',
        500: '#737373',
        5: '#737373',
        600: '#525252',
        6: '#525252',
        700: '#404040',
        7: '#404040',
        800: '#262626',
        8: '#262626',
        900: '#171717',
        9: '#171717',
        950: '#0a0a0a',
      },
    },
  },
  shortcuts: {
    'center-child': 'flex items-center justify-center',
  },
})
