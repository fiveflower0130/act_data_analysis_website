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
      reporters: ['default', 'junit'],
      outputFile: {
        junit: './test-report/result/junit.xml',
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        reportsDirectory: './test-report/coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/main.tsx',
          'src/vite-env.d.ts',
          'src/**/*.d.ts',
          'src/types/**',
        ],
        // 僅對關鍵的 service（API client）與 model（Zustand store）/ 純函式邏輯設定覆蓋率門檻，
        // 未達標時 `npm run test:coverage` 會失敗；元件（尤其含 ECharts/Cytoscape 的圖表元件）暫不強制
        thresholds: {
          'src/api/client.ts': { statements: 85, branches: 65, functions: 75, lines: 85 },
          'src/stores/**/*.ts': { statements: 85, branches: 65, functions: 75, lines: 85 },
          'src/features/dashboard/utils/**/*.ts': { statements: 85, branches: 65, functions: 75, lines: 85 },
          'src/router/PrivateRoute.tsx': { statements: 85, branches: 65, functions: 75, lines: 85 },
        },
      },
    },
  }
})

