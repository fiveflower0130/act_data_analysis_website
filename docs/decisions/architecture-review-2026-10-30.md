# 前端架構審查紀錄（2026-10-30）

- **日期**：2026-10-30
- **範圍**：Frontend `src/`（features、stores、api、types、router、components、`package.json`）。`FailDieRateChart`、`FailTrayChart` 僅掃關鍵字，未逐行審閱。
- **審查方式**：兩個審查 subagent（前端、後端各一）只讀原始碼產出報告；主 agent 逐項對照原始碼核實高嚴重度項目與命名方案，並修正過高估計的嚴重度。
- **狀態說明**：「已核實」= 主 agent 親自看過原始碼確認；「待處理」= 尚未排入或尚未修復；「修復中」= 已發包修復；「討論中」= 方案待決定。
- 對應後端紀錄：`Backend/docs/decisions/architecture-review-2026-10-30.md`

## 摘要

整體結構清楚：分層大致為 component → store → api，型別嚴謹（全專案沒有 `any`、沒有 `@ts-ignore`），token 並發刷新（`pendingQueue`）與上傳佇列處理良好。主要風險：

1. **認證生命週期不完整**：登出與 restore 失敗後 token 與持久化資料殘留，且有 Spin 卡死路徑。
2. **失效分析快取的正確性與容量**：暫時性錯誤被當成永久「無資料」並持久化；快取只增不減；無過期機制。
3. **命名與檔案邊界**：`features/dashboard` 實為失效分析，`features/netlist` 實為上傳（Netlist + Fail Sample 兩種主題）。`/` 與 `/dashboard` 重複註冊，`MainLayout.tsx:36` 的 `isDashboardActive` 也綁在此名字上。未來 ACT Dashboard 移植（Histogram、HW Bin List）必然撞名，**改名應排在 ACT Dashboard 移植之前**。

**嚴重度修正**：審查員將「登出沒呼叫後端 API」（#1）列為高。經查後端 logout 本來就是空殼（JWT stateless）、全專案沒有 token 黑名單，前端補呼叫也撤銷不了任何東西，已降為「中」。真正的問題是 refresh token 外流後 7 天無法撤銷（ADR-012 的取捨），見後端紀錄 BX1 與決策第 5 點。

ECharts 經 `echarts-for-react`，未見手動 `echarts.init` 洩漏；`FailDieChart` 的 `ResizeObserver` 有正確 `disconnect`。文件與程式脫節：指示文件寫「Fail Die 疊層圖用 Cytoscape.js」，但 `src` 內無任何 import。

## 優先修復項

| ID | 位置 | 問題 | 為什麼嚴重 | 狀態 |
|---|---|---|---|---|
| F2 | `src/stores/dashboardStore.ts:85-88`、`:239`（審查員註 76-89、111-121） | `Promise.allSettled` 把任何失敗（5xx、逾時、斷線）都存為 `null` 並寫進 localStorage | 伺服器暫時故障時查過的 Lot，之後一直顯示「無資料」，直到重新搜尋 | 修復中（2026-10-30） |
| F3 | `src/stores/dashboardStore.ts:126`（審查員註 123-126、237-246） | `searchHistory` 裁到 30 筆，但 `failSampleCache`／`failSamplePowerCache` 只增不減，整份 persist 到 localStorage | 用久了會碰到 localStorage 容量上限（約 5MB），之後寫入失敗 | 修復中（2026-10-30） |

## 全部發現清單（前端審查員 25 項）

