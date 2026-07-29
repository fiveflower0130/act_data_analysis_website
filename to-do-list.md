# ACT Failure Analysis System Frontend — 待辦事項清單

> 最後更新：2026-07-21
> 分析工具：GitHub Copilot / Claude Code Fable
> 說明：本文件記錄前端專案的待辦事項，**依模組分類**（依專案實際功能領域劃分），每個模組獨立一個區塊，優先級（P0~P3）改為表格欄位而非區塊標題；模組結構比照 Backend `to-do-list.md`，模組命名盡量對齊，方便兩邊對照。

---

## 狀態說明

| 符號 | 意義 |
|------|------|
| ⬜ | 待處理 |
| 🔄 | 進行中 |
| ✅ | 已完成 |
| ❌ | 已取消／不適用 |

| 標籤 | 優先度 |
|------|--------|
| `P0` | 極高優先 |
| `P1` | 高優先 |
| `P2` | 中優先 |
| `P3` | 低優先 |

---

## 模組：認證與版面基礎 ✅ 已完成

| # | 優先級 | 狀態 | 問題描述 | 位置 |
|---|--------|------|----------|------|
| 1 | P0 | ✅ | 前端技術選型確認（React 18 + TypeScript + Vite + Zustand + Ant Design + ECharts + Cytoscape.js） | 規劃階段 |
| 2 | P1 | ✅ | 專案初始化（Vite + React 18 + TypeScript scaffold + 所有依賴安裝） | 根目錄 |
| 3 | P1 | ✅ | 設計系統建立（色彩 Token、Ant Design 暗色主題、全域 CSS） | `src/styles/` |
| 4 | P1 | ✅ | 全域版面骨架（Navbar 64px + Left Sidebar 320px + Center content） | `src/layouts/` |
| 5 | P1 | ✅ | 認證模組（Login 頁、JWT 流程、路由守衛整合、UI 修正） | `src/features/auth/` |
| 16 | P0 | ✅ | Windows Server 2022 Node.js 環境安裝（nvm-windows 1.2.2 + Node v22.13.1 LTS） | Server 環境 |
| 17 | P1 | ✅ | Logger 模組實作（瀏覽器相容，ring buffer + sessionStorage + 下載功能） | `src/utils/logging/` |
| 18 | P1 | ✅ | Axios client（JWT Bearer interceptor + Refresh Token 主動/被動刷新 + 統一錯誤處理 + logger 整合） | `src/api/client.ts` |
| 19 | P1 | ✅ | Zustand auth store（token 管理、user info、login/logout actions） | `src/stores/authStore.ts` |
| 20 | P1 | ✅ | React Router v6 設定 + 路由守衛（未登入 redirect to /login） | `src/router/index.tsx` |

---

## 模組：Dashboard 核心功能（搜尋、快取、4 圖表、Fail Sample List）✅ 已完成

| # | 優先級 | 狀態 | 問題描述 | 位置 |
|---|--------|------|----------|------|
| 6 | P2 | ✅ | 主儀表板頁（LOT 搜尋 + 歷史記錄 + Fail Mode 篩選 + 版面 1:4 佈局 + 4 個圖表元件） | `src/features/dashboard/` |
| 7 | P2 | ✅ | Fail Sample List 表格元件（固定高度響應式 CSS override、統計至標題右側、showSizeChanger=false、Badge 統一綠色） | `src/features/dashboard/components/FailSampleList.tsx` |
| 9 | P2 | ✅ | Top 1 Fail Die 疊層圖（Cytoscape.js + 節點著色）與 Fail Die Rate 直方圖（ECharts） | `src/features/dashboard/components/FailDieChart.tsx`、`FailDieRateChart.tsx` |
| 10 | P2 | ✅ | Fail Ball 圖表（ECharts 長條圖，Top 10 Ball，IO/POWER 切換） | `src/features/dashboard/components/FailBallChart.tsx` |
| 15 | P3 | ✅ | 深色 / 淺色主題切換（Navbar toggle，dark/light token 完整支援） | `src/styles/tokens.ts`、`src/stores/themeStore.ts` |
| 24 | P2 | ✅ | ResultsPanel 分析文本實作（IO pin fail 統計、最高頻 die/ball 計算、平局全列、total_qty 型別同步） | `src/features/dashboard/components/ResultsPanel.tsx` |
| 25 | P2 | ✅ | 響應式版面設計（tokens 斷點/排版、useResponsiveTokens hook、所有頁面套用） | `src/styles/tokens.ts`、`src/hooks/`、各功能頁 |
| 28 | P2 | ✅ | Fail Sample on Tray 圖表（CSS Grid 位置圖，orange/blue 著色，多頁導航，dark/light tooltip） | `src/features/dashboard/components/FailTrayChart.tsx` |

---

## 模組：測試與部署 ✅ 已完成

