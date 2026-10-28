# Frontend API Contract

> **文件說明**：本文件為前端視角的 API 使用合約，記錄前端目前實際呼叫的 API 端點、TypeScript 介面定義、
> 發現的問題，以及待後端提供的新 API 需求。供前後端 agent 協作時快速對齊。
>
> **最後更新**：2026-10-27（Fail Sample Site 篩選與統計欄位預留）
> **對應後端規格文件**：`.github/instructions/api-contract-structure.instructions.md`（後端 Agent 維護，唯一的 API 規格來源）
> **本文件性質**：前端視角的「實作對照報告」——記錄前端目前實際使用哪些端點、與上述規格文件的落差、以及前端專屬型別；**本身不是規格來源**，若內容有疑義請一律以 `api-contract-structure.instructions.md` 為準
> **前端 API 層位置**：`src/api/`、`src/types/api.ts`

---

## 一、通用設定

| 項目 | 值 |
|------|-----|
| Base URL | 正式環境`http://localhost:8001`、測試開發環境`http://localhost:8002`（可由 `VITE_API_BASE_URL` 環境變數覆蓋） |
| Content-Type | `application/json` |
| Timeout | 30,000 ms |
| Auth 方式 | JWT Bearer Token，從 `localStorage['access_token']` 取得，由 axios request interceptor 自動附加 |
| 401 處理 | 自動清除 `localStorage['access_token']`，由 React Router 守衛跳轉 `/login` |
| 403 處理 | 記錄警告 log，不跳轉 |
| 5xx 處理 | 記錄錯誤 log，不跳轉 |

### 統一回應格式

後端所有 API 均包裝於以下結構：

```typescript
interface ApiResponse<T = unknown> {
  code: number;      // 0 = 成功，其他 = 錯誤代碼
  message: string;
  data: T | null;
}
```

---

## 二、已使用的 API 端點

### 2.1 `POST /api/v1/auth/login`

**用途**：使用者登入，取得 JWT access token。

**Request Body**：
```typescript
interface LoginRequest {
  user_no: string;    // 工號（員工編號）
  password: string;
}
```

**Response `data`**：
```typescript
interface LoginResponse {
  access_token: string;
  refresh_token: string;   // ⬅ 新增（P1-2）：Rolling Refresh Token，有效期 7 天
  token_type: 'bearer';
  expires_in: number;   // 單位：秒（access token 有效期，預設 3600）
  user_no: string;
  display_name: string;
  role: 'viewer' | 'engineer' | 'admin';
}
```

**前端處理**：
- 成功 → 同時存入 `localStorage['access_token']` 和 `localStorage['refresh_token']`，呼叫 `GET /auth/me`
- 失敗 401 + `code=1005` → 顯示「工號或密碼錯誤」
- 失敗 503 + `code=1009` → 顯示「LDAP 服務異常，請稍後再試或聯繫管理員」（**不**觸發自動登出跳轉）
- 失敗 422 → 欄位格式錯誤（已修正，原因：欄位名稱為 `user_no` 非 `employee_id`）

---

### 2.2 `GET /api/v1/auth/me`

**用途**：取得當前已登入使用者的詳細資訊。

**Headers**：`Authorization: Bearer <access_token>`

**Response `data`**：
```typescript
interface UserInfo {
  user_id: string;
  user_no: string;
  display_name: string;
  email: string;
  department: string;
  division: string;
  role: 'viewer' | 'engineer' | 'admin';
  is_active: boolean;
  last_login_at: string;  // ISO 8601 datetime string
}
```

**前端處理**：
- 登入後立即呼叫，結果存入 `authStore.user`（Zustand + localStorage persist）
- 頁面重整時（`restoreSession()`）重新呼叫以驗證 token 有效性

---

### 2.3 `POST /api/v1/auth/refresh`（新增，P1-2）

**用途**：使用 refresh token 換取新的 access token（Rolling 機制，同時換新 refresh token）。

**Headers**：不需要 `Authorization`（使用 refresh token 本身驗證）

**Request Body**：
```typescript
interface RefreshRequest {
  refresh_token: string;
}
```

**Response `data`**：
```typescript
interface RefreshResponse {
  access_token: string;    // 新的 access token（有效期 60 分鐘）
  refresh_token: string;   // 新的 refresh token（舊的同時失效，有效期 7 天）
  expires_in: number;      // access token 有效秒數
}
```

**前端處理策略**：
1. **request interceptor**：偵測 access token 剩餘時間 < 5 分鐘，靜默呼叫此 endpoint 換新 token
2. **401 response interceptor**：收到 401 後嘗試一次 refresh，成功則重試原請求；失敗才清除 localStorage 並跳轉登入頁
3. 換新 token 後同時更新 `localStorage['access_token']` 和 `localStorage['refresh_token']`
4. refresh 本身失敗（refresh token 過期或 401）→ 清除兩個 token，跳轉登入頁
5. **登出**：清除 `localStorage['access_token']` 和 `localStorage['refresh_token']`

