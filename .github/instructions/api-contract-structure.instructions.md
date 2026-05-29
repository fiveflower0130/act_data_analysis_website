# ACT Failure Analysis System — API Contract

> **版本**：v1（2026-05-29）
> **維護者**：後端 Copilot Agent
> **用途**：前端開發的唯一 API 規格參考文件，請勿自行假設未列出的欄位或行為

---

## 系統概覽

| 項目 | 說明 |
|------|------|
| 系統名稱 | ACT Failure Analysis System |
| 後端框架 | FastAPI（Python） |
| 資料來源 | MongoDB（ACT 測試資料）+ PostgreSQL（Netlist 規格） |
| API Base URL | `http://10.16.93.48:8001/api/v1` |
| API 文件（Swagger） | `http://10.16.93.48:8001/docs` |
| 認證方式 | JWT Bearer Token（Header: `Authorization: Bearer <token>`） |

---

## 統一回應格式

所有 API 均使用以下統一格式回應：

```json
{
  "code": 0,
  "message": "操作成功",
  "data": { ... }
}
```

| 欄位 | 型態 | 說明 |
|------|------|------|
| `code` | `int` | `0` = 成功；非 `0` = 失敗（見錯誤代碼表） |
| `message` | `string` | 操作結果說明 |
| `data` | `any \| null` | 回應資料本體，失敗時為 `null` |

### 錯誤代碼表

| code | 說明 |
|------|------|
| `1` | 未知錯誤 |
| `1001` | 未登入或 token 無效（401）|
| `1002` | 權限不足（403）|
| `1003` | 資源不存在（404）|
| `1004` | 請求參數驗證失敗（422）|
| `1005` | LDAP 帳密錯誤（401）|
| `1007` | 上傳檔案格式錯誤（400）|
| `1008` | 資料庫操作失敗（500）|

---

## 角色權限說明

| 角色 | 說明 | 可用功能 |
|------|------|----------|
| `viewer` | 一般查閱者 | 查詢資料、分析報告 |
| `engineer` | 工程師 | viewer 全部 + 上傳 Netlist |
| `admin` | 管理員 | 全部功能 + 使用者管理 |

---

## 模組一：認證（Auth）

### `POST /api/v1/auth/login`

**說明**：LDAP 帳密登入，回傳 JWT Token

**Request Body（JSON）**：
```json
{
  "user_no": "12345",
  "password": "your_password"
}
```

