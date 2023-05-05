import path from 'node:path'
import { fileURLToPath } from 'node:url'
import solid from 'solid-start/vite'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [solid({ ssr: false })],
})
