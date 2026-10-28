# File Upload 頁面：前端開發 Handoff（v7）

**視覺與互動參照：** `File Upload v7 Drawer (standalone).html`，可離線開啟。
版面、樣式、互動以這份檔案為準。檔案內的資料全部是寫死的示範資料，**不代表真實資料或 API**。

> 本文件標示 `⚠ 待確認` 的地方，是設計階段推測、還沒和後端或資料庫確認的內容，請在開發前跟需求方確認。

---

## 0. 範圍與權限

- 頁面路由：`File Upload`（頂部導覽列第二個分頁）。
- 只有 **engineer 以上**的角色能進入這一頁。viewer 主選單看不到入口，所以頁面內不必處理 viewer 狀態。
- 支援 dark / light 主題，由導覽列右上角切換。色票可參考 v7 HTML 內 `:root[data-theme]` 的 CSS 變數但還是以原本網頁CSS配色為主。

## 1. 版面結構

```
┌ Navbar（54px）──────────────────────────────────────────────┐
├──────────────┬──────────────────────────────────────────────┤
│ 左欄 320px   │ 右欄：資料預覽區（佔剩餘寬度，最小 1020px）    │
│ ① 上傳主題   │                                              │
│ [上傳檔案]鈕 │ ④ 資料預覽                                     │
│ ② 已上傳檔案 │                                              │
│   （分頁）    │                                              │
└──────────────┴──────────────────────────────────────────────┘
                    ③ 上傳抽屜：從右側滑出，寬 440px，蓋在預覽區上
```

- 畫面高度固定為 100vh。左欄清單、上傳佇列、預覽表格都在**各自的區塊內捲動**，整頁不捲動。
- 視窗寬度不足時，`body-row` 允許水平捲動。預覽區最小寬度 1020px，確保 Fail Sample 的 12 個欄位不需要橫向捲動就能顯示完整。

---

## 2. 區域 ①：上傳主題

| 項目 | 規格 |
|---|---|
| 元件 | 單選下拉 |
| 選項 | `Fail Sample`（預設）、`Netlist` |
| 切換主題時 | ① 載入已上傳清單並回到第 1 頁 ② 清空搜尋 ③ 清空預覽選取 ④ 更換上傳抽屜的檔名提示、注意事項與允許的副檔名 ⑤ 保留上傳佇列（依主題保留各自的佇列） |

**依主題而不同的設定：**

| | Fail Sample | Netlist |
|---|---|---|
| 允許副檔名 | `.json` | `.xlsx` |
| 檔名規則 | `{Test_Program}_{Lot_ID}__{模式}_{時間}.json` | `NL-{Test_Program}_({Security}).xlsx` |
| 檔名範例 | `AAH@A321320006-0_28NFFQB006__AT_20260724011913.json` | `NL-AAH@A314260012-0_(Security C).xlsx` |
| 重複上傳 | 建立**獨立新批次**，不會去重，也不會清掉舊資料 | 同一 test_program **直接覆蓋**舊版本，相關快取一併清除 |
| 預覽可輸出 CSV | 是 | 否 |

---

## 3. 區域 ②：已上傳檔案

**資料來源：** 後端資料庫裡已經上傳的批次。

| 項目 | 規格 |
|---|---|
| 標題右側 | `共 N 批`（N 為目前搜尋條件下的總數） |
| 搜尋 | 單一輸入框，模糊比對 Lot ID、test_program、檔名。輸入後回到第 1 頁。（建議由後端處理搜尋，並加 300ms debounce） |
| 分頁 | **一頁 10 筆**。底部顯示 `第 x / y 頁`、上一頁 ‹、頁碼、下一頁 › |
| 排序 | 依上傳時間由新到舊 |
| 文字顯示 | 所有內容**換行完整顯示**，不截斷也不用「…」，卡片寬度固定 |
| 點選卡片 | 將該卡片標示為選取（藍框和底色），並在預覽區載入該批次 |

**每張卡片顯示的欄位：**

| Fail Sample | Netlist |
|---|---|
| 標題：Lot ID；旁邊是 tag：`AT` / `RT`（execution_mode） | 標題：Test Program |
| Test Program | 檔名 |
| 匯入時間 | 上傳時間 |
| 來源檔案（原始檔名） | 上傳者 |
| 上傳者 | |

