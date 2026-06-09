# ACT Failure Analysis System — IIS 佈署指南

> 最後更新：2026-06-09
> 適用環境：Windows Server 2022 + IIS 10 + Node.js v22 LTS

---

## 一、前置需求

| 項目 | 版本 | 說明 |
|------|------|------|
| Node.js | v22.x LTS | 用於執行 `npm run build`，部署後不需要 |
| IIS | 10（Windows Server 2022 內建）| 靜態檔案伺服器 |
| URL Rewrite 2.1 | IIS 延伸模組 | 必須安裝，處理 SPA 路由 |
| ARR 3.0 | IIS 延伸模組 | 選用，Option B 反向代理才需要 |

### 安裝 URL Rewrite 模組（必須）
1. 前往 [Microsoft IIS URL Rewrite 下載頁](https://www.iis.net/downloads/microsoft/url-rewrite)
2. 下載並安裝 `rewrite_amd64_en-US.msi`
3. 安裝完成後重新啟動 IIS（`iisreset`）

---

## 二、API 佈署選項

本系統支援兩種 API 呼叫方式：

### Option A：直連模式（預設）

```
瀏覽器 → IIS（靜態 React）
      → 後端 http://10.16.93.48:8001（直接連線）
```

- 前端直接呼叫後端 IP，設定最簡單
- **後端必須開啟 CORS**，允許 IIS 站台的 Origin（例如 `http://10.16.93.48:80`）
- `.env/.env` 設定：`VITE_API_BASE_URL=http://10.16.93.48:8001`

### Option B：IIS 反向代理（進階）

```
瀏覽器 → IIS（靜態 React + /api/* 代理）→ 後端 localhost:8001
```

- 所有 API 請求都由 IIS 轉發，**不需要 CORS 設定**
- 需額外安裝 ARR 3.0 模組
- 步驟：
  1. 安裝 [ARR 3.0](https://www.iis.net/downloads/microsoft/application-request-routing)
  2. 修改 `.env/.env`：`VITE_API_BASE_URL=`（留空）
  3. 修改 `public/web.config`：取消 `API Reverse Proxy` rule 的 comment
  4. 重新執行 build

---

## 三、建置步驟

### 3.1 確認環境檔案

確認 `.env/` 資料夾存在以下檔案（已加入 `.gitignore`，需手動建立）：

**`.env/.env`**（正式環境設定）：
```env
VITE_API_BASE_URL=http://10.16.93.48:8001
```

**`.env/.env.dev`**（開發環境，build 時不使用）：
```env
VITE_API_BASE_URL=
DEV_API_TARGET=http://localhost:8001
```

### 3.2 安裝依賴

```powershell
cd "D:\ACT\Failure Analysis System\Frontend"
npm install
```

### 3.3 執行建置

```powershell
npm run build
```

> 指令實際執行：`tsc -b && vite build --mode prod`
> 建置產出在 `dist/` 資料夾

### 3.4 確認產出

```powershell
Get-ChildItem "D:\ACT\Failure Analysis System\Frontend\dist"
# 應包含：index.html、web.config、assets/ 等
```

---

## 四、IIS 設定步驟

### 4.1 建立 IIS 網站

1. 開啟 **IIS Manager**（`inetmgr`）
2. 右鍵 **Sites** → **Add Website**
3. 填入設定：

| 欄位 | 值 | 說明 |
|------|-----|------|
| Site name | `ACT-Frontend` | 任意名稱 |
| Physical path | `D:\ACT\Failure Analysis System\Frontend\dist` | 指向 dist 資料夾 |
| Port | `5001`（或其他未佔用的 port） | 避開後端的 8001 |
| Application Pool | `ACT-Frontend` | 新建或沿用 |

### 4.2 設定 Application Pool

1. 開啟 **Application Pools**
2. 選擇 `ACT-Frontend` → **Advanced Settings**
3. 設定：
   - `.NET CLR Version`：**No Managed Code**（純靜態網站）
   - **Start Mode**：AlwaysRunning

### 4.3 設定資料夾權限

確保 IIS 有讀取 `dist/` 資料夾的權限：

```powershell
icacls "D:\ACT\Failure Analysis System\Frontend\dist" /grant "IIS_IUSRS:(R)" /T
```

### 4.4 驗證 web.config

`dist/web.config` 應已由 `npm run build` 自動從 `public/web.config` 複製過來。

確認內容包含 SPA Routes rewrite rule（此為 SPA 運作必要條件）。

---

## 五、驗證佈署

### 5.1 基本連線測試

在瀏覽器開啟：`http://10.16.93.48:5001`

- ✅ 應顯示登入頁面
- ✅ 用工號/密碼登入成功
- ✅ Dashboard 資料正常顯示

### 5.2 直接 URL 存取測試（SPA 路由）

直接在瀏覽器輸入：`http://10.16.93.48:5001/dashboard`

- ✅ 應顯示 Dashboard（若未登入會跳回 `/login`）
- ❌ 若顯示 IIS 404 → `web.config` 的 URL Rewrite 未生效，確認 URL Rewrite 模組已安裝

### 5.3 API 連線測試（Option A）

登入後，按 F12 → Network，確認 `/api/v1/auth/me` 回傳 200。

---

## 六、更新佈署流程

每次程式更新後，執行以下步驟：

```powershell
# 1. 停止 IIS 網站（選用，避免檔案鎖定）
& "$env:SystemRoot\System32\inetsrv\appcmd.exe" stop site "ACT-Frontend"

# 2. 重新建置
cd "D:\ACT\Failure Analysis System\Frontend"
npm run build

# 3. 重新啟動 IIS 網站
& "$env:SystemRoot\System32\inetsrv\appcmd.exe" start site "ACT-Frontend"
```

---

## 七、常見問題排除

| 問題 | 原因 | 解法 |
|------|------|------|
| 直接輸入 URL 顯示 IIS 404 | URL Rewrite 模組未安裝 | 安裝 URL Rewrite 2.1 並重啟 IIS |
| 登入後 API 呼叫失敗（CORS 錯誤）| Option A 但後端未開啟 CORS | 後端加入前端 Origin；或改用 Option B |
| 登入後 API 呼叫失敗（404）| `VITE_API_BASE_URL` 設定錯誤 | 確認 `.env/.env` 的 IP/Port 正確後重新 build |
| 字體或圖示無法顯示 | `.woff2` MIME 類型缺失 | `web.config` 已包含此 MIME 設定，確認有正確複製 |
| 頁面空白（console 無錯誤）| `index.html` base path 錯誤 | 確認 IIS 網站根目錄指向 `dist/`，非上層資料夾 |
