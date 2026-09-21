import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['control.remontti.site', 'work.remontti.site'],
    proxy: {
      // API и статика иконок идут на бэкенд.
      // Без /uploads/* запрос бы провалился в SPA-fallback и <img> получил бы HTML вместо картинки.
      '^/api/.*': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
      '^/uploads/.*': {
        target: 'http://localhost:8082',
        changeOrigin: false,
      },
    },
  },
})
