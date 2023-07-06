import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    publicDir: '../../data',
    server: {
        port: 3000,
    },
    resolve: {
        alias: {
            src: '/src',
        },
    },
    plugins: [
        solid(),
        // config in ../uno.config.ts
        UnoCSS(),
    ],
    test: {
        setupFiles: 'vitest.setup.ts',
    },
})