**錯誤情況**：
- refresh token 過期 / 無效 → HTTP 401，前端應跳轉登入頁
- 帳號已停用 → HTTP 401 + `code=1001`

---

### 2.4 `GET /api/v1/analysis/fail-sample`

> **後端內部資料來源說明（2026-08-05）**：`hbin=3` 時後端會優先查詢 Fail Sample Import
> 匯入的批次資料，查無對應批次才 fallback 至原始 MongoDB `site` 資料。此判斷完全在
> 後端內部處理，**本端點的 request/response 格式與前端呼叫方式完全不變**，僅記錄於此
> 供未來排查資料來源疑問時參考。

**用途**：依 LOT ID + HBIN 取得 Fail Sample List 分析結果。

**Headers**：`Authorization: Bearer <access_token>`

**Query Parameters**：
```
lot_id: string   // 批次 ID，例如："13NFSAB001"
hbin: number     // 硬體 Bin，可為 2（Open）/ 3（Short）/ 4（Leak）/ 5（Function）
```

**Response `data`**：
```typescript
interface FailSampleResult {
  lot_id: string;
  hbin: number;
  test_program: string;
  total_qty: number;    // ⭐ 新增（2026-06-06）：MongoDB 查得的 Fail DUT 總數（含 VDD）
  total_duts: number;
  fail_sample: FailSampleItem[];
}

interface FailSampleItem {
  dut_no: number;
  ball_name: string[];    // BGA Ball 位置列表，例如：["AM13", "B5"]
  die_no: string[];       // 對應的 Die Unity 編號，例如：["U1", "U3"]
  bond_finger: string[];  // Bond Finger 位置（保留供後續使用）
}
```

**前端處理**：
- Dashboard 搜尋時，對 HBIN 2/3/4/5 **同時**發出 4 個請求（`Promise.allSettled`）
- 結果快取於 `dashboardStore.failSampleCache[lotId][hbin]`
- 預設顯示 HBIN=3（Short）

**已驗證資料樣本**：
- `lot_id="13NFSAB001"`, `hbin=2` → 10 DUT, 10 Fail, 132 Ball
- `lot_id="13NFSAB001"`, `hbin=3` → 1 DUT, 1 Fail, 1 Ball

---

### 2.5 `GET /api/v1/analysis/fail-sample-power`

**用途**：POWER Fail Sample List 分析，只處理 VDD（電源）相關測項，`die_no` 統一回傳 `"All"`（電源腳位無法對應特定 Die）。

**Headers**：`Authorization: Bearer <access_token>`

**Query Parameters**：
```
lot_id: string   // 批次 ID
hbin: number     // 故障類型：Open=2 / Short=3 / Leak=4
```

**Response `data`**：與 2.4 節的 `FailSampleResult` / `FailSampleItem` 共用同一組型別，差異僅在 `die_no[i]` 固定為 `"All"`。

**前端處理**：
- `src/api/analysis.ts` 的 `getFailSamplePower()`
- 與 `getFailSample()` 一起在 `dashboardStore` 中以 `Promise.allSettled` 並行查詢，作為 Fail Sample List 的 POWER variant

**驗證狀態**：✅ 後端已提供、✅ 前端已實作（2026-06-25 稽核確認，本次補上合約記載）

---

### 2.6 `GET /api/v1/netlist/programs/{test_program}/stacking-die`

**用途**：查詢疊層 Die 結構（`layer_no`、`unity_no`、`is_substrate`），用於繪製 Fail Die 疊層圖與 Fail Die Rate 統計。

**Headers**：`Authorization: Bearer <access_token>`

**Path Parameter**：`test_program`（可能含 `@` 符號，需 URL encode）

**Response `data`**：
```typescript
interface StackingDieLayer {
  layer_no: number;
  unity_no: string;
  is_substrate: boolean;
}
// data: StackingDieLayer[]
```

**前端處理**：
- `src/api/netlist.ts` 的 `getStackingDie()`
- 使用元件：`FailDieChart.tsx`、`FailDieRateChart.tsx`

**驗證狀態**：✅ 後端已提供、✅ 前端已實作（2026-06-25 稽核確認，本次補上合約記載）

---

### 2.7 `GET /api/v1/netlist/programs/{test_program}/tray`

**用途**：查詢指定 Test Program 的 Tray 規格（欄數 × 列數），用於繪製 Fail Sample on Tray 位置格子圖。

**Headers**：`Authorization: Bearer <access_token>`

**Path Parameter**：`test_program`（可能含 `@` 符號，需 URL encode）

**Response `data`**：
```typescript
interface TraySpec {
  col_count: number;   // Tray 欄數
  row_count: number;   // Tray 列數
}
// 每頁格子容量 = col_count × row_count
```

