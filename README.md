# ACT Failure Analysis System — Frontend

ACT 測試資料智慧分析平台的前端（React 19 + TypeScript + Vite）。供 ASE 5920 測試工程師（RD / PE / EE）與管理員查詢 Lot 的 Fail Sample 分析結果，並以圖表呈現 Fail Die、Fail Ball、Fail Sample on Tray 等分析視角。

詳細專案規劃、架構與決策紀錄請見 `CLAUDE.md` 與 `.github/instructions/`；開發前請先確認 `to-do-list.md`。

## 技術棧

React 19 · TypeScript 6 · Vite 8 · Zustand 5 · Ant Design 6 · ECharts 6 · Cytoscape.js · React Router 7 · Axios · Vitest 4

完整版本號與選型理由見 `.github/instructions/tech-stack.instructions.md`。

## 開發環境需求

- Node.js v22.13.1 LTS（建議以 nvm-windows 管理）
- 後端 FastAPI 服務（`D:\ACT\Failure Analysis System\Backend\`）運行於 port 8001

## 快速開始

```bash
npm install
npm run dev        # 啟動開發伺服器（Vite，proxy /api → localhost:8001）
```

## 常用指令

| 指令 | 用途 |
|------|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | TypeScript 型別檢查 + production build（輸出至 `dist/`） |
| `npm run lint` | ESLint 檢查 |
| `npm run test` | Vitest 互動模式 |
| `npm run test:run` | Vitest 單次執行 |

## 目錄結構

```
src/
├── api/        # Axios instance 與各模組 API 呼叫函式
├── components/ # 共用 UI 元件
├── features/   # 功能模組（auth / dashboard / analysis / netlist / history / users）
├── hooks/      # 共用 React Hook（響應式斷點、主題色彩）
├── layouts/    # 全域版面（Navbar、Sidebar、MainLayout）
├── router/     # React Router 設定與路由守衛
├── stores/     # Zustand 狀態管理（auth / dashboard / theme）
├── styles/     # 設計系統 Token、Ant Design 主題
├── types/      # TypeScript 型別定義
└── utils/      # 工具函式（含 logging 模組）
```

完整職責說明見 `.github/instructions/project-architecture.instructions.md`。

## 部署

正式環境部署於 IIS（Windows Server 2022 內建）+ URL Rewrite Module，完整步驟見 `docs/deployment/iis-deployment.md`。
