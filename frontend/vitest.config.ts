import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    clearMocks: true,
    maxWorkers: 4,
    minWorkers: 1,
    setupFiles: ['./src/test/setup.ts'],
  },
})