**前端處理**：
- `src/api/netlist.ts` 的 `getTray(testProgram)`
- 使用元件：`FailTrayChart.tsx`
- 懶加載：由 `dashboardStore.fetchTraySpec(testProgram)` 呼叫，結果快取於 `traySpecCache[testProgram]`；已快取則跳過 API 呼叫
- `test_program` 來自 `getCurrentFailSample().test_program`

**驗證狀態**：✅ 後端已提供、✅ 前端已實作（2026-06-30）

---

### 2.8 `GET /api/v1/data/search`（已定義，尚未使用）

**用途**：依 LOT ID + HBIN 取得完整測試結果原始資料。

**Query Parameters**：
```
lot_id: string
hbin: number
```

**Response `data`**（2026-08-05 起：批次共用欄位提升至最外層，`sites[].lot_info`
僅保留各自不同的欄位；此格式與 Fail Sample Import 的
`GET /data/fail-sample-import/{batch_id}` 完全一致，見 2.9 節）：
```typescript
interface SearchResult {
  customer: string;
  test_program: string;
  lot_id: string;
  wafer_id: string | null;
  hbin: number;
  execution_mode: string;
  tester: string;
  date: string;
  qty: number;
  sites: SiteSearchResult[];
}

interface SiteSearchResult {
  lot_info: SiteSummaryInfo;
  test_result_value: TestResultValueItem[];
}

interface SiteSummaryInfo {
  site_id: string;
  site_qty: number;
}

// 動態結構：固定欄位 + 每個 test item 為一個 key
type TestResultValueItem = {
  serial_no: string;
  site_id: number;
  hbin: string;
  flag: number;
  real_time: string;
} & Record<string, string | number | TestItemResult>;

interface TestItemResult {
  value: string;
  fail_reason: string;
  spec_max: string;
  spec_min: string;
  unit: string;
}
```

> **⚠️ Breaking Change（2026-08-05）**：`customer`／`test_program`／`tester` 原本重複
> 記錄在每個 `sites[].lot_info` 內，現已改為只在最外層出現一次；`sites[].lot_info`
> 只保留 `site_id`／`site_qty`。同時新增最外層 `qty`（總 Fail DUT 數）與 `wafer_id`
> （`site` 資料源固定為 `null`）欄位。前端型別 `src/types/api.ts` 的 `SearchResult`／
> `SiteSearchResult` 已同步更新，新增 `SiteSummaryInfo` 型別取代原本共用的
> `LotSiteInfo`（`LotSiteInfo` 保留供 `GET /data/lots/{lot_id}` 使用，該端點前端尚未實作）。

**狀態**：前端已定義介面，**尚未接入任何 UI 元件**。

---

### 2.9 `GET /api/v1/data/fail-sample-import`（新增，2026-08-05）

**用途**：查詢已匯入的 Fail Sample 批次清單（僅 metadata，不含 `sites` 明細），供未來
「資料上傳」頁左欄清單與後續「歷史紀錄」頁使用。File Upload v7 每頁查詢 10 筆，
以 `offset` 分頁；搜尋文字以 `q` 傳給後端。

**Query Parameters（皆選填）**：
```
lot_id: string
hbin: number            // >= 1
execution_mode: string  // "RT" | "AT"
date_from: string
date_to: string
limit: number            // 預設 50，範圍 1~200
offset: number            // 預設 0
```

**Response `data`**：
```typescript
interface FailSampleImportListParams {
  lot_id?: string;
  hbin?: number;
  execution_mode?: string;
  date_from?: string;
  date_to?: string;
  q?: string;       // 對 lot_id／test_program／source_file 做模糊 OR 搜尋
  limit?: number;   // File Upload v7 傳 10；後端預設 50，範圍 1~200
  offset?: number;  // 預設 0
}

interface FailSampleImportListResponse {
  items: FailSampleImportBatchSummary[];
  total: number;
  limit: number;
  offset: number;
}

interface FailSampleImportBatchSummary {
  batch_id: string;
  customer: string;
  test_program: string;
  lot_id: string;
  wafer_id: string | null;
  hbin: number;
  execution_mode: string;
  tester: string;
  date: string;
  qty: number;
  imported_at: string;
  source_file: string | null;
  uploaded_by: string | null; // 上傳者工號（user_no）
}
```

**前端處理**：
- `src/api/data.ts` 的 `getFailSampleImportList(params?)`
- `src/stores/uploadStore.ts` 的 `fetchFailSampleImports()` 傳入 `{ limit: 10, offset, q }`；
  搜尋由頁面以 300ms debounce 觸發，回應的 `total` 反映套用 `q` 後的筆數
- `src/features/netlist/components/UploadedReferenceList.tsx` 顯示 `lot_id`、
  `execution_mode`、`test_program`、`imported_at`、`source_file`
  （`null` 顯示「—」）與上傳者工號，並使用回應的 `total` 做分頁
- `uploaded_by` 是後端回傳的上傳者工號（`user_no`，不是 UUID，也不提供
  `uploaded_by_name`）；前端直接顯示 `uploaded_by`，不查詢 `/users`；`null` 時顯示「—」

