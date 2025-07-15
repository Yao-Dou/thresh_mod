import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const REPO_NAME = 'thresh_mod';

export default defineConfig({
    base: `/${REPO_NAME}/`,

    plugins: [
        vue()
    ],
    resolve: {
        alias: {
          '@': fileURLToPath(new URL('./src', import.meta.url)),
          vue$: 'vue/dist/vue.esm-bundler.js',
    }
  },
})