| ID | 嚴重度 | 位置 | 問題 | 建議 | 狀態 |
|---|---|---|---|---|---|
| 1 | 中（原：高，已降級） | `api/auth.ts`（無 logout）；`authStore.ts:53-59` | 合約有 `POST /auth/logout`，前端沒有呼叫；登出只清本機，7 天 refresh token 伺服器端仍有效。後端 logout 為空殼，補呼叫無實質撤銷效果 | 補 `logout` API 並先呼叫再清本機（低成本，但實質撤銷需後端先有方案） | 已核實（嚴重度修正）；待處理 |
| 2（F2） | 高 | `dashboardStore.ts:76-89, 111-121` | `Promise.allSettled` 把任何 rejected 都當「無資料」寫入 `null` 並持久化，暫時性錯誤被當永久無資料 | 只有 404 才快取為 `null`；其他錯誤不快取並回報 `searchError` | 已核實；修復中 |
| 3（F3） | 高 | `dashboardStore.ts:123-126, 237-246` | 歷史只留 30 筆，但兩份快取不跟著裁剪，無限成長且整份 persist，終致超出配額 | 裁剪歷史時同步刪被擠出 lot 的快取；或不持久化快取；或設 LRU 上限 | 已核實；修復中 |
| 4 | 中 | `client.ts:159, 103`；`authStore.ts:37-38, 78-80` | access／refresh token 存 localStorage，XSS 可竊取；又有 `act-auth` persist 一份，兩處儲存不同步 | 長期改 httpOnly cookie；短期統一單一來源 | 待處理 |
| 5 | 中 | `authStore.ts:53-59`；`dashboardStore.ts:237`；`uploadStore.ts` | 登出不清 `dashboard-store`（歷史與快取），也不重置 `uploadStore`；共用電腦上下一位使用者看得到前一位的 Lot 查詢資料 | 登出時統一清空所有 store 與 persist；建議 app 層 `resetAll`，不讓 store 互相呼叫 | 待處理 |
| 6 | 中 | `authStore.ts:61-64`；`PrivateRoute.tsx:19-34` | `restoreSession` 在 `localStorage.access_token` 不存在時直接 return，但 `act-auth` token 仍在；`PrivateRoute`（`/upload`）因 user 為 null 永遠顯示 Spin | 沒有 access_token 時清除 store token（等同 logout） | 待處理 |
| 7 | 中 | `authStore.ts:71-74` | restore 失敗只刪 `access_token`，不刪 `refresh_token`，留下孤兒 token 且 `client.ts:210` 之後仍會嘗試使用 | 失敗時兩個 token 都清，或統一呼叫 logout | 待處理 |
| 8 | 中 | `router/index.tsx:19-23`；`PrivateRoute.tsx:36` | `/` 與 `/dashboard` 重複註冊；未授權一律導向 `/dashboard`；守衛逐一手動包裝，容易漏。（前端角色守衛為可接受前提，後端仍須驗證） | 路由表改 `meta.roles` 單一定義；`/dashboard` 做 redirect；未授權顯示 403 頁 | 待處理 |
| 9 | 中 | `uploadStore.ts:20, 365-368, 37-41` | `uploadStore` 直接 import `useDashboardStore` 並呼叫 `invalidateFailSampleCache`（store 間耦合）；又 import `features/netlist/utils`，形成 store 反向依賴 feature | 改事件／訂閱（上傳成功 callback、小型 event bus）或由頁面層組合；utils 移到 `shared/` 或 store 旁 | 待處理 |
| 10 | 中 | `FailDieChart.tsx:6, 162`；`FailDieRateChart.tsx:7, 66` | 元件直接呼叫 `getStackingDie` 繞過 store，兩圖各自 `useRef` 快取，同一 test_program 重複請求；`FailTrayChart` 則走 store（`fetchTraySpec`），三張圖作法不一致 | 疊層資料比照 Tray 放進 store（或抽 `useStackingDie` hook 加共用快取） | 已核實；待處理 |
| 11 | 中 | `FailSamplePreview.tsx:24-27, 75-100, 240-262, 109, 129` | 元件內直接 import `api/data` 下載 CSV，含 blob 下載、Content-Disposition 解析；另讀 `authStore` 判斷角色 | 下載邏輯抽 `utils/download.ts` 或 hook；權限判斷集中到 `usePermission` | 待處理 |
| 12 | 中 | `FailSamplePreview.tsx`（605 行） | 約 18 個 useState，請求／防抖／排序／站點過濾／下載／表格渲染全擠一個元件 | 拆出 `useFailSampleRows`、`SiteFilterPopover`、`RowsTable`、`downloadHelpers` | 已核實；待處理 |
| 13 | 中 | `uploadStore.ts`（544 行） | 一個 store 管三件事：上傳佇列與並行（:194-419）、Fail Sample 清單與明細快取（:439-489）、Netlist 預覽資料轉換（:506-568，含業務映射） | 拆成 `uploadQueueStore`、`failSampleImportStore`、`netlistPreviewStore`；sheet 轉換移到 `utils/` | 已核實；待處理 |
| 14 | 中 | `types/api.ts`（371 行） | 認證、使用者、netlist、fail-sample-import、analysis、舊 search 型別混在一檔；`ApiErrorCode`、`HBin` 常數（執行期值）混在 types 檔 | 依領域拆分，`types/index.ts` 統一匯出；常數放 `constants/` | 待處理 |
| 15 | 中 | `FailDieChart.tsx`（353）、`FailTrayChart.tsx`（326）、`FailDieRateChart.tsx`（254） | 每檔內含計算函式、子元件與樣式常數（如 `calcDieFailCounts`、`findTopFailDies`、`DieLayerBlock`） | 計算函式搬到 `analysisHelpers`／`utils` 並寫單元測試；子元件獨立檔案 | 待處理 |
| 16 | 中 | `uploadStore.ts:203, 475, 482-487` | `failSampleRowsCache` 以 batch+查詢條件為 key 只增不減（每 key 約 100 筆）；`netlistSheetCache` 只有手動清除 | 加筆數上限（LRU），或換頁即不快取 | 待處理 |
| 17 | 中 | `dashboardStore.ts:237-246`；`uploadStore.ts:365` | 失效分析快取持久化，只在「本機上傳」時失效；他人或 FTP 排程更新同一 Lot，使用者仍看到舊資料 | 快取加時間戳與 TTL；`selectFromHistory` 時過期則重取 | 待處理 |
| 18 | 中 | `types/api.ts:365-410`；`api/data.ts:14-18` | `searchByLotAndHbin`、`SearchResult`、`TestItemResult`、`TestResultValueItem`、`SiteSummaryInfo`、`SiteSearchResult` 未被畫面使用（`/data/search` 殘留）；`FailSampleImportDetail` 與 `getFailSampleImportDetail` 也沒被呼叫 | 無近期計畫則刪除；有計畫則標註並保留單一份 | 待處理 |
| 19 | 低 | `PlaceholderChart.tsx`；`api/auth.ts:13` `refreshToken`；`api/users.ts` `getUsers`；`types/api.ts:11` `ApiErrorDetail`、`:103` `LotSiteInfo` | 全部無 import（grep 已確認）；`refreshToken` 與 `client.ts:106` 手寫 axios.post 重複；`getUsers` 若為使用者管理預留可保留 | 刪除，或讓 `client.ts` 的 `doRefresh` 改用 `refreshToken`（以 `skipAuth` 旗標避免攔截器遞迴） | 待處理 |
| 20 | 低 | `package.json`：`cytoscape`、`@types/cytoscape` | `src` 內無 cytoscape import，為未使用依賴；`@types/cytoscape` 放在 dependencies；技術文件仍寫 Cytoscape 渲染 Fail Die（已過時） | ACT Dashboard 移植不需要就移除；需要時再加並放 devDependencies；更新過時文件 | 已核實；待處理 |
| 21 | 低 | `uploadStore.ts:532, 538, 544` | 三處 `as unknown as NetlistSheetRow[]` 繞過型別檢查（全專案唯一繞路） | 為各 sheet 定義 row 型別，或讓 `NetlistSheetPayload` 做 discriminated union／泛型 | 待處理 |
| 22 | 低 | `uploadStore.ts:118-122, 135-148, 368` | `getStatusCode` 手寫判斷，`client.ts` 已有 `isRecord` 等工具未共用；`hbin as HBinValue 或 undefined` 為不安全強轉（hbin 可能不是 2–5） | `getStatusCode` 併入 `client.ts`；強轉前驗證數值範圍 | 待處理 |
| 23 | 低 | `FailDieChart.tsx:57, 173-179` | 解構 `totalLayers: _totalLayers` 未使用；只在 `currentLotId` 為空時才重置 layers，換 Lot 不重置；`.catch` 後 `lastFetchedProgram` 已設值，失敗後同 program 不重試；無取消／競態保護，快速切換 Lot 舊回應可能覆蓋新資料 | 移除無用參數；請求加 cancelled／requestId 保護（`NetlistPreview.tsx:107-122` 有做法可參考）；失敗時重設 ref | 待處理 |
| 24 | 低 | `dashboardStore.ts:227-229` | `fetchTraySpec` 失敗只寫 log，使用者看不到訊息，圖表可能長時間停在載入／空白；無失敗狀態快取，每次渲染可能重打 | 記錄錯誤狀態並讓元件顯示重試 | 待處理 |
| 25 | 低 | `client.ts:91`；`FailSamplePreview.tsx:61` | `getTokenExpiryMs` 用 `atob` 解析 JWT，base64url 的 `-`／`_` 會解析失敗回傳 null，主動刷新被靜默跳過；檔內殘留被註解掉的 `formatDate` | `atob` 前先把 base64url 轉 base64；清掉註解掉的程式碼 | 待處理 |

