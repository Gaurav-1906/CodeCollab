import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {}
  },
  resolve: {
    alias: {
      events: 'events',
      util: 'util'
    }
  },
  optimizeDeps: {
    include: ['simple-peer', 'events', 'util']
  }
})