# Frontend API Contract

> **文件說明**：本文件為前端視角的 API 使用合約，記錄前端目前實際呼叫的 API 端點、TypeScript 介面定義、
> 發現的問題，以及待後端提供的新 API 需求。供前後端 agent 協作時快速對齊。
>
> **最後更新**：2026-06-03
> **對應後端文件**：`api-contract.md`（後端主要規格來源）
> **前端 API 層位置**：`src/api/`、`src/types/api.ts`

---

## 一、通用設定

| 項目 | 值 |
|------|-----|
| Base URL | `http://localhost:8001`（可由 `VITE_API_BASE_URL` 環境變數覆蓋） |
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
  token_type: 'bearer';
  expires_in: number;   // 單位：秒
  user_no: string;
  display_name: string;
  role: 'viewer' | 'engineer' | 'admin';
}
```

**前端處理**：
- 成功 → 存入 `localStorage['access_token']`，呼叫 `GET /auth/me`
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

### 2.3 `GET /api/v1/analysis/fail-sample`

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

### 2.4 `GET /api/v1/data/search`（已定義，尚未使用）

**用途**：依 LOT ID + HBIN 取得完整測試結果原始資料。

**Query Parameters**：
```
lot_id: string
hbin: number
```

**Response `data`**：
```typescript
interface SearchResult {
  lot_id: string;
  hbin: number;
  execution_mode: string;
  sites: SiteSearchResult[];
}

interface SiteSearchResult {
  lot_info: LotSiteInfo;
  test_result_value: TestResultValueItem[];
}

interface LotSiteInfo {
  file_id: number;
  lot_id: string;
  site_id: string;
  execution_mode: string;
  date: string;
  tester: string;
  customer: string;
  test_program: string;
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

**狀態**：前端已定義介面，**尚未接入任何 UI 元件**。

---

## 三、錯誤代碼對照（前端已定義）

```typescript
const ApiErrorCode = {
  Unknown: 1,
  Unauthorized: 1001,
  Forbidden: 1002,
  NotFound: 1003,
  ValidationError: 1004,
  LdapError: 1005,
  FileFormatError: 1007,
  DatabaseError: 1008,
} as const;
```

---

## 四、待後端提供的新 API 需求

| 優先度 | 需求 | 說明 | 狀態 |
|--------|------|------|------|
| 🟠 P1 | **Token Refresh API** | 目前 token 過期後直接登出，需要後端提供 refresh token 機制（endpoint + 回應格式）。前後端正在討論設計方式。 | ⬜ 待後端確認 |
| 🟡 P2 | **Fail Sample on Tray API** | 前端需要依 LOT ID 取得 Tray 規格（row × col）與每個 DUT 的 Tray 位置，用於繪製 Tray 網格圖 | ⬜ 待討論 |
| 🟡 P2 | **Fail Die API** | 前端需要依 LOT ID 取得 Stacking Die 層次結構與每層的失效 Unity 資訊，用於繪製疊 Die 圖 | ⬜ 待討論 |
| 🟡 P2 | **Fail Die Rate API** | 各層 Die 的失效率統計 | ⬜ 待討論 |
| 🟡 P2 | **Fail Ball API** | 失效 BGA Ball 的分佈資料，用於繪製分布圖 | ⬜ 待討論 |

---

## 五、已發現的問題與落差

| 日期 | 問題 | 狀態 |
|------|------|------|
| 2026-06-01 | `POST /auth/login`：前端原以 `employee_id` 傳送工號，後端要求 `user_no`，導致 422 錯誤 | ✅ 已修正（前端改為 `user_no`） |
| 2026-06-01 | `apiClient.post<LoginResponse>` 導致 `data.access_token` 取到 `undefined`；應使用 `ApiResponse<LoginResponse>` 包裝 | ✅ 已修正 |

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
```

---
