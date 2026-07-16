# ACT Failure Analysis System Frontend — 設計決策 QA 紀錄

> **說明**：本文件以問答（QA）方式記錄專案建置過程中所有重要的技術討論、選型決策與議題結論，供日後回顧、交接或擴展時參考。
> **維護規則**：每當有新的技術討論或架構決策時，應在本文件補充新條目。
> **最後更新**：2026-07-10

---

## 目錄

1. [前端框架選型](#1-前端框架選型)
2. [是否改用 Python 開發前端](#2-是否改用-python-開發前端)
3. [Windows Server 2022 部署方式](#3-windows-server-2022-部署方式)
4. [Node.js 環境安裝](#4-nodejs-環境安裝)
5. [前端 Logging 策略](#5-前端-logging-策略)
6. [UI Library 選型](#6-ui-library-選型)
7. [狀態管理選型](#7-狀態管理選型)
8. [HTTP Client 選型](#8-http-client-選型)
9. [測試框架選型](#9-測試框架選型)
10. [圖表套件選型](#10-圖表套件選型)
11. [目錄結構設計](#11-目錄結構設計)
12. [測試目錄位置](#12-測試目錄位置)
13. [Fail Sample on Tray 呈現方式](#13-fail-sample-on-tray-呈現方式)
14. [FailTrayChart 著色資料來源演進](#14-failtarychart-著色資料來源演進)
15. [FailTrayChart 非 IO-fail DUT 的著色語意](#15-failtarychart-非-io-fail-dut-的著色語意)
16. [Dashboard 圖表 Tooltip 主題處理](#16-dashboard-圖表-tooltip-主題處理)
17. [Netlist 上傳頁面需求與版面設計](#17-netlist-上傳頁面需求與版面設計)
18. [資料上傳與歷史紀錄拆分為獨立頁面](#18-資料上傳與歷史紀錄拆分為獨立頁面)
19. [Agent 開發分工原則](#19-agent-開發分工原則)

---

## 1. 前端框架選型

**Q：前端框架要選用 React、Svelte 還是 Vue？**

**背景**：
- Dante 有 React 和 Svelte 的開發經驗
- 最近發現 Cytoscape.js 圖表套件功能強大，且與 React 和 Svelte 相容
- 原本建議方案中有提及 Vue

**討論**：
- **React**：生態系最成熟，Zustand / React Router / Ant Design 等配套完整，社群資源最豐富，TypeScript 支援良好，Dante 有實際開發經驗
- **Svelte**：打包後體積小，效能佳，但生態系相對較小，UI Library 選擇較少（無對應等級的 Ant Design）
- **Vue**：學習成本、開發體驗與後續維護相較前兩者無明顯優勢；Dante 無 Vue 實際開發經驗

**決策**：✅ 選用 **React 19 + TypeScript**

**理由**：
1. Dante 本身有 React 開發經驗，開發效率最高
2. Cytoscape.js 與 React 完全相容
3. 配套生態（Router、State、UI、Testing）最完整
4. 長期維護與擴展成本最低

---

## 2. 是否改用 Python 開發前端

**Q：前端是否改用 Python 框架開發（如 Taipy、NiceGUI 等）？**

**背景**：
- Dante 提出後端使用 Python（FastAPI），是否前端也統一用 Python 框架開發
- 考察的框架：Taipy、NiceGUI；詢問是否還有其他選項（如 Streamlit、Dash、Panel）

**討論**：

| 框架 | 優點 | 缺點 |
|------|------|------|
| **Taipy** | 整合 ML 流程、有 Pipeline 概念 | 定位偏資料科學 POC，非生產級 Web App |
| **NiceGUI** | 語法簡潔、支援即時更新 | 本質是 WebSocket 驅動的 server-side rendering，UI 自訂度低 |
| **Streamlit** | 快速原型、數據展示簡單 | 每次互動重新執行整個 script，不適合複雜 UI 邏輯 |
| **Dash** | Plotly 整合佳 | 元件系統封閉，客製化困難 |

**決策**：❌ 不使用 Python 前端框架，維持 **TypeScript + React**

**理由**：
1. 以上 Python 框架均定位為「資料科學家快速建立 POC」，不適合需要長期維護、高度自訂 UI 的生產環境系統
2. 複雜互動（拖曳篩選、多層圖表、狀態管理）在 Python 框架中實作成本極高
3. TypeScript + React 在維護性、擴展性和開發效率上更適合本系統需求
4. 後端 Python（FastAPI）與前端 TypeScript（React）透過 REST API 解耦，職責清晰

---

## 3. Windows Server 2022 部署方式

**Q：網站部署要用內建的 IIS 還是另外架設 Apache？還是其他方案？**

**背景**：
- 開發與部署環境為 Windows Server 2022
- 系統目前未安裝任何 Node.js 相關套件
- 前端為 React SPA（Single Page Application）

**討論**：

| 方案 | 優點 | 缺點 |
|------|------|------|
| **IIS**（Windows 內建）| 系統原生，無需額外安裝 | SPA 路由需設定 URL Rewrite Module（額外安裝），設定繁瑣 |
| **Apache**（另外安裝）| 跨平台，文件齊全 | Windows 上效能較差，設定相對複雜 |
| **Nginx**（另外安裝）| 輕量、高效，SPA 設定簡單 | 需另外安裝 |

**決策**：✅ 開發環境使用 **Vite Dev Server（`npm run dev`）**；生產環境使用 **Nginx** serve 靜態建置產出（*已於後續決策修正，見下方「決策修正」*）

**理由**：
1. React SPA 的 history mode routing 在 Nginx 上只需一條 `try_files` 設定即可處理，最簡便
2. IIS 需額外安裝 URL Rewrite Module，且 SPA 的 fallback 設定較繁瑣
3. Nginx 在 Windows 上同樣輕量且穩定，資源消耗低
4. 生產部署流程：`npm run build` → 產出 `dist/` 目錄 → 由 Nginx 指向 `dist/` serve 靜態檔案

**生產環境 Nginx 關鍵設定（預計）**：
```nginx
server {
    listen 80;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # SPA history mode 必要設定
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8001;  # 轉發到後端 FastAPI
    }
}
```

---

**決策修正（2026-06-09 實際部署時確認）**：✅ 生產環境改用 **IIS**（Windows Server 2022 內建）+ **URL Rewrite Module**，取代原訂的 Nginx 方案

**修正理由**：
1. 部署主機為 Windows Server 2022，IIS 為系統內建元件，不需另外安裝與維護一套 Nginx 服務
2. 與伺服器既有的 IIS 站台管理方式（Application Pool、憑證、防火牆規則等）保持一致，維運成本更低
3. URL Rewrite Module 雖需額外安裝，但只需一次性設定 `web.config`，SPA fallback 規則與 Nginx 的 `try_files` 效果等同（詳見 `docs/deployment/iis-deployment.md`）
4. 實際部署架構與詳細設定請以 `docs/deployment/iis-deployment.md` 與 `docs/reports/20260611_ACT-Frontend-Report.md` 第五節為準，本條目上方的 Nginx 討論僅保留作為決策過程紀錄

---

## 4. Node.js 環境安裝

**Q：Windows Server 2022 上如何安裝 Node.js 與相關工具？**

**背景**：
- 伺服器目前未安裝 Node.js、nvm 或任何相關套件
- 需要考量未來升級維護的便利性

**決策**：✅ 使用 **nvm-windows** 管理 Node.js 版本

**安裝步驟**（已執行）：
1. 下載並安裝 [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
2. 安裝 Node.js LTS 版本：`nvm install 22.13.1`
3. 切換使用：`nvm use 22.13.1`

**注意事項**：
- Windows Server 上 nvm-windows 的 PATH 設定有時在新的 PowerShell session 中不會自動生效
- 若 `node` 指令找不到，需手動設定：
  ```powershell
  $env:PATH = "C:\Users\Administrator\AppData\Local\nvm\v22.13.1;" + $env:PATH
  ```
- 建議將上述 PATH 加入系統環境變數，避免每次 session 都要手動設定

**安裝的 Node.js 版本**：v22.13.1（LTS）

---

## 5. 前端 Logging 策略

**Q：前端是否需要 Logging？用什麼方式實作？**

**背景**：
- Dante 過去的做法是在 `utils/` 中撰寫獨立的 logger 模組，記錄系統執行與 API 呼叫紀錄
- Dante 已提供過去撰寫的 logging 程式（`src/utils/logging/`）作為參考

**Dante 提供的原始 Logger 特性**：
- Console 輸出分級（DEBUG / INFO / WARN / ERROR）
- Ring buffer 記憶體快取最近 N 筆 log
- 可下載為本機 `.log` 檔案

**討論的三個方案**：

| 方案 | 說明 | 決策 |
|------|------|------|
| **方案 1：本機 log 檔案** | 透過 browser download API 儲存至本機 | ✅ 第一階段採用 |
| **方案 2：送後端儲存** | 前端呼叫後端 API，將 log 存入資料庫或檔案 | 🔄 未來優化時討論 |
| **方案 3：Message Queue** | 串接 Kafka / ActiveMQ（BlueMQ）等 | 🔄 未來優化時討論 |

**決策**：✅ **第一階段採用方案 1（本機 log 檔案）**，優化時再引入方案 2/3

**實作選擇**：
- 以 **Dante 提供的原始 Logger** 為基礎，整合以下強化功能：
  - 保留 Ring Buffer + 下載機制
  - 加入 API 呼叫自動記錄（透過 Axios interceptor 整合）
  - 加入結構化 log 格式（timestamp + level + module + message）

**已知限制（未來優化項目）**：
- 本機檔案方式有 I/O overhead，且檔案會持續增長
- 大量 log 時不易搜尋與閱讀
- 預計優化方向：Kafka / ActiveMQ 串接（待討論）

---

## 6. UI Library 選型

**Q：UI Library 要用哪個？**

**決策**：✅ 選用 **Ant Design 6（antd）**

**理由**：
1. 企業級元件完整（Table、Form、Modal、Layout 等）
2. React 官方支援，TypeScript 型別完整
3. 與本系統需求（資料表格、篩選器、儀表板）高度契合
4. 主題客製化彈性佳

**注意事項**：
- Ant Design 6 有部分 API 與 v5 不同，例如：
  - `Alert` 的 `message` prop 已 deprecated，改用 `title`

---

## 7. 狀態管理選型

**Q：狀態管理要用 Redux 還是其他方案？**

**決策**：✅ 選用 **Zustand 5**

**理由**：
1. 輕量，無需大量 boilerplate（相對於 Redux Toolkit）
2. 與 React hooks 整合自然
3. 支援 `persist` middleware，auth token 可直接持久化至 localStorage
4. 本系統狀態結構相對單純，不需要 Redux 的複雜 middleware 機制

---

## 8. HTTP Client 選型

**Q：HTTP client 要用 fetch API 還是 Axios？**

**決策**：✅ 選用 **Axios**

**理由**：
1. 攔截器（interceptors）機制，方便統一注入 JWT Bearer token 與處理錯誤
2. 回應自動 JSON 解析
3. TypeScript 泛型支援良好（`axios.post<ApiResponse<T>>()`）
4. 與 Logger 整合（request/response interceptor 直接記錄 API log）

**注意事項**：
- 後端所有 API 回應均包裝在 `ApiResponse<T>` 結構：
  ```typescript
  interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
  }
  ```
- 取值需注意雙層：`response.data.data.xxx`（`response.data` = `ApiResponse<T>`，`response.data.data` = `T`）

---

## 9. 測試框架選型

**Q：測試框架要用 Jest 還是其他方案？**

**決策**：✅ 選用 **Vitest**

**理由**：
1. 與 Vite 原生整合，設定最簡單
2. API 與 Jest 相容，學習成本低
3. 速度快（ESM 原生支援，不需額外轉換）
4. 搭配 `@testing-library/react` 進行元件測試

**安裝的測試套件**：
```json
{
  "vitest": "^3.x",
  "jsdom": "^26.x",
  "@testing-library/react": "^16.x",
  "@testing-library/user-event": "^14.x",
  "@testing-library/jest-dom": "^6.x"
}
```

**注意事項**：
- Ant Design 的 Grid / 響應式系統在初始化時會呼叫 `window.matchMedia`，但 jsdom 未實作
- 需在 `tests/setup.ts` 加入 mock：
  ```typescript
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  ```

---

## 10. 圖表套件選型

**Q：圖表要用哪個套件？Cytoscape.js 是否適合？**

**最終決策**（2026-06-30 修正確認）：

| 圖表 | 套件 | 說明 |
|------|------|------|
| Top 1 Fail Die（疊層圖） | **Cytoscape.js** | 節點/邊關係圖，疊層 Die 結構視覺化 |
| Fail Die Rate | **ECharts（echarts-for-react）** | 水平柱狀圖，Die 失效率統計 |
| Fail Ball | **ECharts（echarts-for-react）** | 水平柱狀圖，Top 10 Ball Name |
| Fail Sample on Tray | **CSS Grid（原生 HTML/CSS）** | 位置格子圖，不需圖表套件（見條目 13） |

> **初期決策修正**：原本評估 Fail Ball 使用 Cytoscape.js（BGA 拓樸圖），最終改用 ECharts 水平柱狀圖，理由是資料導向的統計視圖（Top 10 次數排行）比拓樸圖更直覺，且 ECharts 已為現有依賴，不需引入新套件。

---

## 11. 目錄結構設計

**Q：前端 source code 如何組織目錄結構？**

**決策**：✅ 採用 **Feature-based 模組化結構**

```
src/
├── api/           # API client 與各模組 API 函式
├── assets/        # 靜態資源（圖片、字體等）
├── components/    # 共用元件
├── features/      # 功能模組（auth、dashboard、analysis 等）
│   ├── auth/
│   │   └── LoginPage.tsx
│   └── dashboard/
│       └── DashboardPage.tsx
├── layouts/       # 版面骨架（MainLayout 等）
├── router/        # React Router 設定與路由守衛
├── stores/        # Zustand stores
├── types/         # TypeScript 型別定義
└── utils/         # 工具函式
    └── logging/   # Logger 模組
```

---

## 12. 測試目錄位置

**Q：測試檔案應放在 `src/` 內（co-located）還是獨立的 `tests/` 目錄？**

**背景**：
- Co-located：測試檔案與 source 並排（`src/features/auth/LoginPage.test.tsx`）
- 獨立目錄：根目錄 `tests/unit/`、`tests/components/`（類似後端 Python 專案慣例）

**決策**：✅ 採用**獨立目錄**（根目錄 `tests/`）

**理由**：
- 與後端 Python 專案結構保持一致，維護習慣統一
- 測試目錄結構清晰，不與 source code 混雜
- Dante 明確偏好此方案

**目錄結構**：
```
tests/
├── setup.ts           # 全域 setup（jest-dom + matchMedia mock）
├── unit/              # 純邏輯單元測試
│   ├── logging.test.ts
│   └── authStore.test.ts
└── components/        # React 元件測試
    └── LoginPage.test.tsx
```

---

---

## 13. Fail Sample on Tray 呈現方式

**Q：Fail Sample on Tray 圖表要用什麼技術實作？**

**背景**：Dashboard 左上角需要一個 Tray 位置圖，讓工程師能一眼看出 Tray 盤上哪個位置有失效的 DUT。

**討論過的方案**：

| 方案 | 優點 | 缺點 | 決策 |
|------|------|------|------|
| Cytoscape.js | 彈性高，可做動畫 | 引入額外複雜度，Tray 格子本質不是「圖」關係 | ❌ 不採用 |
| Canvas / SVG 自繪 | 完全控制 | 程式量大，互動（hover tooltip）需自行實作 | ❌ 不採用 |
| ECharts Heatmap | 現有依賴，API 豐富 | 位置對應不直覺（Tray 是正交格子，非熱圖語意） | ❌ 不採用 |
| **CSS Grid（原生）** | 輕量、自動等比縮放、Ant Design Tooltip 直接套用 | 無動畫效果 | ✅ 採用 |

**決策**：✅ 使用 **CSS Grid**（`gridTemplateColumns: repeat(col_count, 1fr)`）繪製等比例格子

**理由**：
1. Tray 本質是二維矩陣（col × row），CSS Grid 是最自然的對應
2. 自動填滿容器，不需固定像素，響應式免設定
3. 每個格子是 `<div>`，可直接套 Ant Design `<Tooltip>`，hover 互動零成本
4. 不增加新套件依賴

---

## 14. FailTrayChart 著色資料來源演進

**Q：Tray 圖的資料來源與格子數量應如何計算？**

**背景**：多次修正後才確認正確邏輯，特此記錄演進過程供未來參考。

**版本一（initial）**：以 `total_qty` 為格子總數，`fail_sample` 建立 dutMap，不在 dutMap 的位置 → 灰色。
- 問題：頁數計算正確，但對 FailSampleList「354 筆」的意義有誤解（誤以為等於格子數）

**版本二（錯誤嘗試）**：FailSampleList 展開每個 ball_name 為一筆（DUT#1 有 2 個 ball → 2 筆），改以展開後的筆數計算格子。
- 問題：FailSampleList 的展開邏輯是「UI 顯示用」，非 Tray 位置的正確對應

**版本三（最終正確）**：
- **格子總數** = `total_qty`（MongoDB 回傳的實際失效 DUT 總數）
- **著色來源** = `ioPinFailItems`（`computeAnalysis` 過濾出有非空 ball_name 的 FailSampleItem）
- **dutMap** = `ioPinFailItems.map(item => item.dut_no → item)`
- 不在 dutMap 的真實 DUT 位置 → 視同 Fail（藍色），無 IO ball 資訊
- 超出 `total_qty` 的補位格（`dutNo=0`）→ 灰色

**關鍵釐清（與產線人員確認）**：
- `total_qty` = Tray 上 DUT 的實際數量（= 格子總數）
- `ioPinFailItems` = 有 IO pin fail 的 DUT 子集（≤ total_qty）
- IO / POWER 使用相同的 Tray 位置邏輯

---

## 15. FailTrayChart 非 IO-fail DUT 的著色語意

**Q：Tray 上不在 ioPinFailItems 的 DUT 位置，應顯示灰色還是藍色？**

**背景**：初版將「不在 ioPinFailItems」的 DUT 位置顯示為灰色（代表「一般」），但產線確認後調整。

**討論**：
- 灰色語意：「此 DUT 正常」——但在 Fail HBIN 下搜尋到的 DUT 本身就已是失效品
- 藍色語意：「此 DUT 失效，只是無法對應到特定 IO ball」（可能是 POWER fail 或其他類型）

**決策**：✅ 不在 ioPinFailItems 的**真實 DUT 位置（dutNo > 0）一律顯示藍色**

**理由**：
1. 在 HBIN 篩選下取得的 fail_sample 皆為失效 DUT，不應顯示「正常」的灰色
2. 藍色（`#5BA4D5`）統一代表「Fail Sample」，無論有無 IO ball 資訊
3. 灰色（`#2A3F52` / `#D8E8F4`）僅用於補位格（超出 `total_qty`，dutNo=0），語意清晰

**圖例**：
- 橘色 = Top 1 Fail（ball 在 dieResults）
- 藍色 = Fail Sample（任何真實 DUT 位置）
- 灰色 = 無 DUT（補位格）

---

## 16. Dashboard 圖表 Tooltip 主題處理

**Q：ECharts tooltip 與 Ant Design Tooltip 在 dark/light 切換時如何保持一致？**

**背景**：Dashboard 有兩種 tooltip 來源：ECharts（FailBallChart / FailDieRateChart）與 Ant Design（FailTrayChart / FailDieChart），在 dark/light 切換時行為不同。

**ECharts Tooltip**：

ECharts tooltip 使用 JavaScript 設定，不自動跟隨 CSS 主題。採用**固定深色 tooltip**：

```typescript
const COLOR_TOOLTIP_BG = '#1A2332';
tooltip: {
  backgroundColor: COLOR_TOOLTIP_BG,
  borderColor: '#1E3A5F',
  textStyle: { color: '#FFFFFF', fontSize: 12 },
}
```

**決策**：✅ ECharts tooltip **固定使用深色**，不隨主題切換。

**理由**：ECharts tooltip 在深色背景下視覺效果最佳，light mode 下深色 tooltip 仍然清晰，且避免動態切換 ECharts option 的複雜度。

---

**Ant Design Tooltip**：

Ant Design `<Tooltip>` 預設使用 antd theme token，在 dark/light 切換時不會自動對應到自訂的 colorMode token。需手動指定：

```tsx
<Tooltip
  color={colorMode.card}                               // 背景色
  overlayInnerStyle={{ color: colorMode.textPrimary }} // 文字色
>
```

**Token 對應**：
| 屬性 | Dark mode | Light mode |
|------|-----------|------------|
| `color`（背景） | `#112240`（card） | `#FFFFFF`（card） |
| 文字色 | `#FFFFFF`（textPrimary） | `#1A2332`（textPrimary） |

**決策**：✅ Ant Design Tooltip 明確傳入 `color` 與 `overlayInnerStyle`，跟隨 `useThemeColors()` 切換。

---

## 17. Netlist 上傳頁面需求與版面設計

> ⚠️ **版面已於條目 18 修正並定案（2026-07-08 確認 v2）**：本條目最初規劃「上傳」與「上傳歷史」共用同一版面（條件切換），與產線人員討論後改為拆成兩個獨立頁面（資料上傳／歷史紀錄）。本條目的**版本管理、失敗不重試、上傳權限**等決策仍然有效，但「歷史紀錄可見範圍」「上傳者顯示」「失敗紀錄 test_program 顯示」等段落所描述的版面已被條目 18 取代，請以條目 18 為準。

**Q：`src/features/netlist/`（Netlist 管理頁，to-do #11）的上傳功能應如何設計？**

**背景**：Dashboard 圖表全部完成後（見條目 13–16），下一階段規劃 Netlist 管理頁。本次先討論「① 檔案上傳」子功能（歷史紀錄、Summary/Histogram 留待後續討論）。三個子功能評估後皆可沿用現有 Navbar + Left Sidebar + Center Content 框架，不需另起新架構。

**討論與決策**：

| 議題 | 決策 | 理由 |
|------|------|------|
| 版本管理 | ✅ 不保留多版本，同 `test_program` 直接覆蓋 | 後端 `POST /api/v1/netlist/upload` 已處理覆蓋時的快取清除邏輯 |
| 失敗上傳重試 | ✅ 不提供重試按鈕，僅顯示明確錯誤訊息 | 後期上傳處理將交由 Celery 非同步排隊；若允許重試，使用者可能在「已排隊等待中」時重複觸發，造成同一份資料被排兩次。正確性優先於功能便利性 |
| 上傳權限 | ✅ 僅 `engineer`（含）以上可上傳 | 依 5920 產線人員確認的角色權限 |
| 歷史紀錄可見範圍 | ✅ `viewer` 無歷史紀錄功能（主選單不顯示此項）；`engineer` 可見 `viewer` + `engineer` 兩種角色的上傳紀錄 | 依角色權限設計 |
| 「只看自己」篩選 | ✅ 加入「只顯示自己的資料」切換開關，與「上傳者」下拉篩選並列 | `engineer` 預設可見全部，此開關為快速篩選，不用每次從下拉選單找自己 |
| 上傳者顯示 | 🔄 待後端配合：`GET /api/v1/netlist/programs` 目前僅回傳上傳時間與檔名，`uploaded_by`（UUID）欄位未輸出。建議後端 JOIN `users` 表，直接回傳 `uploaded_by_name`，避免前端再打一次 users API | 避免前端多一次網路請求；UUID 對前端無顯示意義 |
| 失敗紀錄的 `test_program` 顯示 | ✅ **要顯示**，但需等後端配合：目前 `audit_logs.request_body` 無論上傳成功或失敗皆為 `null`，無法得知失敗當下上傳的是哪個 `test_program`。時間戳比對（`audit_logs.timestamp` ≈ `nl_programs.uploaded_at`）在並行上傳或時區誤差時不準確，不採用。**待後端於 upload API 將 `test_program` 寫入 `audit_logs.request_body`（或等效欄位）後，前端才實作此欄位的顯示**；在此之前此部分實作暫緩，其餘上傳頁功能可先進行 | 使用者明確要求需要看到失敗紀錄的 test_program，暫時性的時間比對方案準確度不足，寧可暫緩該欄位也不要顯示錯誤資訊 |

**版面草圖（ASCII wireframe，2026-07-02 確認可作為後續開發依據）**：

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Navbar  ACT Failure Analysis System         [使用者: A001 / engineer]  [登出]  │
├───────────────────────────┬──────────────────────────────────────────────────┤
│  Left Sidebar (~320px)     │  Center Content                                  │
│                             │                                                  │
│  ┌───────────────────────┐ │  ┌────────────────────────────────────────────┐ │
│  │ 上傳紀錄篩選            │ │  │  Netlist 上傳                              │ │
│  ├───────────────────────┤ │  │                                            │ │
│  │ 只顯示我的  ○──● 全部  │ │  │  ┌──────────────────────────────────────┐  │ │
│  │                        │ │  │  │                                      │  │ │
│  │ 上傳者 ▾ [全部        ▾]│ │  │  │      拖曳檔案到此處，或點擊選擇      │  │ │
│  │  (依角色可見範圍過濾:   │ │  │  │                                      │  │ │
│  │   engineer 可見        │ │  │  │      NL-{Test_Program}_{Security}     │  │ │
│  │   viewer + engineer)   │ │  │  │           .xlsx                       │  │ │
│  │                        │ │  │  │                                      │  │ │
│  │ 狀態 ▾ [全部/成功/失敗 ▾]│ │  │  └──────────────────────────────────────┘  │ │
│  │  （待確認是否本期做）   │ │  │                                            │ │
│  │                        │ │  │  ⚠ 同一 test_program 上傳將直接覆蓋舊版本， │ │
│  │ 日期區間 [____]~[____]  │ │  │     相關快取資料將一併清除                  │ │
│  │  （待確認是否本期做）   │ │  │                                            │ │
│  └───────────────────────┘ │  └────────────────────────────────────────────┘ │
│                             │                                                  │
│  （僅 engineer 以上可見     │  ┌────────────────────────────────────────────┐ │
│    此頁面／此側欄）         │  │  上傳歷史紀錄                               │ │
│                             │  ├──────────┬────────────┬─────────┬─────────┤ │
│                             │  │ 上傳時間  │ Test Program│ 上傳者   │ 狀態    │ │
│                             │  ├──────────┼────────────┼─────────┼─────────┤ │
│                             │  │ 07/02    │ TP-A123    │ A001    │ ✅ 成功  │ │
│                             │  │ 14:32    │            │(自己)    │         │ │
│                             │  ├──────────┼────────────┼─────────┼─────────┤ │
│                             │  │ 07/02    │ ⏳ 待補欄位 │ A005    │ ❌ 失敗  │ │
│                             │  │ 10:05    │(等後端修正) │         │ 400錯誤 │ │
│                             │  └──────────┴────────────┴─────────┴─────────┘ │
│                             │                            [< 1 2 3 ... >]     │
└───────────────────────────┴──────────────────────────────────────────────────┘
```

**開發用注意事項**：
- 失敗紀錄的 Test Program 欄位在後端補齊前，前端以「⏳ 待補欄位」佔位顯示（不隱藏整欄），待後端資料到位後移除佔位邏輯
- 上傳者欄位依賴後端 `uploaded_by_name`，此欄位到位前可先以 UUID 前幾碼暫代或留空

**尚未確認事項（下次討論繼續）**：
1. 狀態篩選（全部/成功/失敗）、日期區間篩選是否納入本期開發範圍，或先只做「只顯示我的」+「上傳者」篩選
2. 「歷史紀錄」「Summary/Histogram」兩個子功能的細節設計尚未討論

---

## 18. 資料上傳與歷史紀錄拆分為獨立頁面

**Q：原本規劃在同一版面、透過條件切換的「檔案上傳」與「上傳歷史紀錄」，是否要拆成兩個獨立頁面？**

**背景**：條目 17 確認的版面把上傳區與歷史紀錄表格放在同一頁（`src/features/netlist/`）。與 5920 產線人員討論後，認為這樣會讓單一頁面功能過於複雜，決定拆開；同時「歷史紀錄」的範疇也從「僅 Netlist 上傳紀錄」擴大為涵蓋登入紀錄、使用狀況等多主題的通用查詢頁，因此改與既有 to-do #12（`src/features/history/`）合併規劃，不再是 Netlist 的子功能。版面經過兩輪修改（v1 → v2），本條目記錄最終定案版本。

**決策總覽**：

| 議題 | 決策 | 理由 |
|------|------|------|
| 頁面拆分 | ✅ 拆成兩個獨立頁面：**① 資料上傳**（`src/features/netlist/`，僅含上傳功能）、**② 歷史紀錄**（`src/features/history/`，涵蓋登入/上傳/使用狀況等多主題查詢，取代條目 17 原本規劃在 Netlist 內的歷史紀錄子功能） | 單一頁面「上傳 + 歷史」條件切換過於複雜，拆開後職責更清楚 |
| 上傳檔案數量 | ✅ 支援單一或多檔（複選） | 產線人員需求 |
| 上傳觸發方式 | ✅ 點選上傳區開啟檔案總管，或拖曳皆可 | 沿用條目 17 的拖曳設計，並補上點選開檔功能 |
| 上傳觸發時機 | ✅ 選檔後**先進佇列暫存，等使用者按下「全部上傳」才批次送出**；不做自動即時上傳 | 讓使用者有機會確認/取消檔案，避免誤觸發後端與資料庫的無謂寫入（`POST /api/v1/netlist/upload` 逐檔呼叫） |
| 佇列狀態呈現 | ✅ 每個檔案顯示檔名 + 狀態（待上傳／上傳中／✅ 成功／❌ 失敗），送出前可用 `✕` 從佇列移除；送出後失敗**不提供重試**，需重新選檔再走一次流程 | 「不提供重試」沿用條目 17 的理由（避免與未來 Celery 排隊衝突） |
| 資料上傳頁 — 版面配置（v2） | ✅ **左欄最上方**：「上傳主題」下拉（目前僅 `Netlist` 一個選項，為未來擴充其他上傳主題預留欄位）；**左欄下方**：「已上傳檔案」清單。**右欄**：上傳區域 + 覆蓋警示 + 上傳佇列 | 使用者於 v2 修改回饋明確指定此配置 |
| 左欄「已上傳檔案」清單 | ✅ 用途是上傳前參考、避免撞名，資料來源＝`nl_programs` 資料表（即 `GET /api/v1/netlist/programs`）現有全部資料，**依檔名／test_program 搜尋**，**須顯示上傳者資訊**（v2 補上），不需要「只顯示我的」邏輯（因為是列出資料庫既有檔案，非個人操作紀錄） | 使用者要求清單需完整列出＋搜尋＋含上傳者，不需個人化篩選 |
| 歷史紀錄查詢主題 | ✅ 左欄**最上方**以下拉選單呈現（v2 由單選按鈕改為下拉）：登入紀錄／上傳紀錄／使用狀況，切換主題時右側表格欄位與統計圖隨之改變 | 使用者於 v2 修改回饋指定改為下拉 |
| 歷史紀錄 — 查詢對象 | ✅ 「全部（依權限）」選項旁**加入可複選的使用者搜尋框**，用於在「全部」範圍內進一步縮小到特定使用者；另有「只看自己」單獨選項 | 避免資料量過大造成閱讀負擔，使用者要求可複選對象 |
| 歷史紀錄 — 時間區間 | ✅ 除原本的自訂日期範圍外，**加入「最近 7 天」「最近 1 個月」快速選項** | 加快常用查詢速度 |
| 歷史紀錄 — 其他搜尋條件 | ✅ 原「上傳紀錄專屬條件」更名為**「其他搜尋條件」**，依查詢主題動態顯示不同欄位（例：上傳紀錄→Test Program 關鍵字、登入紀錄→IP/裝置關鍵字、使用狀況→功能名稱關鍵字），讓使用者可自行加條件縮小搜尋範圍 | 從「僅上傳紀錄專屬」擴大為所有主題通用的動態篩選區 |
| 歷史紀錄可見範圍與權限 | ✅ **所有主題統一套用同一套權限規則**：`viewer` 完全看不到「資料上傳」與「歷史紀錄」兩個功能入口（主選單不顯示，非僅資料看不到）；`engineer` 可見 `viewer` + `engineer` 範圍的紀錄，並可切換「只看自己」或用上述使用者搜尋框指定對象 | 使用者明確要求所有主題套用同一規則，簡化前端權限邏輯（不需依主題分岔） |
| 歷史紀錄 — 右欄版面 | ✅ 維持上下兩層：**上層**＝歷史紀錄資料表 + 匯出按鈕；**下層**＝統計圖表區 | 使用者 v2 確認維持此結構 |
| 匯出功能 | ✅ 歷史紀錄表格可匯出 **Excel 或 CSV** | 使用者需求；套件選型建議與 to-do #34（ACT Dashboard HW Bin List 匯出）共用同一份技術決策，避免重複安裝不同套件；🔄 **待後端配合**，需討論由前端直接產生檔案、或後端提供下載端點（見下方「待後端配合事項」） |
| 統計圖表 | 🔄 **構思階段（TBD）**，尚未拍板，三主題各自初步想法：<br>① 登入紀錄 → 依日/週/月的登入次數直方圖，可看全體或個人<br>② 上傳紀錄 → 上傳次數統計、成功/失敗比例<br>③ 使用狀況 → 操作次數、頁面停留時間、最常用功能排行 | 使用者明確表示「目前屬於發想構思，待後續實作時可能調整」，先記錄方向，細節與後端 API 待後續討論 |

**⚠️ 待後端配合事項（彙整，供後端 Agent 對照）**：

| # | 事項 | 說明 | 狀態 |
|---|------|------|------|
| 1 | `uploaded_by_name` | `GET /api/v1/netlist/programs` 需 JOIN `users` 表回傳上傳者名稱，供資料上傳頁「已上傳檔案」清單與歷史紀錄頁「上傳紀錄」主題顯示（沿用條目 17 需求，適用範圍擴大） | 🔄 待後端提供 |
| 2 | 上傳失敗紀錄的 `test_program` | `audit_logs.request_body` 目前上傳成功/失敗皆為 `null`，無法得知失敗當下的 `test_program`。需後端於 upload API 寫入該欄位（沿用條目 17 需求，顯示位置改為歷史紀錄頁「上傳紀錄」主題） | 🔄 待後端提供 |
| 3 | **歷史紀錄查詢 API（全新）** | 目前後端完全沒有對應端點。需支援：主題切換（login/upload/usage）、依角色權限過濾可見範圍、查詢對象多選、時間區間（含快速選項）、依主題動態的其他搜尋條件、分頁 | ⬜ 全新需求，待後端評估開發 |
| 4 | **匯出 API 或前端匯出方案** | 需決定「後端提供下載端點」或「前端直接用查詢結果在瀏覽器端產生 Excel/CSV」，若前端產生則需選定套件（xlsx / exceljs），與 to-do #34 共用決策 | ⬜ 待討論實作方式 |
| 5 | **使用狀況埋點方案（全新，範疇最大）** | 「使用狀況」主題（滑鼠操作、點選頁面、停留時間、最常用功能）目前前端**完全沒有埋點（tracking）機制**，後端也沒有儲存/查詢 API。這不是單純畫面開發，需要額外設計一套操作追蹤方案，**需要獨立一輪討論才能拍板**，先於統計圖表本身被排入開發前 | ⬜ 未設計，待專門討論 |

**版面草圖（ASCII wireframe，2026-07-08 確認 v2 為最終開發依據，另有對應 HTML 視覺化設計圖已同步至 Design Sync 專案「ACT Failure Analysis System - Frontend UI Kit」）**：

```
① 資料上傳（src/features/netlist/）
┌──────────────────────────────────────────────────────────────────────────────┐
│  Navbar  ACT Failure Analysis System         [使用者: A001 / engineer]  [登出]  │
├───────────────────────────┬──────────────────────────────────────────────────┤
│  Left Sidebar (~280px)     │  Center Content                                  │
│  ┌───────────────────────┐ │  資料上傳                                        │
│  │ 上傳主題                │ │  ┌────────────────────────────────────────────┐ │
│  │ [Netlist            ▾] │ │  │    拖曳檔案到此處，或點擊選擇（可複選）      │ │
│  └───────────────────────┘ │  │    NL-{Test_Program}_{Security}.xlsx       │ │
│  ┌───────────────────────┐ │  └────────────────────────────────────────────┘ │
│  │ 已上傳檔案（nl_programs）│ │  ⚠ 同一 test_program 上傳將直接覆蓋舊版本       │
│  ├───────────────────────┤ │  ┌────────────────────────────────────────────┐ │
│  │ 🔍 搜尋檔名/test_program│ │  │  上傳佇列（暫存，按「全部上傳」才送出）      │ │
│  ├───────────────────────┤ │  ├────────────────────────────────────────────┤ │
│  │ TP-A123                │ │  │ 📄 NL-TP-D111_S.xlsx      待上傳      [✕]  │ │
│  │  檔名：NL-A123_S.xlsx   │ │  │ 📄 NL-TP-D112_S.xlsx      待上傳      [✕]  │ │
│  │  上傳者：A001           │ │  ├────────────────────────────────────────────┤ │
│  │  時間：07/02 14:32      │ │  │                            [全部上傳][清空] │ │
│  │  ⋮（捲動，列出全部）    │ │  └────────────────────────────────────────────┘ │
│  └───────────────────────┘ │                                                  │
└───────────────────────────┴──────────────────────────────────────────────────┘

② 歷史紀錄（src/features/history/，取代條目 17 原 Netlist 內的歷史紀錄子功能）
┌──────────────────────────────────────────────────────────────────────────────┐
│  Navbar  ACT Failure Analysis System         [使用者: A001 / engineer]  [登出]  │
├───────────────────────────┬──────────────────────────────────────────────────┤
│  Left Sidebar (~280px)     │  Center Content                                  │
│  ┌───────────────────────┐ │  歷史紀錄 — 上傳紀錄          [匯出 ▾ Excel/CSV]│
│  │ 查詢主題                │ │  ┌────────────────────────────────────────────┐ │
│  │ [上傳紀錄            ▾] │ │  │ 時間        使用者   Test Program   狀態     │ │
│  ├───────────────────────┤ │  ├────────────────────────────────────────────┤ │
│  │ 查詢對象                │ │  │ 07/02 14:32 A001    TP-A123        ✅ 成功  │ │
│  │ ◉ 全部（依權限）        │ │  │ 07/02 10:05 A005    ⏳待補欄位     ❌失敗400│ │
│  │    🔍搜尋使用者（可複選）│ │  │  ⋮                                          │ │
│  │ ○ 只看自己              │ │  └────────────────────────────────────────────┘ │
│  ├───────────────────────┤ │                            [< 1 2 3 ... >]     │
│  │ 時間區間                │ │  ┌────────────────────────────────────────────┐ │
│  │ [最近7天][最近1個月][自訂]│ │  │ 統計圖表（構思中，待後續評估／設計）        │ │
│  │ [____] ~ [____]（自訂時）│ │  │ 上傳紀錄 → 每人/每日上傳次數、成功失敗比例  │ │
│  ├───────────────────────┤ │  └────────────────────────────────────────────┘ │
│  │ 其他搜尋條件            │ │                                                  │
│  │（依主題動態，可縮小範圍）│ │                                                  │
│  │ [___________]           │ │                                                  │
│  └───────────────────────┘ │                                                  │
└───────────────────────────┴──────────────────────────────────────────────────┘

切換主題「登入紀錄」時：表格欄位＝時間/使用者/登入結果/IP或裝置；統計圖＝依日/週/月登入次數直方圖（全體或個人）
切換主題「使用狀況」時：表格欄位＝時間/使用者/操作類型/頁面/停留時間；統計圖＝操作次數排行、最常用功能、平均停留時間（埋點方案未定，示意用）
```

**尚未確認事項（下次討論繼續）**：
1. 三個歷史紀錄主題（登入/上傳/使用狀況）的統計圖表細節與是否本期實作
2. 使用狀況埋點方案（前端如何收集操作事件、後端如何儲存與查詢）完全未設計，需另開討論
3. 匯出 Excel/CSV 由前端或後端產生，套件選型（xlsx vs exceljs）需與 to-do #34 一併決定

---

## 19. Agent 開發分工原則

**Q：如果要使用 agent 進行開發和分工，該怎麼分配？這個原則要寫進哪份文件？能通用於 GitHub Copilot 嗎？**

**背景**：專案初期已由 Backend 的 `ADR-010`（前後端分離，由獨立 Agent 各自負責開發）決定 Frontend／Backend 各自一顆主力開發 Agent。隨專案發展，Backend 又新增了 `api-contract-checker`、`docs-consistency-checker` 兩個 `.claude/agents/` 唯讀稽核 Agent，Frontend 也有自己的 `.claude/agents/api-contract-checker.md`。使用者提問是否該再進一步切分更多常駐 Agent 做開發分工。

**權威來源**：本條目為**跨 repo 決策的 Frontend 側記錄**，完整討論過程、考量選項、准入門檻請見 Backend `docs/decisions/ADR-015-agent-division-of-labor.md`，本條目不重複全文，僅記錄與 Frontend 相關的結論。

**決策摘要**（詳見 ADR-015）：

| 議題 | 結論 |
|------|------|
| 開發工作怎麼分配 | 維持 ADR-010 的 Frontend／Backend 兩顆主力開發 Agent，不再依模組/層級（如再切一個「UI Agent」）繼續切分常駐 Agent，避免多個 Agent 同時改動同一份 codebase 造成衝突 |
| 平行工作怎麼處理 | 可平行、不修改程式碼的工作（研究、稽核、報告產出）用臨時 subagent／fork 處理，完成即收掉，不保留常駐身份 |
| 什麼時候該新增常駐 `.claude/agents/*.md` | 只有「會重複執行」且「唯讀不修改檔案」的稽核工作才值得升級為常駐 Agent（例如 `api-contract-checker`）；一次性任務或會修改檔案的工作，一律留在主力 FE/BE Agent 手上 |
| 要不要寫進 Skill 文件 | 不用。這是架構層級的分工原則，記錄在 ADR（Backend）／本 QA 條目（Frontend），Skill 是 Claude Code 自己的可重複調用 prompt 機制（如 `/週報`），性質不同，不應混在一起 |
| 能否通用於 GitHub Copilot | **原則可以，機制不行**。分工原則寫在 `CLAUDE.md` 與 `.github/copilot-instructions.md`（兩邊都能讀取），對 Copilot 使用者同樣適用；但 `.claude/agents/*.md` 常駐 Agent 定義檔、fork／Task 臨時 subagent 是 Claude Code 專屬工具能力，Copilot 沒有對等機制，改用 Copilot 時「唯讀稽核 Agent」的角色需要人工比照 Agent 定義檔內文手動執行 |

**理由**：本專案 Frontend 目前只有 `api-contract-checker` 一個常駐 Agent，尚未有新增更多 Agent 的急迫需求，先以此決策作為未來評估的依據，避免隨專案成長無章法地增生常駐 Agent。

---

*本文件持續更新，每次有重要技術討論或架構決策時補充新條目。*