**狀態**：✅ 後端已提供、✅ 前端已實作（資料上傳頁 #11／File Upload v7 #44）。

---

### 2.10 `GET /api/v1/data/fail-sample-import/{batch_id}`（新增，2026-08-05）

**用途**：查詢單一匯入批次的完整內容，格式與 2.8 節 `SearchResult` 完全一致，額外附上
`batch_id`／`imported_at`／`source_file` 三個欄位。

**Response `data`**：
```typescript
interface FailSampleImportDetail extends SearchResult {
  batch_id: string;
  imported_at: string;
  source_file: string | null;
  uploaded_by: string | null;
}
```

**常見錯誤**：`batch_id` 不存在時回傳 `404`（`data: null`）。

**前端處理**：`src/api/data.ts` 已提供 `getFailSampleImportDetail()` wrapper；
File Upload v7 的明細表改由下方 rows endpoint 以後端搜尋／排序／分頁提供，本 endpoint
保留供需要完整批次內容的情境使用。

**狀態**：✅ 後端已提供、✅ 前端 wrapper 已完成（File Upload v7 #44）。

---

### 2.10a `GET /api/v1/data/fail-sample-import/{batch_id}/rows`（2026-10-22 新增）

**用途**：將指定批次的測試結果攤平成一列一個測項，供 File Upload v7
Fail Sample 預覽明細表使用。

**Query Parameters**：
```typescript
interface FailSampleImportRowsParams {
  sites?: string[];       // 前端 wrapper 送為逗號分隔字串，例如 "1,2"
  q?: string;             // 比對 12 個欄位
  sort_by?: 'site' | 'serial_no' | 'real_time' | 'test_item' | 'value'
    | 'spec_min' | 'spec_max' | 'unit' | 'pin_1' | 'pin_2'
    | 'fail_reason' | 'ihbin';
  sort_order?: 'asc' | 'desc';
  page?: number;          // 預設 1
  page_size?: number;     // 預設 100，上限 500
}
```

`value`／`spec_min`／`spec_max` 由後端採數值排序，其餘欄位採字串排序；
缺值回傳空字串。`sites` 可複選，`q` 對所有 12 欄位做不分大小寫比對。

**Response `data`**：
```typescript
interface FailSampleImportSiteStat {
  site: string;
  dut_count: number;
  row_count: number;
}

interface FailSampleImportRowsResponse {
  total: number;
  filtered_total: number;
  sites: string[];
  items: FailSampleImportRow[];
  page: number;
  page_size: number;
  /** 各 Site 的整批統計，順序與 sites 一致 */
  site_stats: FailSampleImportSiteStat[];
}
```

**前端處理**：
- `src/api/data.ts` 的 `getFailSampleImportRows(batchId, params?)`。
- `src/stores/uploadStore.ts` 依批次、Site、搜尋、排序與頁碼快取查詢結果。
- `src/features/netlist/components/FailSamplePreview.tsx` 使用後端分頁／搜尋／排序，
  每頁 100 列；Site 篩選預設全選，全選時不傳 `sites`，全部清除時顯示空狀態且不發請求；
  條件變動時回到第 1 頁，`fail_reason` 使用 danger token 顯示。
- 批次不存在回傳 404；載入中、錯誤與空結果皆由預覽元件處理。

> `site_stats` 為後端必有欄位，順序與 `sites` 一致且涵蓋整批所有 Site；
> `dut_count` 與 `row_count` 不受 `q`、`sites` 或分頁影響。若前端遇到
> 異常缺漏的 Site，篩選面板以「—」容錯；前端不自行計算顆數或列數。

**狀態**：✅ rows 端點與前端型別／wrapper／預覽明細表及 `site_stats` 統計已完成（#44）。

---

### 2.11 `GET /api/v1/data/fail-sample-import/{batch_id}/csv`（新增，2026-08-05）

**用途**：將指定批次原始資料匯出為 CSV 檔案下載（`Content-Type: text/csv`，非統一 JSON
格式）。需 `engineer` 或 `admin` 角色（權限比一般查詢更嚴格）。

**前端處理**：`src/api/data.ts` 的 `downloadFailSampleImportCsv()` 使用既有
`apiClient` 與 `responseType: 'blob'`，解析 `Content-Disposition` 檔名；若無檔名則回退
為 `{batch_id}.csv`。File Upload v7 的 Fail Sample 預覽只對 `engineer`／`admin` 顯示
「輸出 CSV」按鈕。

**狀態**：✅ 後端已提供、✅ 前端已接入 File Upload v7 #44。

---

### 2.12 `GET /api/v1/netlist/programs`

**用途**：取得所有已上傳 Netlist Program，供資料上傳頁左欄參考清單使用。

**Response `data`**：
```typescript
interface NetlistProgram {
  id: number;
  test_program: string;
  filename: string;
  security_level: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  updated_at: string;
}
// data: NetlistProgram[]
```