| # | 優先級 | 狀態 | 問題描述 | 位置 |
|---|--------|------|----------|------|
| 21 | P1 | ✅ | 建立測試環境（Vitest + Testing Library）並撰寫 auth 模組單元測試 | `tests/` |
| 22 | P1 | ✅ | 撰寫 Logger 模組單元測試 | `tests/unit/logging.test.ts` |
| 23 | P2 | ✅ | 撰寫 Dashboard 模組單元測試（dashboardStore + analysisHelpers，68 tests 通過） | `tests/unit/` |
| 26 | P2 | ✅ | 環境變數設定（`.env/` 資料夾、`.env`/`.env.dev`，vite.config.ts `envDir`，區分正式/開發環境） | `.env/`、`vite.config.ts`、`package.json` |
| 27 | P2 | ✅ | IIS 佈署指南與 `public/web.config` SPA 路由設定 | `docs/deployment/iis-deployment.md`、`public/web.config` |

---

## 模組：ACT Dashboard 移植

> 來源：`D:\ACT\ACT_dashboard_web\refactor-frontend-tasks.md`（舊系統 ASP.NET MVC 的 ACT Dashboard 篩選器 + 直方圖 + HW Bin List 移植至本系統）。全部依賴後端新增端點（Backend 尚需開發，見 Backend 專案 to-do-list.md），後端端點就緒前僅能先行開發型別與元件骨架。
>
> **API 命名說明（2026-07-08 修正）**：後端不採用 `/api/v1/act/*` 前綴（理由見 Backend `docs/decisions/ADR-014-act-dashboard-api-naming.md`），改依功能分為三個 domain：`/api/v1/filters/*`（7 層篩選器）、`/api/v1/histogram/*`、`/api/v1/hw-bin-list/*`。以下項目已同步更新端點描述。

| # | 優先級 | 狀態 | 問題描述 | 位置 |
|---|--------|------|----------|------|
| 29 | P1 | ⬜ | ACT Dashboard 型別定義：`FilterParams`、`FilterResponse`、`HistogramParams`、`HistogramRecalcParams`、`HistogramData`、`HwBinListItem`（依賴後端 `/api/v1/filters/*`、`/api/v1/histogram/*`、`/api/v1/hw-bin-list/*` 端點） | `src/types/api.ts` |
| 30 | P1 | ⬜ | ACT Dashboard API 封裝：7 個篩選器端點（`/api/v1/filters/*`）+ 2 個 Histogram 端點（`/api/v1/histogram`、`/api/v1/histogram/recalculate`）+ 1 個 HW Bin List 端點（`/api/v1/hw-bin-list`） | `src/api/act.ts` |
| 31 | P1 | ⬜ | ACT Dashboard Zustand Store：7 層篩選條件共用狀態（pageName/日期/bd/tester/lotId/waferId/testMode/testItem/site）+ 下游清空邏輯（依賴後端 `/api/v1/filters/*` 端點） | `src/stores/actStore.ts` |
| 32 | P1 | ⬜ | 7 層篩選器元件（串聯式 Select，依序 bd→tester→lotId→waferId→testMode→testItem→site，改變上層需清空下游並重新 fetch）（依賴後端 `/api/v1/filters/*` 端點） | `src/features/act/components/ActFilterPanel.tsx` |
| 33 | P1 | ⬜ | Histogram 頁面：統計資訊區（固定 Spec / New Spec 計算結果）+ ECharts 直方圖（4 條 spec 標記線）+ 重新計算模式（X Min/X Max/Bin Width）（依賴後端 `/api/v1/histogram/*` 端點） | `src/features/act/pages/HistogramPage.tsx` |
| 34 | P1 | ⬜ | HW Bin List 頁面：Ant Design Table（20 個欄位，含 Top1/2/3 Fail）+ Excel 匯出功能（需先確認選用 xlsx 或 exceljs 套件，目前專案尚未安裝任一套件；套件選型與 #12 歷史紀錄匯出共用同一份決策）（依賴後端 `/api/v1/hw-bin-list` 端點） | `src/features/act/pages/HwBinListPage.tsx` |
| 35 | P1 | ⬜ | 路由設定：新增 `/act/histogram`、`/act/hw-bin-list` 兩條路由，Sidebar 新增 ACT 分組選單項目 | `src/router/`、`src/layouts/` |
| 36 | P3 | ⬜ | 篩選條件同步至 URL Query String（`useSearchParams`），支援重整/分享連結保留查詢條件（來源：`refactor-frontend-tasks.md` 優化建議 O-F1，不影響第一版功能對等移植） | `src/features/act/` |
| 37 | P3 | ⬜ | 日期範圍快速選項（`RangePicker presets`：最近7天/30天/本月，O-F2） | `src/features/act/components/ActFilterPanel.tsx` |
| 38 | P3 | ⬜ | 篩選結果筆數預覽 Badge（需後端提供輕量 count 端點，O-F3） | `src/features/act/` |
| 39 | P3 | ⬜ | HW Bin List 虛擬滾動或後端分頁（資料量大時的效能優化，O-F4） | `src/features/act/pages/HwBinListPage.tsx` |
| 40 | P3 | ⬜ | Histogram 多圖並列比較功能（O-F5） | `src/features/act/pages/HistogramPage.tsx` |
| 41 | P3 | ⬜ | X 軸 Label 精度與旋轉優化（`toPrecision(4)` + `axisLabel.rotate: 45`，O-F6） | `src/features/act/pages/HistogramPage.tsx` |
| 42 | P3 | ⬜ | Top3 欄位改為結構化資料 `top_fails: [{item, fail_rate}]`（需配合後端調整，見 Backend O-B3，O-F7） | `src/features/act/pages/HwBinListPage.tsx` |