**Response `data`**：
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "expires_in": 28800,
  "user_no": "12345",
  "display_name": "王小明",
  "role": "engineer"
}
```

| 欄位 | 型態 | 說明 |
|------|------|------|
| `access_token` | `string` | JWT Token，後續請求放入 Header |
| `token_type` | `string` | 固定為 `"bearer"` |
| `expires_in` | `int` | Token 有效秒數（預設 28800 = 8 小時）|
| `user_no` | `string` | 使用者工號 |
| `display_name` | `string` | 使用者顯示名稱 |
| `role` | `string` | `"viewer"` \| `"engineer"` \| `"admin"` |

---

### `POST /api/v1/auth/logout`

**說明**：登出（JWT stateless，前端丟棄 token 即可，此 endpoint 僅供稽核記錄）

**需要認證**：是

**Response `data`**：`null`

---

### `GET /api/v1/auth/me`

**說明**：取得當前登入使用者資訊

**需要認證**：是

**Response `data`**：
```json
{
  "user_id": "uuid-string",
  "user_no": "12345",
  "display_name": "王小明",
  "email": "user@company.com",
  "department": "測試部",
  "division": "FA 課",
  "role": "engineer",
  "is_active": true,
  "last_login_at": "2026-05-29T05:30:00"
}
```

---

## 模組二：使用者管理（Users）

> ⚠️ 所有 users API 均需登入，部分操作需 admin 角色

### `GET /api/v1/users`

**說明**：取得使用者清單（依角色層級過濾）

**Query Params**：

| 參數 | 型態 | 預設 | 說明 |
|------|------|------|------|
| `skip` | `int` | `0` | 分頁偏移 |
| `limit` | `int` | `20` | 每頁筆數 |

**Response `data`**（陣列）：
```json
[
  {
    "id": "uuid-string",
    "user_no": "12345",
    "display_name": "王小明",
    "email": "user@company.com",
    "department": "測試部",
    "division": "FA 課",
    "role": "engineer",
    "is_active": true,
    "last_login_at": "2026-05-29T05:30:00"
  }
]
```

---

### `GET /api/v1/users/{user_id}`

**說明**：取得指定使用者資料（`user_id` 為 UUID 字串）

**Response `data`**：同上單筆格式

---

### `PATCH /api/v1/users/{user_id}`

**說明**：更新使用者（需 admin 角色）

**Request Body（JSON，所有欄位均可選）**：
```json
{
  "display_name": "新名稱",
  "email": "new@company.com",
  "department": "新部門",
  "division": "新課別",
  "role": "viewer",
  "is_active": false
}
```

**Response `data`**：更新後的使用者資料（同單筆格式）

---

### `GET /api/v1/users/{user_id}/login-history`

**說明**：取得登入歷史（一般使用者只能查自己，admin 可查任何人）

**Query Params**：`skip`（預設 0）、`limit`（預設 20）

**Response `data`**（陣列）：
```json
[
  {
    "id": "uuid-string",
    "user_id": "uuid-string",
    "ip_address": "10.16.93.1",
    "user_agent": "Mozilla/5.0...",
    "login_at": "2026-05-29T05:30:00"
  }
]
```

---

## 模組三：ACT 測試資料查詢（Data）

### `GET /api/v1/data/search`

**說明**：查詢指定批號與 HBIN 的所有 Fail DUT 超規測項資料

**需要認證**：是

**Query Params**：

| 參數 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `lot_id` | `string` | ✅ | 批號，例如 `"12NFKTB004"` |
| `hbin` | `int` | ✅ | 故障類型：Short=3 / Open=2 / Leak=4 / Function=5 |

**Response `data`**：
```json
{
  "lot_id": "12NFKTB004",
  "hbin": 3,
  "execution_mode": "RT",
  "sites": [
    {
      "lot_info": {
        "file_id": 253608,
        "lot_id": "12NFKTB004",
        "site_id": "1",
        "execution_mode": "RT",
        "date": "2026-04-02 00:31:31",
        "tester": "ASE07-5070-026",
        "customer": "MICRON",
        "test_program": "AAH@A321320008-0"
      },
      "test_result_value": [
        {
          "serial_no": "001",
          "site_id": 1,
          "hbin": "3",
          "flag": 1,
          "real_time": "2026-04-02 00:32:51",
          "181_Leak_H_DDR1_CA0:LEAK(F15_K9)": {
            "value": "0.123",
            "fail_reason": ">spec_max",
            "spec_max": "0.1",
            "spec_min": "-0.1",
            "unit": "nA"
          }
        }
      ]
    }
  ]
}
```

> `test_result_value` 中每個物件除固定欄位（`serial_no`、`site_id`、`hbin`、`flag`、`real_time`）外，其餘為動態的超規測項名稱（key = item_name）。

---

### `GET /api/v1/data/lots/{lot_id}`

**說明**：取得批號的所有 Site 基本資訊（不含測試數據）

**Response `data`**：
```json
{
  "lot_id": "12NFKTB004",
  "sites": [
    {
      "file_id": 253608,
      "lot_id": "12NFKTB004",
      "site_id": "1",
      "execution_mode": "RT",
      "date": "2026-04-02 00:31:31",
      "tester": "ASE07-5070-026",
      "customer": "MICRON",
      "test_program": "AAH@A321320008-0"
    }
  ]
}
```

---

## 模組四：Netlist 管理（Netlist）

### `POST /api/v1/netlist/upload`

**說明**：上傳 Netlist Excel 檔案（需 engineer 或 admin 角色）

**Request**：`multipart/form-data`

| 欄位 | 型態 | 說明 |
|------|------|------|
| `file` | `File` | `.xlsx` 格式，檔名需為 `NL-{test_program}_{security}.xlsx` |

**Response `data`**：
```json
{
  "test_program": "AAH@A321320008-0",
  "filename": "NL-AAH@A321320008-0_C.xlsx",
  "security_level": "C",
  "action": "created"
}
```

| 欄位 | 型態 | 說明 |
|------|------|------|
| `action` | `string` | `"created"` 新增 \| `"updated"` 覆蓋更新 |
| `security_level` | `string \| null` | 安全等級（A/B/C/D），從檔名解析 |

---

### `GET /api/v1/netlist/programs`

**說明**：列出所有已上傳的 Netlist Programs

**Response `data`**（陣列）：
```json
[
  {
    "id": 1,
    "test_program": "AAH@A321320008-0",
    "filename": "NL-AAH@A321320008-0_C.xlsx",
    "security_level": "C",
    "uploaded_at": "2026-05-01T10:00:00",
    "updated_at": "2026-05-01T10:00:00"
  }
]
```

---

### `GET /api/v1/netlist/programs/{test_program}/test-spec`

**說明**：查詢指定 Test Program 的 Test Spec（測試規格）

**Response `data`**（陣列）：
```json
[
  {
    "item_name": "Leak_H_DDR1_CA0:LEAK(F15_K9)",
    "fail_bin_code_min": null,
    "fail_bin_code_max": 3,
    "relax": false,
    "relax_min": null,
    "relax_max": null
  }
]
```

---

### `GET /api/v1/netlist/programs/{test_program}/netlist`

**說明**：查詢指定 Test Program 的 Netlist 接線資料

**Response `data`**（陣列）：
```json
[
  {
    "package_pin": "H9",
    "bond_finger": "F15",
    "die_pin": "CA0",
    "die_pin_raw": "CA0",
    "net_name": "DDR1_CA0",
    "unity_no": "U1"
  }
]
```

> `unity_no`：由 `nl_die_mapping` 關聯取得；電源/接地球等無對應 Die 的腳位 `unity_no` 為 `null`。
> `die_pin`：`null` 表示此封裝腳位無對應的 Die 連接（如電源球）。

---

### `GET /api/v1/netlist/programs/{test_program}/tray`

**說明**：查詢指定 Test Program 的 Tray 規格（Tray 行列數）

**Response `data`**（單筆物件）：
```json
{
  "col_count": 8,
  "row_count": 10
}
```

---

### `GET /api/v1/netlist/programs/{test_program}/die-mapping`

**說明**：查詢 Die Pin → Unity 對應表

**Response `data`**（陣列）：
```json
[
  {
    "die_pin": "CA0",
    "unity_no": "U1"
  }
]
```

---

### `GET /api/v1/netlist/programs/{test_program}/stacking-die`

**說明**：查詢疊層 Die 結構（Stacking Die 層次）

**Response `data`**（陣列）：
```json
[
  {
    "layer_no": 1,
    "unity_no": "U1",
    "is_substrate": false
  }
]
```

---

### `GET /api/v1/netlist/programs/{test_program}/bin-name`

**說明**：查詢 SBIN → HBIN 對應表（Bin Name）

**Response `data`**（陣列）：
```json
[
  {
    "sw_bin_no": 3,
    "sw_bin_name": "Short_Fail",
    "hw_bin_no": 3,
    "hw_bin_name": "Short",
    "bin_test_type": "RT"
  }
]
```

---

### `GET /api/v1/netlist/programs/{test_program}/bin-priority`

**說明**：查詢 HBIN 優先順序（Bin Priority）

**Response `data`**（陣列）：
```json
[
  {
    "hw_bin_no": 3,
    "hw_bin_name": "Short",
    "bin_test_type": "RT",
    "priority_no": 1
  }
]
```

---

## 模組五：Failure Analysis（Analysis）

### `GET /api/v1/analysis/fail-sample`

**說明**：Fail Sample List 分析——結合 MongoDB 測試資料與 PostgreSQL Netlist，回傳每個失效 DUT 的接線位置與 Die 資訊

**需要認證**：是

**Query Params**：

| 參數 | 型態 | 必填 | 說明 |
|------|------|------|------|
| `lot_id` | `string` | ✅ | 批號，例如 `"12NFKTB004"` |
| `hbin` | `int` | ✅ | 故障類型（Short=3 / Open=2 / Leak=4）|

**前提條件**：對應的 `test_program` 必須已上傳 Netlist，否則回傳 404。

**Response `data`**：
```json
{
  "lot_id": "12NFKTB004",
  "hbin": 3,
  "test_program": "AAH@A321320008-0",
  "total_duts": 16,
  "fail_sample": [
    {
      "dut_no": 1,
      "ball_name": ["F15_H9", "F15_K9"],
      "die_no": ["U1", "U1"],
      "bond_finger": ["F15", "F15"]
    },
    {
      "dut_no": 2,
      "ball_name": [],
      "die_no": [],
      "bond_finger": []
    }
  ]
}
```

| 欄位 | 型態 | 說明 |
|------|------|------|
| `total_duts` | `int` | 所有 site 合計的 DUT 數量 |
| `fail_sample` | `array` | 每個 DUT 一筆，無 fail 條件的 DUT ball_name/die_no/bond_finger 均為空陣列 |
| `ball_name[i]` | `string` | BGA Ball 位置（括號內字串，例如 `"F15_H9"`） |
| `die_no[i]` | `string` | 對應的 Unity 編號（例如 `"U1"`）；**與 ball_name 1:1 對應** |
| `bond_finger[i]` | `string` | 對應的 Bond Finger；netlist 無對應時為空字串 `""` |

> **重要**：`ball_name`、`die_no`、`bond_finger` 三個陣列的 index 嚴格 1:1 對應，前端可用 `ball_name[i]` ↔ `die_no[i]` ↔ `bond_finger[i]` 方式取得完整一組資料。

---

## 附錄：HBIN 故障類型對照

| HBIN | 故障類型 | 說明 |
|------|----------|------|
| `2` | Open | 斷路 |
| `3` | Short | 短路 |
| `4` | Leak | 漏電 |
| `5` | Function | 功能異常 |

---

## 附錄：前端串接注意事項

1. **認證**：登入後將 `access_token` 存入 localStorage 或 Pinia store，每個請求 Header 加上 `Authorization: Bearer <token>`
2. **Token 過期**：`expires_in` 為秒數，建議前端在快過期時自動提示重新登入（目前後端無 refresh token）
3. **統一錯誤處理**：所有 API 失敗均回傳 `code != 0`，建議在 axios interceptor 統一處理
4. **404 v.s. 空陣列**：查無資料時後端回傳 `404`（不是 `data: []`），前端需注意區分「無資料」與「API 錯誤」
5. **Netlist 上傳**：使用 `multipart/form-data`，欄位名稱固定為 `file`
6. **路由 URL encode**：`test_program` 可能含有 `@` 符號（如 `AAH@A321320008-0`），URL 中需 encode 為 `%40`
