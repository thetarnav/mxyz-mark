import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vitest/config'
import devtools from 'solid-devtools/vite'

export default defineConfig({
    server: {
        port: 3000,
    },
    resolve: {
        alias: {
            src: '/src',
        },
    },
    plugins: [
        devtools({
            autoname: true,
        }),
        solid(),
        // config in ../uno.config.ts
        UnoCSS(),
    ],
    test: {
        setupFiles: 'vitest.setup.ts',
    },
})
