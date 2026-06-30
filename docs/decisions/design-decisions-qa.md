# ACT Failure Analysis System Frontend — 設計決策 QA 紀錄

> **說明**：本文件以問答（QA）方式記錄專案建置過程中所有重要的技術討論、選型決策與議題結論，供日後回顧、交接或擴展時參考。
> **維護規則**：每當有新的技術討論或架構決策時，應在本文件補充新條目。
> **最後更新**：2026-06-30

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

**決策**：✅ 開發環境使用 **Vite Dev Server（`npm run dev`）**；生產環境使用 **Nginx** serve 靜態建置產出

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

*本文件持續更新，每次有重要技術討論或架構決策時補充新條目。*
