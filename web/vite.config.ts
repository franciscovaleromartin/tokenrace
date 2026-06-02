import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:1337',
      '/v1':  'http://localhost:1337'
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false
  }
})
