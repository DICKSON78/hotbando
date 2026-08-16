import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/hotspot': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/health': 'http://localhost:3000'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