## 命名重構方案（討論中）

| 現況 | 建議 | 狀態 |
|---|---|---|
| `features/dashboard/DashboardPage` | `features/failure-analysis/FailureAnalysisPage` | 討論中 |
| `dashboard/components/DashboardHeader` | `failure-analysis/components/AnalysisHeader` | 討論中 |
| `dashboard/components/Fail*Chart, ResultsPanel…` | `failure-analysis/components/charts/{FailDieChart,…}` | 討論中 |
| `dashboard/components/SearchPanel、SearchHistory` | `failure-analysis/components/search/` | 討論中 |
| `dashboard/components/PlaceholderChart`（死碼） | 刪除 | 討論中 |
| `dashboard/utils/analysisHelpers` | `failure-analysis/utils/` | 討論中 |
| `features/netlist/NetlistUploadPage` | `features/data-upload/DataUploadPage` | 討論中 |
| `netlist/components/Upload*` | `data-upload/components/` | 討論中 |
| `netlist/components/NetlistPreview` | `data-upload/netlist/NetlistPreview` | 討論中 |
| `netlist/components/FailSamplePreview` | `data-upload/fail-sample/{FailSamplePreview, SiteFilter, RowsTable, useFailSampleRows}` | 討論中 |
| （無） | `features/act-dashboard/`（未來 Histogram + HW Bin List）、`features/history/`、`features/users/` | 討論中 |
| `stores/dashboardStore` | `stores/failureAnalysisStore` | 討論中 |
| `stores/uploadStore`（544 行） | `features/data-upload/store/{uploadQueueStore, netlistStore, failSampleImportStore}` | 討論中 |
| `api/data.ts` | `api/failSampleImport.ts` | 討論中 |
| `api/analysis.ts`、`api/netlist.ts` | 保留（analysis 可選 `failSampleAnalysis.ts`） | 討論中 |
| `types/api.ts`（371 行） | `types/{common, auth, user, netlist, failSampleImport, analysis}.ts` | 討論中 |
| 路由 `/`、`/dashboard`、`/upload` | `/`（導向 `/analysis`）、`/analysis`、`/upload`（或 `/data-upload`）、`/act-dashboard`、`/history`、`/admin/users`；舊路徑保留 redirect | 討論中 |