> **上傳者欄位（2026-09-02）**：`uploaded_by` 為後端回傳的上傳者工號
> （`user_no`，不是 UUID）；找不到對應使用者時為 `null`，且不再提供
> `uploaded_by_name`。前端直接顯示 `uploaded_by` 工號，不查詢 `/users`；
> `null` 顯示「—」。

**前端處理**：
- `src/api/netlist.ts` 的 `getNetlistPrograms()`
- `src/stores/uploadStore.ts` 的 `fetchNetlistPrograms()`
- `src/features/netlist/components/UploadedReferenceList.tsx` 以
  `test_program`／`filename` 做 client-side 搜尋，顯示上傳時間 `uploaded_at` 與
  `uploaded_by` 對應的上傳者

**狀態**：✅ 後端已提供、✅ 前端已實作（資料上傳頁 #11）。

---

### 2.13 `POST /api/v1/netlist/upload`

**用途**：上傳 Netlist Excel；同一 `test_program` 會覆蓋舊版本並清除相關快取。

**Request**：`multipart/form-data`
```typescript
interface NetlistUploadRequest {
  file: File; // .xlsx，檔名需符合 NL-{Test_Program}_({Security}).xlsx
}
```

後端接受 `NL-{Test_Program}_C.xlsx`、`NL-{Test_Program}_(C).xlsx`，
以及 `NL-{Test_Program}_(Security C).xlsx` 等等價括號寫法。非 `.xlsx` 回 `1007`，
檔名不符回 `1012`，超過 2 MB 回 `1011`；錯誤業務碼與訊息位於
`response.data.detail.code`／`response.data.detail.message`。

**Response `data`**：
```typescript
interface NetlistUploadResult {
  test_program: string;
  filename: string;
  security_level: string | null;
  action: 'created' | 'updated';
}
```

**前端處理**：
- `src/api/netlist.ts` 的 `uploadNetlist(file)`，以 `FormData` 欄位 `file` 傳送
- `src/stores/uploadStore.ts` 逐筆處理佇列；成功標記為 `success`，HTTP 錯誤標記為
  `failed` 並保留 status code；失敗項目不重試

**狀態**：✅ 後端已提供、✅ 前端已實作（資料上傳頁 #11）。

---

### 2.14 `POST /api/v1/data/fail-sample-import/upload`

**用途**：手動匯入產線 Fail Sample JSON 批次。

**Request**：`application/json`，直接傳送 JSON 檔案解析後的物件；必填 query parameter
`source_file` 帶入使用者選擇的原始檔名。檔名需符合
`{Test_Program}_{Lot_ID}__{AT|RT}_{YYYYMMDDHHMMSS}.json`，前端使用 `File.name`，
由 axios 進行 URL encode。

後端驗證：request body 超過 2 MB 回 `400`／`1011`；`source_file` 缺少或格式錯誤回
`400`／`1012`。前端將後端 `detail.message` 直接作為佇列失敗原因。

**Response `data`**：
```typescript
interface FailSampleImportUploadResult {
  batch_id: string;
  chunk_count: number;
  site_count: number;
  test_result_value_count: number;
}
```

> `sites` 不可為空，測項名稱與內容為動態欄位；前端只負責讀取檔案、`JSON.parse()`，
> 不另行限制 payload 結構。解析失敗時直接將佇列項目標記為失敗，不呼叫 API。

**前端處理**：
- `src/api/data.ts` 的 `uploadFailSampleImport(payload, sourceFile)`
- `src/stores/uploadStore.ts` 逐筆讀取 `.json` 檔案、解析並傳送；`source_file` 由
  `File.name` 自動帶入。前端採官方建議的裸資料物件格式送出；後端亦相容
  `{"data": {...}}` 包裝格式。API 成功後，前端從格式 A/B payload 取出
  `lot_id`／`hbin`，清除 `dashboardStore` 對應 Lot 的 IO／POWER 快取（有 hbin
  時只清該 hbin）

**狀態**：✅ 後端已提供、✅ 前端已實作（資料上傳頁 #11）。

### 2.15 `GET /api/v1/users`（後端已提供，資料上傳頁目前未使用）

**用途**：後端提供使用者清單，保留供未來歷史紀錄頁的使用者篩選或使用者管理功能使用；
資料上傳頁的上傳者欄位直接顯示 `uploaded_by` 工號，不會呼叫此端點。
`getUsers()` API 函式則保留供後續歷史紀錄頁（#12）使用。

**Query Parameters**：
```typescript
interface UserListParams {
  skip?: number;   // 預設 0
  limit?: number;  // 預設 20
}
```

**Response `data`**：
```typescript
interface UserListItem {
  id: string; // 注意：此欄位不是 UserInfo.user_id
  user_no: string;
  display_name: string;
  email: string;
  department: string;
  division: string;
  role: 'viewer' | 'engineer' | 'admin';
  is_active: boolean;
  last_login_at: string;
}
```