---

## 4. 區域 ③：上傳抽屜

### 4.1 開啟與關閉
- 左欄的 `上傳檔案` 主按鈕可以開啟抽屜。佇列裡有待上傳的檔案時，按鈕要顯示數量，例如 `上傳檔案（2）`。
- 抽屜從右側滑出，寬 440px，動畫 0.22s。下方加半透明遮罩。
- 三種關閉方式：右上角 ✕、點遮罩、按 `Esc`。
- 關閉抽屜**不會**清空佇列，也**不會**中斷正在進行的上傳。

### 4.2 拖放區
- 支援拖曳和點擊選檔，**可以一次選多個檔案**。(已實做成功可沿用既有功能)
- 拖放區比例為 6:4，高度上限 200px。
- 拖放區下方的提示文字依主題顯示副檔名和檔名規則。

### 4.3 驗證與警示
| 情況 | 處理方式 |
|---|---|
| 副檔名不符合目前主題 | **不加入佇列**。在拖放區下方顯示紅色警示：`檔案格式不符合需求，已略過 N 個檔案（本主題僅接受 .json）：` 後面列出檔名，可以用 ✕ 關閉 |
| 副檔名正確，但檔名格式不符合規則 | ⚠ 待確認：要在前端擋下，還是加入佇列後由後端回傳失敗？v7 示範的是加入佇列，狀態顯示 `失敗：檔名格式不符` |
| 上傳注意事項（金色） | 可收合的 `<details>`，預設收合，內容依主題切換（見 §2 的「重複上傳」） |

### 4.4 上傳佇列
- 每列：檔案圖示、檔名（單行，過長用「…」截斷，滑鼠移上去看完整檔名）、狀態 badge、移除鈕 ✕。
- 點選佇列中的檔案時，預覽區會**在前端直接解析這個本地檔案**來預覽（見 §5.4）。

| 狀態 | badge 文字 | 可以移除 | 說明 |
|---|---|---|---|
| `pending` | 待上傳 | ✓ | 剛加入佇列 |
| `uploading` | 上傳中… | ✗ | 建議顯示進度百分比 |
| `success` | 匯入成功 | ✗ | 成功後，已上傳清單要重新載入 |
| `failed` | 失敗：{原因} | ✓ | **不提供重試**，使用者要重新選擇檔案 |

- **清空**：移除所有`success`、 `pending` 和 `failed` 的檔案。
- **全部上傳**：把所有 `pending` 的檔案一次送出，**不提供逐檔上傳**。送出後按鈕先停用，等全部完成再恢復。
- 佇列是暫存狀態，重新整理頁面後就會消失，不需要保存。

---

## 5. 區域 ④：資料預覽

### 5.1 共通
- 沒有選取任何檔案時，顯示空狀態：`點選左側已上傳檔案或上傳佇列中的檔案以預覽內容`。
- **標題列：** `資料預覽`，右邊是檔名（單行，過長用「…」截斷），再右邊是來源 badge（`已上傳批次`）。只有 Fail Sample 會再加 `輸出 CSV` 按鈕。
- **資訊區：** 目前預設是固定 3 欄的格線。每格上方是欄位名稱，下方是值，所有格子底色一致。
- **控制列：** 左邊是下拉選單，右邊是搜尋框。
- **表格：**
  - 表頭固定在上方，表頭文字和資料庫欄位一致，例如 `serial_no` 顯示為 `serial_no`
  - **每個欄位都能排序**：點一下升冪 ▲，再點一下降冪 ▼。數值欄依數值排序，文字欄依字典序
  - **每頁 100 列**，切頁器的頁碼會折疊，例如 `1 … 4 5 6 … 16`
  - 底部顯示 `符合 N 列（共 M 列）`，有搜尋條件時改成 `符合 N 列（已篩選，原 M 列）`
  - 搜尋或篩選時，**只重新繪製表格內容**，輸入框不能失去焦點，下拉選單也不能被關掉
  - 搜尋、篩選、排序條件改變時，回到第 1 頁
- **全部資料都要能看到**，沒有 200 筆的上限，資料靠切頁瀏覽。資料量大時建議由後端分頁，請求時帶上 `page`、`page_size`、`sort`、`order`、`q`、`filter`。

