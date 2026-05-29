# ACT Failure Analysis System Frontend — 待辦事項清單

> 最後更新：2026-05-29
> 分析工具：GitHub Copilot
> 說明：本文件記錄前端專案的待辦事項，依優先度分類管理，並於每次變更後同步更新狀態與修改紀錄。

---

## 🔴 P0 — 極高優先

| # | 狀態 | 問題描述 | 位置 |
|---|------|----------|------|
| 1 | ✅ | 前端技術選型確認（React 18 + TypeScript + Vite + Zustand + Ant Design + ECharts + Cytoscape.js） | 規劃階段 |
| 16 | ✅ | Windows Server 2022 Node.js 環境安裝（nvm-windows 1.2.2 + Node v22.13.1 LTS） | Server 環境 |

---

## 🟠 P1 — 高優先

| # | 狀態 | 問題描述 | 位置 |
|---|------|----------|------|
| 2 | ✅ | 專案初始化（Vite + React 18 + TypeScript scaffold + 所有依賴安裝） | 根目錄 |
| 3 | ✅ | 設計系統建立（色彩 Token、Ant Design 暗色主題、全域 CSS） | `src/styles/` |
| 17 | ✅ | Logger 模組實作（瀏覽器相容，ring buffer + sessionStorage + 下載功能） | `src/utils/logging/` |
| 18 | ⬜ | Axios client（JWT Bearer interceptor + 統一錯誤處理 + logger 整合） | `src/api/client.ts` |
| 19 | ⬜ | Zustand auth store（token 管理、user info、login/logout actions） | `src/stores/authStore.ts` |
| 20 | ⬜ | React Router v6 設定 + 路由守衛（未登入 redirect to /login） | `src/router/index.tsx` |
| 4 | ⬜ | 全域版面骨架（Navbar 64px + Left Sidebar 320px + Center content） | `src/layouts/` |
| 5 | ⬜ | 認證模組（Login 頁、JWT 流程、路由守衛整合） | `src/features/auth/` |

---

## 🟡 P2 — 中優先

| # | 狀態 | 問題描述 | 位置 |
|---|------|----------|------|
| 6 | ⬜ | 主儀表板頁（LOT 搜尋、Fail Mode 篩選） | `src/features/dashboard/` |
| 7 | ⬜ | Fail Sample List 表格元件 | `src/features/analysis/` |
| 8 | ⬜ | Fail Sample on Tray 圖表元件 | `src/features/analysis/` |
| 9 | ⬜ | Fail Die / Fail Die Rate 圖表元件 | `src/features/analysis/` |
| 10 | ⬜ | Fail Ball 圖表元件 | `src/features/analysis/` |
| 11 | ⬜ | Netlist 管理頁（上傳、列表） | `src/features/netlist/` |

---

## 🔵 P3 — 低優先

| # | 狀態 | 問題描述 | 位置 |
|---|------|----------|------|
| 12 | ⬜ | 歷史紀錄頁 | `src/features/history/` |
| 13 | ⬜ | 使用者管理頁（admin） | `src/features/users/` |
| 14 | ⬜ | 分析報告匯出功能 | `src/features/export/` |
| 15 | ⬜ | 深色 / 淺色主題切換 | `src/styles/` |

---

## 修改紀錄

| 日期 | 項目 | 變更內容 | 負責人 |
|------|------|----------|--------|
| 2026-05-29 | 全部 | 建立 to-do-list.md 初始版本 | Dante |
| 2026-05-29 | #1 | 技術選型確認：React 18 + TypeScript + Vite + Zustand + Ant Design + ECharts + Cytoscape.js | Dante |
| 2026-05-29 | #16 | 新增：Windows Server 2022 環境安裝項目（nvm-windows + Node LTS + IIS 部署規劃） | Dante |
| 2026-05-29 | #16 | ✅ 完成：nvm-windows 1.2.2 安裝，Node.js v22.13.1 LTS，PATH 設定完成 | Dante |
| 2026-05-29 | #2 | ✅ 完成：Vite scaffold（react-ts），所有 production 依賴安裝，src/ 目錄結構建立 | Dante |
| 2026-05-29 | #3 | ✅ 完成：tokens.ts、antdTheme.ts、index.css 設計系統建立，build 驗證通過 | Dante |
| 2026-05-29 | #17 | 新增並 ✅ 完成：Logger 模組（browser-compatible，ring buffer 2000 筆，sessionStorage 持久化，downloadLogs/getLogBuffer/clearLogs） | Dante |
| 2026-05-29 | #18~#20 | 新增：Axios client、Zustand auth store、React Router（待實作） | Dante |