資料夾命名風格尚未統一：使用者提議 `failure`、`fileUpload`；審查員提議 `failure-analysis`、`data-upload`；現行規範為「feature 資料夾全小寫、單數」，`fileUpload`（駝峰）與 `failure-analysis`（連字號）都不符。主 agent 傾向 kebab-case（`failure-analysis/`、`data-upload/`、`act-dashboard/`），待另立規範（決策第 4 點）。前端路由可自由改，但 `/api/...` 對外 URL 一律不動。

## 跨端 / 共同事項

詳見 `Backend/docs/decisions/architecture-review-2026-10-30.md`。

- 登出與 refresh token 撤銷：後端 logout 空殼，需先決定撤銷方案，再決定前端是否補 `logout` 呼叫。
- 快取一致性：前端 F2/F3/#17 與後端 B2（Netlist 重傳快取失效）需一併考量。
- `api/data.ts` 對應後端 fail-sample-import 路徑，URL 凍結，前端改名只動內部檔名。
- 後端命名改採業務領域命名並另立 ADR；前端另立資料夾命名規範，兩端命名應互相對照（例如 failure-analysis 對 fail_analysis）。

## 決策紀錄（使用者，2026-10-30）

1. 先修 6 項（B1–B4、F2–F3），再做命名重構。
2. 對外 URL 不改，除非確有必要且對內外都有益。
3. 後端改為業務領域命名，需想清楚並統一、避免再改，將另立 ADR。
4. 前端資料夾命名風格需統一規範，將另立規範。
5. refresh token 撤銷方案待主 agent 提案，雙方同意後實作。