**前端處理**：
- `src/api/users.ts` 的 `getUsers(params?)` API 函式保留，但資料上傳頁目前不呼叫
- `UserListItem`／`UserListParams` 型別保留於 `src/types/api.ts`，供後續歷史紀錄或
  使用者管理功能重用

**狀態**：✅ 後端已提供、✅ API wrapper 已保留、⬜ 資料上傳頁目前不使用。

---

### 2.16 `GET /api/v1/netlist/programs/{test_program}/sheets`（2026-10-22 新增）

**用途**：取得固定六個 Netlist Sheet 的列數，供 File Upload v7 Sheet 下拉與資訊區
顯示；Sheet 內容仍沿用各既有端點，由前端每頁 100 列。

**Response `data`**：
```typescript
interface NetlistSheetInfo {
  name: 'Netlist' | 'Test_Spec' | 'Bin_Priority' | 'Bin_Name' | 'Stacking_Die' | 'Tray';
  row_count: number;
}
// 固定順序：Netlist、Test_Spec、Bin_Priority、Bin_Name、Stacking_Die、Tray
```

**前端處理**：`src/api/netlist.ts` 的 `getNetlistSheets()`；
`uploadStore` 依 `test_program` 快取 metadata，Test Program 不存在時顯示 API 錯誤。

**狀態**：✅ 後端已提供、✅ 前端 wrapper／列數顯示／快取已完成（#44）。

---

### 2.17 Netlist 預覽資料端點（File Upload v7 #44）

File Upload v7 的 Netlist 預覽依選取的 Sheet 懶加載資料，`test_program` 一律先以
`encodeURIComponent()` 編碼；`uploadStore` 依 `test_program` 快取已取得的 Sheet，
重複查看時不重新呼叫 API。下列 wrapper 位於 `src/api/netlist.ts`：

| Sheet | 方法／路徑 | 回應型別與前端欄位 |
|-------|------------|--------------------|
| Netlist | `GET /api/v1/netlist/programs/{test_program}/netlist` | `NetlistConnection[]`：`package_pin`、`bond_finger`、`die_pin`、`net_name`；UI 的 `die_unity` 由前端以 die mapping 補入 |
| Test_Spec | `GET /api/v1/netlist/programs/{test_program}/test-spec` | `TestSpecItem[]`：`item_name`、`fail_bin_code_min/max`、`relax`、`relax_min/max` |
| Die Mapping | `GET /api/v1/netlist/programs/{test_program}/die-mapping` | `DieMappingItem[]`，供 Netlist `die_unity` 對應 |
| Bin_Priority | `GET /api/v1/netlist/programs/{test_program}/bin-priority` | `BinPriorityItem[]`，使用後端欄位 `hw_bin_name` |
| Bin_Name | `GET /api/v1/netlist/programs/{test_program}/bin-name` | `BinNameItem[]` |
| Stacking_Die | `GET /api/v1/netlist/programs/{test_program}/stacking-die` | `StackingDieLayer[]`，UI 顯示 `layer`／`unity` |
| Tray | `GET /api/v1/netlist/programs/{test_program}/tray` | `TraySpec` 單一物件，UI 顯示 `column`／`row` |

Netlist 表格由 `PreviewTable` 提供搜尋、排序與每頁 100 列；搜尋／排序／Sheet 切換
會回到第 1 頁。`die_unity` 以 `die_pin_raw`（無值時使用 `die_pin`）去除最後一個
`.` 後，對照 Die Mapping 的 `die_pin`；找不到時留白。

**狀態**：✅ 後端端點已提供、✅ 前端型別／wrapper／懶加載預覽已完成（#44）。

---

## 三、錯誤代碼對照（前端已定義）

```typescript
const ApiErrorCode = {
  Unknown: 1,
  Unauthorized: 1001,
  Forbidden: 1002,
  NotFound: 1003,
  ValidationError: 1004,
  LdapAuthFailed: 1005,     // 帳密錯誤（HTTP 401）
  FileFormatError: 1007,
  DatabaseError: 1008,
  LdapServiceError: 1009,   // ⬅ 新增（P1-1）：LDAP 服務不可用（HTTP 503），顯示「請稍後再試」，不跳轉登入頁
  NetlistUnavailable: 1010,  // 查詢對象存在，但 Netlist 尚未上傳
  FileTooLarge: 1011,        // HTTP 400；讀取 response.data.detail.code
  FilenameFormatError: 1012, // HTTP 400；讀取 response.data.detail.code
} as const;
```

前端 `src/api/client.ts` 的 `getApiErrorCode()`／`getApiErrorMessage()` 同時支援
統一回應的頂層 `code`／`message` 與 FastAPI `detail.code`／`detail.message`；
因此 1011／1012 的訊息可直接顯示於上傳佇列失敗原因。

---

