import { rmSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Berkas worker MSW (`public/mockServiceWorker.js`) hanya dipakai `npm run dev:mock`; Vite menyalin seluruh `public/`
// ke `dist/`, jadi dibuang dari build selain mode mock supaya tidak ikut ke produksi (S6E-15, IG-146).
const stripMswWorker = (mode: string): Plugin => ({
  name: 'strip-msw-worker',
  apply: 'build',
  closeBundle() {
    if (mode !== 'mock') rmSync(path.resolve(__dirname, 'dist/mockServiceWorker.js'), { force: true })
  },
})

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), stripMswWorker(mode)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/*',
      ],
    },
  },
}))
