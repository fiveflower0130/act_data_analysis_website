import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 讀取 package.json 版本號，注入為全域常數 __APP_VERSION__，供前端顯示目前 release 版本
const pkgPath = fileURLToPath(new URL('./package.json', import.meta.url))
const { version: appVersion } = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string }

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 從 .env/ 資料夾讀取環境變數（prefix '' 代表讀取所有變數，包含非 VITE_ 開頭）
  const env = loadEnv(mode, '.env', '')
  const apiTarget = env.DEV_API_TARGET ?? 'http://localhost:8001'

  return {
    envDir: '.env',
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
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
