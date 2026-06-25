import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 從 .env/ 資料夾讀取環境變數（prefix '' 代表讀取所有變數，包含非 VITE_ 開頭）
  const env = loadEnv(mode, '.env', '')
  const apiTarget = env.DEV_API_TARGET ?? 'http://localhost:8001'

  return {
    envDir: '.env',
    plugins: [react()],
    server: {
      host: '0.0.0.0',  // 監聽所有網路介面，允許外部機器連線
      port: 5173,
      proxy: {
        // 將 /api 請求代理到後端（目標從 .env/.env.dev 的 DEV_API_TARGET 讀取）
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./tests/setup.ts'],
    },
  }
})