## 四、待後端提供的新 API 需求

| 優先度 | 需求 | 說明 | 狀態 |
|--------|------|------|------|
| 🟠 P1 | **Token Refresh API** | 後端已完成（`POST /api/v1/auth/refresh`，Rolling Refresh Token）。前端已實作 refresh 邏輯（詳見 2.3 節）。 | ✅ 後端完成，✅ **前端已實作** |
| 🟡 P2 | **Fail Die API** | 依 LOT ID / Test Program 取得 Stacking Die 層次結構，用於繪製疊 Die 圖。後端提供 `GET /netlist/programs/{test_program}/stacking-die`（詳見 2.6 節）。 | ✅ 後端完成，✅ **前端已實作**（2026-06-25 稽核確認） |
| 🟡 P2 | **Fail Sample on Tray API** | 前端以 `GET /netlist/programs/{test_program}/tray` 取得 Tray 規格，DUT 位置由 `fail_sample.dut_no` 對應（詳見 2.7 節） | ✅ 後端完成，✅ **前端已實作**（2026-06-30） |
| 🟡 P2 | **Fail Die Rate API** | 各層 Die 的失效率統計，前端目前依 2.6 節 `stacking-die` 資料自行計算比率，暫無獨立後端 API 需求 | ❌ 不適用（前端自行計算） |
| 🟡 P2 | **Fail Ball API** | 失效 BGA Ball 的分佈資料，用於繪製分布圖 | ⬜ 待討論 |
| 🟡 P2 | **上傳者工號（Netlist／Fail Sample）** | 後端已於 2026-09-02 在兩份清單回應提供 `uploaded_by` 工號字串（`user_no`，找不到使用者時為 `null`）；前端直接顯示工號，`null` 顯示「—」，不查詢 `/users` | ✅ 後端完成，✅ **前端已實作**（資料上傳頁 #11） |
| 🟠 P1 | **上傳失敗紀錄的 test_program** | `audit_logs.request_body` 目前無論上傳成功或失敗皆為 `null`，無法得知失敗當下的 `test_program`。需後端於 upload API 將 `test_program` 寫入 `audit_logs.request_body`（或等效欄位），前端才能在**歷史紀錄頁「上傳紀錄」主題**的失敗紀錄顯示對應的 test_program（詳見設計決策 QA 條目 18，原記載於條目 17，顯示位置隨頁面拆分調整） | ⬜ 待後端提供，前端此欄位實作暫緩 |
| 🟠 P1 | **歷史紀錄查詢 API（全新）** | `src/features/history/` 需要查詢端點，支援：① 主題切換 ② 依角色權限過濾可見範圍（`viewer` 完全無法存取；`engineer` 可見 `viewer`+`engineer` 範圍，並可指定「只看自己」或用使用者清單多選縮小範圍）③ 時間區間（含「最近7天／最近1個月」快速選項 + 自訂範圍）④ 依主題動態的其他搜尋條件（例：上傳紀錄→test_program、登入紀錄→IP/裝置、使用狀況→功能名稱）⑤ 分頁。**端點命名已確認**（見 Backend to-do-list.md #72~#75）：`GET /api/v1/history/login`、`GET /api/v1/history/uploads`、`GET /api/v1/history/usage`（詳見設計決策 QA 條目 18） | 🔄 後端已規劃端點路徑，尚未實作（`usage` 主題另待埋點方案定案） |
| 🟡 P2 | **匯出 API（Excel/CSV）** | 歷史紀錄表格需支援匯出，尚未決定是「後端提供下載端點」或「前端直接用查詢結果在瀏覽器端產生檔案」。若前端產生，套件選型（`xlsx` / `exceljs`）建議與 to-do #34（ACT Dashboard HW Bin List 匯出）共用同一份決策，避免專案內安裝兩套不同的 Excel 產生套件 | ⬜ 待討論實作方式（前端 or 後端） |
| 🟡 P2 | **使用狀況埋點方案（全新，範疇最大）** | 歷史紀錄頁「使用狀況」主題（滑鼠操作、點選頁面、停留時間、最常用功能）需要前端新增操作事件收集機制，以及後端對應的儲存與查詢 API。目前**完全沒有設計**，非單純畫面開發，需先有獨立一輪討論定案技術方案（前端收集哪些事件、如何節流/批次上送、後端如何儲存與查詢）後才能定義出具體 API 規格（詳見設計決策 QA 條目 18） | ⬜ 未設計，待專門討論 |

---

## 五、已發現的問題與落差

