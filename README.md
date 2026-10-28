# ACT Failure Analysis System Frontend

ACT 測試資料分析平台前端（React 19 + TypeScript + Vite + Zustand + Ant Design + ECharts + Cytoscape.js）。

## 測試（Testing）

本專案使用 [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) 撰寫單元測試，測試檔案統一放在根目錄 `tests/`（`tests/unit/` 純邏輯測試、`tests/components/` 元件測試）。

| 指令 | 用途 |
|------|------|
| `npm run test` | 監看模式（watch），會持續執行全部測試並等待檔案變動 |
| `npm run test:run` | 單次執行全部測試後退出（不產報告，日常開發／CI 快速檢查用） |
| `npm run test:coverage` | 單次執行全部測試 + 產出覆蓋率報告（`test-report/coverage/index.html`，靜態頁面可直接雙擊開啟） |
| `npm run test:report` | 執行測試 + 覆蓋率 + 產出測試結果靜態報告（`test-report/result/index.html`，透過 [xunit-viewer](https://github.com/lukejpreston/xunit-viewer) 將 JUnit XML 轉為單一自包含 HTML，可直接雙擊開啟、適合截圖存檔） |

覆蓋率門檻僅設定於關鍵 service（`src/api/client.ts`）與 model／純函式邏輯（`src/stores/*`、`src/features/dashboard/utils/*`、`src/router/PrivateRoute.tsx`），未達標時 `npm run test:coverage` 會失敗；圖表元件（ECharts/Cytoscape）暫不強制測試覆蓋率，詳見 `docs/decisions/design-decisions-qa.md` 條目 17。

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
