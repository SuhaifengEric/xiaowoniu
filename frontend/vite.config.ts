import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/.pnpm/recharts@') || id.includes('/node_modules/.pnpm/recharts-scale@')) return 'recharts'
          if (id.includes('/node_modules/.pnpm/victory-vendor@')) return 'charts-vendor'
          if (id.includes('/node_modules/.pnpm/d3-')) return 'd3'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
