import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // 監聽所有網路介面，允許外部機器連線
    port: 5173,
    proxy: {
      // 將 /api 請求代理到後端（Vite Server 在 Server 本機上執行，localhost 有效）
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
})
