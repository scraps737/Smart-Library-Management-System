import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Athenaeum runs on 5180/4110 by default so it does not collide with another
// project on the usual Vite (5173) and API (4000) ports.
const API_TARGET = process.env.VITE_API_PROXY || 'http://localhost:4110'
const WEB_PORT = Number(process.env.WEB_PORT || 5180)

export default defineConfig({
  plugins: [react()],
  server: {
    port: WEB_PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