### 5.2 Fail Sample（.json）

**Lot info（資訊區）：**
`customer`、`test_program`、`lot_id`、`wafer_id`、`hbin`、`execution_mode`、`tester`、`date`、`qty`

**控制列：**
- Site 篩選下拉：**可以複選**，每個選項顯示 `Site {id}（{site_qty} 顆／{列數} 列）`，下方有 `全選`、`全部清除`。預設全選。按鈕文字顯示 `Site 篩選：已選數 / 總數`。
- 搜尋框：比對表格內所有欄位，任一欄位包含關鍵字就算符合。

**Site table 欄位（依序）：**

| 欄位 | 說明 |
|---|---|
| `site` | 只顯示數字，例如 `1`，不要寫成 `Site 1` |
| `serial_no` | |
| `real_time` | |
| `test_item` | |
| `value` | |
| `spec_min` | |
| `spec_max` | |
| `unit` | |
| `pin_1` | 範例檔裡是空字串，空值時顯示空白 |
| `pin_2` | 同上 |
| `fail_reason` | 紅字顯示 |
| `ihbin` | |

- 原始 json 是巢狀結構（site → serial → test result）。表格要**攤平成一列一個 test result**，再補上該列所屬的 `site` 和 `serial_no`。
- **輸出 CSV**： 一律輸出整份檔案，與前端頁面操作篩選的結果無關，欄位順序和表格相同，編碼用 UTF-8 with BOM，避免 Excel 開啟中文時亂碼。

### 5.3 Netlist（.xlsx）

**資訊區：**
`file_name`、`test_program`、`security`、`sheet`（sheet 數量預設可以寫6，因為資料是從xlsx檔拆分後取得所以可能無法直接得知此檔案到底有幾個sheet，只能透過呼叫API取得是否有此table的資料，如果有就代表有此sheet資料，可討論）、`uploader`、`update_time`

**控制列：**
- Sheet 下拉：**單選**，每個選項顯示 `{sheet 名稱}（{列數} 列）`，預設是 `Netlist`。切換 sheet 時要重設排序、搜尋和頁碼。
- 搜尋框：比對目前 sheet 的所有欄位。

**各 sheet 欄位：**
以下各sheet欄位以經比對過資料庫欄位，
| Sheet | 欄位（依序） | 備註 |
|---|---|---|
| Netlist | `package_pin`、`bond_finger`、`die_pin`、`die_unity`、`net_name` | `die_pin` 請顯示原始值（die_pin_raw）。`die_unity` 見下方說明 |
| Test_Spec | `item_name`、`fail_bin_code_min`、`fail_bin_code_max`、`relax`、`relax_min`、`relax_max` | 在 xlsx 裡，relax 三欄是 `BGAName2` 右邊的 Relax / RelaxMin / RelaxMax。值的例子：`Y` / 負值 / 正值 |
| Bin_Priority | `hw_bin_no`、`hbin_bin_name`、`bin_test_type`、`priority_no` | |
| Bin_Name | `sw_bin_no`、`sw_bin_name`、`hw_bin_no`、`hw_bin_name`、`bin_test_type` | |
| Stacking_Die | `layer`、`unity` | 舊版欄位名是 `die_number` / `stack_level` |
| Tray | `column`、`row` | |

**`die_unity` 的對應規則：**
- 會需要呼叫api /api/v1/netlist/programs/{test_program}/die-mapping 取得unity的配對資料
- 可用 `die_pin_raw` **小數點前**的部分去比對：`Y52P_0204_01.37` 取 `Y52P_0204_01`，對應到 `U1` 或是直接使用 `die_pin`去配對。
- 對應**不是**用 Stacking_Die 的 unity。
- 找不到對應時顯示空白。

> 已上傳的批次如果後端已經存好資料庫欄位，直接用資料庫欄位即可，上面的欄位對應主要是給**本地解析待上傳 xlsx** 時使用。

### 5.4 預覽資料來源

