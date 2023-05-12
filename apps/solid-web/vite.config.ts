import solid from 'solid-start/vite'
import { defineConfig } from 'vite'
import solidStyled from 'vite-plugin-solid-styled'

export default defineConfig({
  plugins: [
    solid({ ssr: false }),
    solidStyled({
      filter: {
        include: 'src/**/*.{ts,js,tsx,jsx}',
        exclude: 'node_modules/**/*',
      },
    }),
  ],
})
