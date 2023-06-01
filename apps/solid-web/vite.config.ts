import solid from 'solid-start/vite'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitest/config'
import solidStyled from 'vite-plugin-solid-styled'
// @ts-ignore
import staticAdapter from 'solid-start-static'

export default defineConfig({
  resolve: {
    alias: {
      src: '/src',
    },
  },
  plugins: [
    solid({
      adapter: staticAdapter(),
      prerenderRoutes: ['/', '/noise', '/maze', '/movement'],
    }),
    solidStyled({
      filter: {
        include: 'src/**/*.{ts,js,tsx,jsx}',
      },
    }),
    // config in ../uno.config.ts
    UnoCSS(),
  ],
})