---

## 模組：資料上傳與歷史紀錄

| # | 優先級 | 狀態 | 問題描述 | 位置 |
|---|--------|------|----------|------|
| 11 | P2 | 🔄 | 資料上傳頁 — 範疇收斂為單純上傳功能（原規劃的歷史紀錄子功能已拆分至 #12）。版面 v2 已確認（見 design-decisions-qa.md 條目 18）：左欄上傳主題下拉＋已上傳檔案清單（依檔名搜尋＋上傳者資訊），右欄上傳區＋覆蓋警示＋佇列（全部上傳批次送出，失敗不重試）。待後端 `uploaded_by_name` 欄位到位後開始實作 | `src/features/netlist/` |
| 12 | P2 | 🔄 | 歷史紀錄頁 — 範疇擴大為登入/上傳/使用狀況三主題通用查詢頁（原規劃在 Netlist 內的上傳歷史子功能已併入本項，見 design-decisions-qa.md 條目 18）。版面 v2 已確認：左欄主題下拉＋查詢對象（全部+可複選使用者搜尋／只看自己）＋時間區間（快速選項+自訂）＋其他搜尋條件（依主題動態），右欄上表格+匯出、下統計圖表（構思中）。**待後端全新歷史紀錄查詢 API 開發**，使用狀況主題另待埋點方案討論定案（見 frontend-contract.md 第四節） | `src/features/history/` |

---

## 模組：未來規劃

| # | 優先級 | 狀態 | 問題描述 | 位置 |
|---|--------|------|----------|------|
| 13 | P3 | ⬜ | 使用者管理頁（admin） | `src/features/users/` |
| 14 | P3 | ⬜ | 分析報告匯出功能 | `src/features/export/` |

---

## 修改紀錄

