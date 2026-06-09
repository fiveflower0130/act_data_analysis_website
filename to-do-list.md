# ACT Failure Analysis System Frontend — 待辦事項清單

> 最後更新：2026-06-09（10:30）
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
| 18 | ✅ | Axios client（JWT Bearer interceptor + Refresh Token 主動/被動刷新 + 統一錯誤處理 + logger 整合） | `src/api/client.ts` |
| 19 | ✅ | Zustand auth store（token 管理、user info、login/logout actions） | `src/stores/authStore.ts` |
| 20 | ✅ | React Router v6 設定 + 路由守衛（未登入 redirect to /login） | `src/router/index.tsx` |
| 4 | ✅ | 全域版面骨架（Navbar 64px + Left Sidebar 320px + Center content） | `src/layouts/` |
| 5 | ✅ | 認證模組（Login 頁、JWT 流程、路由守衛整合、UI 修正） | `src/features/auth/` |
| 21 | ✅ | 建立測試環境（Vitest + Testing Library）並撰寫 auth 模組單元測試 | `tests/` |
| 22 | ✅ | 撰寫 Logger 模組單元測試 | `tests/unit/logging.test.ts` |

---

## 🟡 P2 — 中優先

| # | 狀態 | 問題描述 | 位置 |
|---|------|----------|------|
| 6 | 🔄 | 主儀表板頁（LOT 搜尋 + 歷史記錄 + Fail Mode 篩選 + 版面 1:4 佈局 + 4 個圖表佔位元件） | `src/features/dashboard/` |
| 7 | ✅ | Fail Sample List 表格元件（固定高度響應式 CSS override、統計至標題右側、showSizeChanger=false、Badge 統一綠色） | `src/features/dashboard/components/FailSampleList.tsx` |
| 24 | ✅ | ResultsPanel 分析文本實作（IO pin fail 統計、最高頻 die/ball 計算、平局全列、total_qty 型別同步） | `src/features/dashboard/components/ResultsPanel.tsx` |
| 23 | ✅ | 撰寫 Dashboard 模組單元測試（dashboardStore 15 tests + analysisHelpers 15 tests） | `tests/unit/` |
| 25 | ✅ | 響應式版面設計（tokens 斷點/排版、useResponsiveTokens hook、所有頁面套用） | `src/styles/tokens.ts`、`src/hooks/`、各功能頁 |
| 26 | ✅ | 環境變數設定（`.env/` 資料夾、`.env`/`.env.dev`，vite.config.ts `envDir`，區分正式/開發環境） | `.env/`、`vite.config.ts`、`package.json` |
| 27 | ✅ | IIS 佈署指南與 `public/web.config` SPA 路由設定 | `docs/deployment/iis-deployment.md`、`public/web.config` |
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
| 2026-06-01 | #18~#20, #4, #5 | ✅ 完成：Axios client（JWT interceptor）、authStore、React Router、MainLayout、LoginPage，build 驗證通過 | Dante |
| 2026-06-01 | #5 | ✅ 修正：LoginPage UI（移除紅色星號、加入 icon prefix）、422 錯誤（LoginRequest.user_no）、401 錯誤（ApiResponse<T> 型別修正） | Dante |
| 2026-06-01 | #21 | 新增並 ✅ 完成：Vitest 測試環境建立，25 個測試（Logger 10 + authStore 7 + LoginPage 8），全部通過 | Dante |
| 2026-06-01 | 文件 | 建立 docs/decisions/design-decisions-qa.md，補齊所有技術決策討論紀錄（框架選型、部署方式、IIS vs Nginx 等 12 個條目） | Dante |
| 2026-06-09 | #6, #7 | 🔄 開始實作 Dashboard 頁（Dante-feat-dashboard 分支）：dashboardStore、Analysis API、SearchPanel、SearchHistory、DashboardHeader、FailSampleList、PlaceholderChart、ResultsPanel、DashboardPage 全部完成，Build + 25 Tests 通過 | Dante |
| 2026-06-09 | 修正 | 修正 dashboardStore addLog 呼叫格式錯誤、authStore MOCK_USER 欄位缺漏、logging.test.ts global 型別錯誤、vite.config.ts defineConfig 來源錯誤 | Dante |
| 2026-06-03 | #7 | ✅ 完成：FailSampleList UI 細節優化（CSS 固定高度 520px、統計資訊移至 Card title right、showSizeChanger=false、SearchHistory Badge 統一綠色、版面 1:4 佈局、ResultsPanel 140px 中層） | Dante |
| 2026-06-03 | #6 | 🔄 DashboardPage 版面細節修正（ResultsPanel 移至中層、主內容 left 25% FailSampleList + right 75% 2×2 chart grid） | Dante |
| 2026-06-03 | #23 | 新增：待撰寫 Dashboard 模組單元測試 | Dante |
| 2026-06-03 | #18, #19, #5 | ✅ 完成 P1-1 + P1-2：LdapServiceError(1009) 區分；LoginResponse 加 refresh_token；authStore login/logout 同步管理 refresh_token；client.ts 全面重寫 refresh 邏輯（主動刷新 < 5 min、被動 401 retry、並發佇列保護、forceLogout）；27 Tests 通過 | Dante |
| 2026-06-06 | #24 | ✅ 完成：ResultsPanel 分析文本實作。logic：io_fail_count = ball_name 非空的 FailSampleItem 數；Sentence 1 顯示 total_qty/io_fail_count；io_fail_count>0 才顯示 Sentence 2（最高頻 die+ball，並列全列）；total_qty=0 顯示「無對應資料」；FailSampleResult 新增 total_qty 欄位；27 Tests 通過 | Dante |
| 2026-06-05 | 修正 | ✅ 修正 SearchHistory 使用已棄用的 antd List 元件 → 改用原生 div + map 實作 | Dante |
| 2026-06-05 | 修正 | ✅ 修正頁面刷新後使用者名稱消失問題：MainLayout 加 useEffect，有 token 無 user 時呼叫 restoreSession() | Dante |
| 2026-06-05 | 修正 | ✅ 修正外部機器 Network Error：vite.config.ts 加 Proxy（/api → localhost:8001），client.ts baseURL 改為空字串 | Dante |
| 2026-06-05 | #23 | ✅ 完成：新增 dashboardStore 測試（15 tests）+ analysisHelpers 測試（15 tests）；總計 57 Tests 通過 | Dante |
| 2026-06-09 | #26 | ✅ 完成：建立 `.env/` 資料夾，新增 `.env`（正式）、`.env.dev`（開發覆蓋）；更新 vite.config.ts 加 `envDir: '.env'` + `loadEnv` 讀取 DEV_API_TARGET；package.json scripts 加 `--mode dev/prod` | Dante |
| 2026-06-09 | #27 | ✅ 完成：建立 `public/web.config`（SPA 路由 + Option B 反向代理 comment）；建立 `docs/deployment/iis-deployment.md`（完整 IIS 佈署指南） | Dante |
| 2026-06-09 | 修正 | ✅ 修正 LoginPage 標題由 "ACT Data Analytics AI" → "ACT Failure Analysis System" | Dante |
| 2026-06-09 | 文件 | 更新 `.github/instructions/` 內 docs/reports → docs/records 參照；補充 project-overview 新增 docs/deployment 說明 | Dante |