| 來源 | 做法 |
|---|---|
| 已上傳批次 | 呼叫後端預覽 API，由後端分頁、排序、搜尋 |
| 待上傳檔案 | 這裡不處理 "待上傳檔案"的預覽功能 |
| 解析失敗或檔名不符 | 預覽區顯示紅色錯誤狀態：`檔名格式不符，無法解析內容`，下方附上正確的檔名規則 |

---

## 6. API 契約草案（⚠ 可開出需求列出待我與後端確認）

以下是前端可能需要的資料形狀，欄位名稱的草案，可以目前後端提供之API為準修改若已存在此方法可提出或修正。

```ts
type Topic = 'fail_sample' | 'netlist';

// GET /api/uploads?topic=&page=1&page_size=10&q=
interface UploadListResp {
  total: number;
  page: number;
  page_size: number;
  items: FailSampleBatch[] | NetlistFile[];
}
interface FailSampleBatch {
  id: string;
  lot_id: string;
  execution_mode: 'AT' | 'RT';
  test_program: string;
  imported_at: string;   // ISO 8601
  source_file: string;
  uploader: string;
}
interface NetlistFile {
  id: string;
  test_program: string;
  file_name: string;
  security: string;
  uploaded_at: string;
  uploader: string;
}

// GET /api/uploads/fail_sample/:id/preview?sites=1,2&q=&sort=value&order=asc&page=1&page_size=100
interface FailSamplePreview {
  lot_info: {
    customer: string; test_program: string; lot_id: string; wafer_id: string;
    hbin: string; execution_mode: 'AT' | 'RT'; tester: string; date: string; qty: number;
  };
  sites: { site_id: number; site_qty: number; row_count: number }[]; // 給 Site 下拉使用
  total: number;      // 篩選前的總列數
  matched: number;    // 篩選後的列數
  rows: {
    site: number; serial_no: string; real_time: string; test_item: string;
    value: string; spec_min: string; spec_max: string; unit: string;
    pin_1: string; pin_2: string; fail_reason: string; ihbin: string;
  }[];
}

// GET /api/uploads/netlist/:id/meta
interface NetlistMeta {
  file_name: string; test_program: string; security: string;
  sheets: { name: string; row_count: number }[];
  uploader: string; update_time: string;
}
// GET /api/uploads/netlist/:id/sheets/:sheet?q=&sort=&order=&page=1&page_size=100
interface NetlistSheetPage {
  columns: string[];
  total: number;
  matched: number;
  rows: Record<string, string>[];
}

// GET /api/uploads/fail_sample/:id/export.csv?sites=&q=&sort=&order=

// POST /api/uploads?topic=   multipart/form-data, files[]
interface UploadResp {
  results: {
    file_name: string;
    status: 'success' | 'failed';
    batch_id?: string;
    error_code?: string;   // 例如 INVALID_FILENAME、PARSE_ERROR、PAYLOAD_TOO_LARGE
    error_message?: string;
  }[];
}
```

**上傳的實作方式：** ⚠ 待確認：要一次請求送出所有檔案，還是一檔一個請求、並行送出（建議並行數 3）？逐檔送出比較容易顯示各檔的進度和失敗原因。

---

## 7. Mockup 中的示範資料（實際請已目前呼叫後端API取得資料為主）

- 已上傳清單的筆數、上傳者 `D8386`、各種時間值
- Fail Sample 的 Site 2–6，是由 Site 1 的資料推導出來的，實際請依據API呼叫所得資料進行拆分
- Netlist 各 sheet 的完整列數（1,572 / 1,057…），是用少量樣本列重複展開出來的，實際列述請依照各sheet對應的資料庫table來抓取對應內容的數量
- 上傳佇列裡的初始檔案和狀態，以及紅色格式錯誤警示裡的檔名請以實際上傳檔案檔名為主

## 8. 待確認清單

1. 切換主題時，上傳佇列各自保留
2. 檔名格式不符時，前端要直接擋下，若略過了前端送到後端，後端也需檢驗然後回傳失敗
3. 「清空」一併清掉 `success` 的項目
4. CSV 是輸出整份檔案
5. 上傳可以採用逐檔並行(可以以目前已開發成功的邏輯為主)
6. 已上傳清單的排序方式預設採用以日期做降幕排序(日期越新的越上面)，先不支援刪除或重新匯入
7. 單檔大小上限目前看起來部會超過1M所以先設定2M