> **歸檔說明**：2026-05-29 ～ 2026-06-30 期間的完整修改歷史已收錄於對應週報（`docs/records/20260529_W22.md`、`20260601_W23.md`、`20260609_W24.md`、`20260630_W27.md`），此處不再重複列出逐筆細節，僅保留週報尚未涵蓋的最新異動。

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
| 2026-06-25 | #9 | ✅ 完成：Top 1 Fail Die（Cytoscape.js 疊層節點圖）+ Fail Die Rate（ECharts 水平柱狀圖），以 stacking-die API 取得層次結構 | Dante |
| 2026-06-25 | #10 | ✅ 完成：FailBallChart（ECharts 水平柱狀圖，Top 10 Ball Name，IO/POWER 切換，暗色 tooltip） | Dante |
| 2026-06-25 | #6 | ✅ 完成：Dashboard 4 個圖表佔位元件全部替換為正式元件（Fail Die / Fail Die Rate / Fail Ball / Fail Tray） | Dante |
| 2026-06-25 | #15 | ✅ 完成：dark/light 主題切換（themeStore + Navbar toggle，所有元件套用 colorMode token） | Dante |
| 2026-06-25 | 修正 | ✅ 修正：Fail Sample List POWER variant（getFailSamplePower API，dashboardStore POWER cache） | Dante |
| 2026-06-25 | 修正 | ✅ 修正：SearchHistory 新增刪除紀錄與展開收合功能 | Dante |
| 2026-06-30 | #28 | ✅ 完成：FailTrayChart（Fail Sample on Tray，CSS Grid，orange/blue/gray 著色，多頁導航，Tray 規格 API） | Dante |
| 2026-06-30 | #28 | ✅ 修正：FailTrayChart Tooltip dark/light 主題色（color + overlayInnerStyle）；格子加邊框（border: colorMode.border）；灰色格 light mode 淡藍灰 | Dante |
| 2026-06-30 | 修正 | ✅ 統一 4 個 Dashboard 圖表卡片標題格式：Lot ID → HBinLabel（例：Short / Open） | Dante |
| 2026-06-30 | 文件 | 同步更新 to-do-list.md、W27 工作紀錄、design-decisions-qa.md、frontend-contract.md | Dante |
| 2026-07-02 | #11 | 🔄 Netlist 上傳子功能需求討論完成並確認版面線框圖，新增 design-decisions-qa.md 條目 17；發現 2 項待後端配合欄位（`uploaded_by_name`、失敗紀錄 `test_program`），已補充至 frontend-contract.md 第四節，前端待欄位到位後開始實作 | Dante |
| 2026-07-07 | 文件 | 稽核並修正文件矛盾與過期內容：修正部署方案決策矛盾（design-decisions-qa.md 條目3 補充 IIS 修正說明）、整份改寫 ui-ux-design.instructions.md 反映現況、更新 project-architecture/tech-stack 文件日期與內容、修正 frontend-contract.md 章節編號錯亂（2.7/2.8）、重寫 README.md、刪除過期錯誤日誌檔案 errpr_info.txt、CLAUDE.md 補充 docs/reports 參考列、歸檔本文件舊修改紀錄 | Dante |
| 2026-07-07 | #29~#35 | 新增：依 `D:\ACT\ACT_dashboard_web\refactor-frontend-tasks.md` 合併 ACT Dashboard 模組移植任務（型別、API、Store、篩選器、Histogram 頁、HW Bin List 頁、路由），列為 P1，依賴 Backend 新增 `/api/v1/act/*` 端點 | Dante |
| 2026-07-07 | #36~#42 | 新增：ACT Dashboard 模組移植完成後的優化建議項目（URL同步、日期快捷、筆數預覽、虛擬滾動、多圖比較、X軸精度、Top3結構化），列為 P3 | Dante |
| 2026-07-08 | #11, #12 | 🔄 與產線人員討論後，原規劃在 Netlist 頁內的「上傳＋歷史紀錄」拆為兩個獨立頁面：#11 資料上傳（範疇收斂為純上傳）、#12 歷史紀錄（範疇擴大為登入/上傳/使用狀況三主題，由 P3 移至 P2，與 #11 併排開發）。版面 v2 已確認，新增 design-decisions-qa.md 條目 18；frontend-contract.md 第四節新增 3 項待後端事項（全新歷史紀錄查詢 API、匯出方案待決、使用狀況埋點方案待設計） | Dante |
| 2026-07-08 | #29~#35 | ACT Dashboard 模組移植端點命名修正：後端不採用 `/api/v1/act/*`（見 Backend ADR-014），改為 `/api/v1/filters/*`、`/api/v1/histogram/*`、`/api/v1/hw-bin-list/*`，同步更新 #29~#34 端點描述；對應 Backend to-do-list.md 新增「資料上傳與歷史紀錄後端需求」區塊（#71~#78） | Dante (Claude Code) |
| 2026-07-10 | 文件 | 新增 design-decisions-qa.md 條目 19（Agent 開發分工原則，Frontend 側摘要，權威來源見 Backend ADR-015）；CLAUDE.md 情境參考文件表補上對應列 | Dante (Claude Code) |
| 2026-07-10 | 結構重構 | **to-do-list.md 全面改版**：從「依優先級分區塊（另外獨立出「ACT Dashboard 模組移植」P1 區塊，P3 區塊內又嵌一層子表格）」改為「依模組分類，優先級改為表格欄位」，比照 Backend 同類重構。整理出 6 個模組（認證與版面基礎／Dashboard 核心功能／測試與部署／ACT Dashboard 移植／資料上傳與歷史紀錄／未來規劃）。**所有項目編號維持不變**（原本即無 #8，非本次遺漏），純粹重新分組，未新增或刪除任何項目。同步刪除從未使用的空資料夾 `src/features/analysis/` 並清理文件引用、新增 `.claude/agents/docs-consistency-checker.md`、修正 `api-contract-structure.instructions.md` 版本標記過期問題（詳見各文件自身修改紀錄） | Dante (Claude Code) |
| 2026-07-21 | #10, #28 | 🔍 文件修正（不涉及程式碼變更）：依目前原始碼重新核對 `docs/records/20260630_W27.md`、`docs/reports/20260708_ACT-Frontend-Report.md` 兩份文件中 Fail Sample on Tray（#28）與 Fail Ball（#10）的說明。① Fail Tray：補齊 IO/POWER 切換說明與快取機制、修正 Tooltip 主題描述（實際為固定深色，非跟隨主題）、修正格子邊框描述（實際 0px，視覺分隔來自 grid gap）。② Fail Ball：新增完整 IO/POWER 快取流程圖（原僅表格四字帶過），修正誤植的 X/Y 軸對應與圖表方向描述（實際為類別軸在 X、數值軸在 Y 的長條圖，非水平柱狀圖），本表 #10 描述同步修正用詞。兩份文件的流程圖已互相同步 | Dante (Claude Code) |
