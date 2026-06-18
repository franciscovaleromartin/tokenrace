import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'tokenrace',
        short_name: 'tokenrace',
        description: 'Monitor en tiempo real para Claude Code',
        theme_color: '#0b1218',
        background_color: '#0b1218',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // No cachear datos en vivo: solo precarga del shell de la app
        navigateFallbackDenylist: [/^\/api/, /^\/v1/],
        runtimeCaching: [
          {
            urlPattern: /^\/(api|v1)\//,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:1337',
      '/v1':  'http://localhost:1337'
    }
  },
  optimizeDeps: {
    include: ['@excalidraw/excalidraw'],
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false
  }
})