| 日期 | 問題 | 狀態 |
|------|------|------|
| 2026-06-01 | `POST /auth/login`：前端原以 `employee_id` 傳送工號，後端要求 `user_no`，導致 422 錯誤 | ✅ 已修正（前端改為 `user_no`） |
| 2026-06-01 | `apiClient.post<LoginResponse>` 導致 `data.access_token` 取到 `undefined`；應使用 `ApiResponse<LoginResponse>` 包裝 | ✅ 已修正 |
| 2026-06-03 | 後端 `POST /auth/login` Response 新增 `refresh_token` 欄位；錯誤代碼新增 `1009`（LDAP 服務不可用）；前端需同步更新 | ✅ P1-1 + P1-2 前端已實作（2026-06-03） |
| 2026-06-25 | 本文件先前記載 `GET /data/search` 回應含 `qty`、`LotSiteInfo.site_qty` 欄位，但對照後端權威規格 `.github/instructions/api-contract-structure.instructions.md` 與 `src/types/api.ts` 實際定義，該端點並無此二欄位，屬本文件記載錯誤 | ✅ 已修正（移除錯誤欄位記載，2.7 節） |
| 2026-06-25 | `fail-sample-power`、`stacking-die` 兩端點後端已提供且前端已實作（`src/api/analysis.ts`、`src/api/netlist.ts`），但本文件「二、已使用的 API 端點」遲未記載，且第四節仍將 Fail Die API 誤標為「待討論」 | ✅ 已修正（補上 2.5 / 2.6 節，更新第四節狀態） |
| 2026-08-05 | 後端 API 規格更新：`GET /data/search` 回應格式調整為 Breaking Change（`customer`／`test_program`／`tester` 提升至最外層，`sites[].lot_info` 僅留 `site_id`／`site_qty`，新增最外層 `qty`／`wafer_id`）；新增模組六 Fail Sample Import 三個查詢/匯出端點；`fail-sample`／`fail-sample-power` 呼叫方式確認不變。前端 `src/types/api.ts` 的 `SearchResult`／`SiteSearchResult` 已同步更新，新增 `SiteSummaryInfo` 型別 | ✅ 已修正（2.4、2.8～2.11 節） |
| 2026-09-01 | 資料上傳頁 #11 實作：新增 Netlist／Fail Sample 上傳與清單 API 串接、檔案佇列與狀態處理；當時 Fail Sample 清單固定抓最新 50 筆後做 client-side 過濾，批次詳情與 CSV 匯出留待後續頁面 | ✅ 已完成（2.9、2.12～2.15 節） |
| 2026-09-02 | 後端 API 規格同步：Netlist／Fail Sample 清單新增 `uploaded_by` 工號欄位；Fail Sample 上傳成功後依 payload 格式 A/B 清除 Dashboard 對應 Lot 的 IO／POWER 快取 | ✅ 已修正（2.9、2.10、2.12、2.14、2.15 節） |
| 2026-09-03 | 使用者確認上傳者欄位直接顯示 `uploaded_by` 工號；移除資料上傳頁的 `/users` 姓名對照 API 呼叫，但保留 `getUsers()` wrapper 與使用者 DTO 型別供後續歷史紀錄頁使用 | ✅ 已修正（2.9、2.12、2.15 節） |
| 2026-10-22 | File Upload v7：Fail Sample 清單改為 `limit=10`／`offset` 分頁並以 `q` 傳送搜尋；接入 rows 明細 API 的 Site／搜尋／排序／後端分頁與快取；新增 Netlist sheets wrapper 顯示六個 Sheet 列數；同步 1011／1012 巢狀錯誤碼、`source_file` 必填與兩種 Netlist 括號檔名規則 | ✅ 已完成（2.9～2.17 節） |
| 2026-10-27 | Fail Sample Site 篩選改為 Checkbox Popover；預設全選、全選省略 `sites`、全部清除不發請求；同步後端必有的 `site_stats` 統計，異常缺漏 Site 時以「—」容錯 | ✅ 前後端已完成 |

---

## 六、前端專屬型別（不需後端對應）

以下為純前端使用的型別，不對應後端 API：

```typescript
// HBIN 對照表（前端顯示用）
const HBin = { Open: 2, Short: 3, Leak: 4, Function: 5 } as const;
type HBinValue = 2 | 3 | 4 | 5;
const HBinLabel: Record<HBinValue, string> = {
  2: 'Open', 3: 'Short', 4: 'Leak', 5: 'Function'
};

// Dashboard 搜尋歷史記錄（localStorage persist，非後端資料）
interface SearchHistoryEntry {
  lotId: string;
  searchedAt: string;   // ISO string
  hasAnyFail: boolean;  // 是否有任一 HBIN 有 fail 資料（用於 badge 顯示）
}

// FailTrayChart 格子狀態（前端計算，不對應後端欄位）
type CellStatus = 'orange' | 'blue' | 'gray';
// orange = IO ball 在 dieResults（Top Die Fail）
// blue   = 真實 DUT 位置（含無 IO ball 資訊的 DUT）
// gray   = 補位格（超出 total_qty 範圍，dutNo=0）

interface TrayCell {
  dutNo: number;      // dut_no（補位格為 0）
  ballName: string;   // 第一個非空 ball_name（補位或無 IO ball 時為 ''）
  status: CellStatus;
}
```

---
