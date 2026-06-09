# ACT Failure Analysis System — IIS 佈署指南

> 最後更新：2026-06-09
> 說明：本文件適用於初次佈署，涵蓋「本機 IIS」與「遠端 IIS」兩種情境

---

## 一、名詞解釋與架構概念

### 1.1 什麼是 `dist/`？

執行 `npm run build` 後，Vite 會將所有 TypeScript + React 原始碼「編譯」成瀏覽器看得懂的靜態檔案，輸出在 `dist/` 資料夾：

```
dist/
├── index.html          ← 網站首頁（只有這一個 HTML）
├── web.config          ← IIS 設定（從 public/ 複製過來）
├── favicon.svg
└── assets/
    ├── index-xxxx.js   ← 所有程式邏輯（已壓縮，約 1MB）
    └── index-xxxx.css  ← 所有樣式
```

**重點：`dist/` 就是完整的網站，IIS 只需要這個資料夾。原始碼、node_modules 都不需要複製。**

### 1.2 IIS 的角色

IIS（Internet Information Services）是 Windows Server 內建的網頁伺服器，負責：
1. 接收瀏覽器的 HTTP 請求
2. 回傳 `dist/` 裡的靜態檔案給瀏覽器
3. 透過 URL Rewrite 處理 SPA 路由（見 1.3）

### 1.3 為什麼需要 URL Rewrite？

這個 React 應用程式是 **SPA（Single Page Application）**，所有頁面切換都由前端 JavaScript 處理。
問題是：當使用者直接在瀏覽器輸入 `http://IIS位址/dashboard` 時，IIS 找不到 `dashboard` 這個實體資料夾，會回傳 404。

URL Rewrite 模組的作用是：**把所有非靜態檔案的請求都導向 `index.html`**，讓前端 JavaScript 接管路由。

```
使用者輸入 /dashboard
    ↓
IIS 找不到 dashboard 資料夾
    ↓ (URL Rewrite)
改成回傳 index.html
    ↓
React Router 讀到網址是 /dashboard
    ↓
顯示 Dashboard 頁面
```

### 1.4 API URL 是「編譯時決定的」

前端呼叫後端 API 的網址，在 `npm run build` 時就被「燒進」JS 檔案裡了。這個網址來自 `.env/.env` 的 `VITE_API_BASE_URL`。

**因此：如果需要改 API URL，必須重新 build，不能在 IIS 上動態修改。**

---

## 二、環境說明

本文件涵蓋以下兩種佈署情境：

| 情境 | Build 機（執行 npm run build） | IIS 機（提供網頁） | 後端機（API port 8001） |
|------|------|------|------|
| **情境 A：本機佈署** | 10.16.93.48 | 10.16.93.48（同一台） | 10.16.93.48 |
| **情境 B：遠端佈署** | 10.16.93.48 | **10.16.93.46**（不同台） | 10.16.93.48 |

---

## 三、Build 前設定（兩種情境通用）

### Step 1：確認 `.env/.env` 的 API 位址

開啟 `D:\ACT\Failure Analysis System\Frontend\.env\.env`，確認以下內容：

```ini
VITE_API_BASE_URL=http://10.16.93.48:8001
```

> - 這個 IP 是**後端的 IP**（後端固定在 10.16.93.48:8001）
> - 無論前端部署在哪台機器，這個 URL 都填後端的位址
> - **修改後必須重新 build 才會生效**

### Step 2：執行 Build

在 `10.16.93.48` 的 PowerShell 執行：

```powershell
$env:PATH = "C:\nvm4w\nodejs;C:\nvm4w;$env:PATH"
cd "D:\ACT\Failure Analysis System\Frontend"
& "C:\nvm4w\nodejs\npm.cmd" run build
```

Build 成功後，確認輸出：

```powershell
Get-ChildItem "D:\ACT\Failure Analysis System\Frontend\dist"
```

應看到：`index.html`、`web.config`、`assets/`、`favicon.svg`、`lock.png`、`user.png`

---

## 四、情境 A：本機佈署（IIS 與 Build 機同一台 10.16.93.48）

> 若要在 10.16.93.46 佈署，請跳至**第五節**。

### Step A-1：安裝 URL Rewrite 模組

1. 在 10.16.93.48 的瀏覽器開啟：
   `https://www.iis.net/downloads/microsoft/url-rewrite`
2. 點選 **Download this extension**
3. 下載 **`rewrite_amd64_en-US.msi`**（64位元版本）
4. 雙擊執行安裝，一路按「Next」和「I accept」完成
5. 安裝完成後，開啟 PowerShell 執行：
   ```powershell
   iisreset
   ```

### Step A-2：在 IIS Manager 建立網站

1. 按 `Win + S` 搜尋 `inetmgr`，開啟 **Internet Information Services (IIS) Manager**
2. 左側面板展開 → 找到 **Sites**
3. 右鍵 **Sites** → 選 **Add Website...**
4. 填入以下資訊：

   | 欄位 | 填入值 | 說明 |
   |------|--------|------|
   | **Site name** | `ACT-Frontend` | 網站識別名稱，可自訂 |
   | **Physical path** | `D:\ACT\Failure Analysis System\Frontend\dist` | 指向 build 產出的 dist 資料夾 |
   | **Type** | http | 選 http |
   | **IP address** | All Unassigned | 監聽所有 IP |
   | **Port** | `5001` | 避開後端的 8001，選其他空閒的 port |
   | **Host name** | （留空） | 不填 |

5. 按 **OK**

### Step A-3：設定 Application Pool

Application Pool 是 IIS 執行網站的隔離環境，純靜態網站不需要 .NET：

1. 左側 → **Application Pools**
2. 找到 `ACT-Frontend`（建立網站時自動建立）
3. 右鍵 → **Advanced Settings...**
4. 修改：
   - **.NET CLR Version** → 改為 **No Managed Code**
   - **Start Mode** → 改為 **AlwaysRunning**（選用）
5. 按 **OK**

### Step A-4：設定資料夾讀取權限

IIS 使用 `IIS_IUSRS` 帳號讀取網站檔案，需要給予讀取權限：

```powershell
icacls "D:\ACT\Failure Analysis System\Frontend\dist" /grant "IIS_IUSRS:(R)" /T
```

看到 `1 個檔案/目錄已成功處理` 即完成。

### Step A-5：設定防火牆（讓其他機器能存取）

```powershell
New-NetFirewallRule -DisplayName "ACT Frontend Port 5001" `
                   -Direction Inbound -Protocol TCP `
                   -LocalPort 5001 -Action Allow
```

### Step A-6：驗證

開啟瀏覽器前往 `http://10.16.93.48:5001`，應顯示登入頁面。

---

## 五、情境 B：遠端佈署（Build 機 10.16.93.48 → IIS 機 10.16.93.46）

### Step B-1：將 `dist/` 複製到 IIS 機（10.16.93.46）

**方式 1：從 10.16.93.48 直接複製（透過網路共享）**

```powershell
# 在 10.16.93.48 的 PowerShell 執行
# 先連線到 10.16.93.46 的管理員共享（輸入 10.16.93.46 的管理員帳密）
net use \\10.16.93.46\C$ /user:Administrator

# 在 10.16.93.46 建立目標資料夾
New-Item -ItemType Directory -Path "\\10.16.93.46\C$\inetpub\ACT-Frontend" -Force

# 複製 dist/ 到 IIS 機
Copy-Item -Path "D:\ACT\Failure Analysis System\Frontend\dist\*" `
          -Destination "\\10.16.93.46\C$\inetpub\ACT-Frontend" `
          -Recurse -Force
```

**方式 2：手動 RDP 複製（最直覺）**

1. RDP 連進 **10.16.93.46**
2. 在 10.16.93.46 的檔案總管網址列輸入 `\\10.16.93.48\`，瀏覽到：
   `D:\ACT\Failure Analysis System\Frontend\dist`
3. 複製整個 `dist` 資料夾裡的**所有內容**
4. 在 10.16.93.46 建立資料夾 `C:\inetpub\ACT-Frontend\`，將內容貼入

完成後，10.16.93.46 的目錄結構應為：

```
C:\inetpub\ACT-Frontend\
├── index.html
├── web.config
├── favicon.svg
├── lock.png
├── user.png
└── assets\
    ├── index-xxxx.js
    └── index-xxxx.css
```

### Step B-2：在 IIS 機（10.16.93.46）安裝 URL Rewrite 模組

RDP 連進 10.16.93.46，執行：

1. 在 10.16.93.46 的瀏覽器開啟：
   `https://www.iis.net/downloads/microsoft/url-rewrite`
2. 下載並安裝 **`rewrite_amd64_en-US.msi`**
3. 安裝完成後在 PowerShell 執行：
   ```powershell
   iisreset
   ```

### Step B-3：在 IIS 機（10.16.93.46）建立 IIS 網站

1. 在 10.16.93.46 按 `Win + S` 搜尋 `inetmgr`，開啟 IIS Manager
2. 左側 → 右鍵 **Sites** → **Add Website...**
3. 填入：

   | 欄位 | 填入值 |
   |------|--------|
   | **Site name** | `ACT-Frontend` |
   | **Physical path** | `C:\inetpub\ACT-Frontend` |
   | **Port** | `5001` |
   | 其他 | 預設即可 |

4. 按 **OK**

### Step B-4：設定 Application Pool（在 10.16.93.46）

1. 左側 → **Application Pools** → 找到 `ACT-Frontend`
2. 右鍵 → **Advanced Settings...**
3. **.NET CLR Version** → **No Managed Code**
4. 按 **OK**

### Step B-5：設定資料夾讀取權限（在 10.16.93.46）

```powershell
icacls "C:\inetpub\ACT-Frontend" /grant "IIS_IUSRS:(R)" /T
```

### Step B-6：設定防火牆（在 10.16.93.46）

```powershell
New-NetFirewallRule -DisplayName "ACT Frontend Port 5001" `
                   -Direction Inbound -Protocol TCP `
                   -LocalPort 5001 -Action Allow
```

### Step B-7：驗證

開啟瀏覽器前往 `http://10.16.93.46:5001`，應顯示登入頁面。

---

## 六、後端 CORS 設定（使用 Option A 直連時必須）

無論是情境 A 還是情境 B，使用預設 Option A 時，瀏覽器會從 IIS 的 Origin 直接呼叫後端 API（10.16.93.48:8001），後端必須允許此跨域請求。

**需要告知後端 agent，將以下 Origin 加入 CORS 允許清單：**

| 情境 | 需加入的 Origin |
|------|----------------|
| 情境 A（本機 IIS） | `http://10.16.93.48:5001` |
| 情境 B（遠端 IIS） | `http://10.16.93.46:5001` |

---

## 七、API 連線方式說明

### 目前預設：Option A（直連）

```
[使用者瀏覽器]
      │
      ├──→ http://IIS_IP:5001           取得靜態網頁（index.html、JS、CSS）
      │
      └──→ http://10.16.93.48:8001/api  直接呼叫後端 API
```

**特點：** 設定最簡單，`dist/` 的 `web.config` 不需要任何修改。唯一要求是後端開啟 CORS。

---

### 備用：Option B（IIS 反向代理）

若後端無法設定 CORS，可讓 IIS 代理 API 請求：

```
[使用者瀏覽器]
      │
      └──→ http://IIS_IP:5001/...
                    │
                    ├── 靜態檔案（/、/assets/...）→ 直接回傳
                    │
                    └── /api/* → IIS 轉發 → http://10.16.93.48:8001/api/*
```

**切換步驟：**（在 Build 機 10.16.93.48 執行）

**1. 安裝 ARR 3.0 到 IIS 機**

在 IIS 機（10.16.93.46 或 10.16.93.48）的瀏覽器開啟：
`https://www.iis.net/downloads/microsoft/application-request-routing`
下載安裝後，在 IIS Manager：伺服器根節點 → **Application Request Routing Cache** → 右側 **Server Proxy Settings** → 勾選 **Enable proxy** → 按 **Apply**

**2. 修改 `public/web.config`**

開啟 `D:\ACT\Failure Analysis System\Frontend\public\web.config`，找到以下 comment 區塊，**移除包圍它的 `<!--` 和 `-->`**：

```xml
<!-- 修改前（Option B 停用狀態）：-->
<!--
<rule name="API Reverse Proxy" stopProcessing="true">
  <match url="^api/(.*)" />
  <action type="Rewrite" url="http://localhost:8001/api/{R:1}" />
</rule>
-->

<!-- 修改後（Option B 啟用，並改為正確的後端 IP）：-->
<rule name="API Reverse Proxy" stopProcessing="true">
  <match url="^api/(.*)" />
  <action type="Rewrite" url="http://10.16.93.48:8001/api/{R:1}" />
</rule>
```

**3. 修改 `.env/.env`**

```ini
# 留空，讓請求走 /api/* 相對路徑（由 IIS 代理）
VITE_API_BASE_URL=
```

**4. 重新 build 並部署**

```powershell
$env:PATH = "C:\nvm4w\nodejs;C:\nvm4w;$env:PATH"
cd "D:\ACT\Failure Analysis System\Frontend"
& "C:\nvm4w\nodejs\npm.cmd" run build
# 將新的 dist/ 複製到 IIS 機
```

---

## 八、更新版本流程

每次程式更新後，只需重複以下步驟：

### 情境 A（本機 IIS 10.16.93.48）

```powershell
# 在 10.16.93.48 執行，dist/ 直接在 IIS Physical Path 下，重新 build 即完成
$env:PATH = "C:\nvm4w\nodejs;C:\nvm4w;$env:PATH"
cd "D:\ACT\Failure Analysis System\Frontend"
& "C:\nvm4w\nodejs\npm.cmd" run build
```

### 情境 B（遠端 IIS 10.16.93.46）

```powershell
# Step 1：在 10.16.93.48 重新 build
$env:PATH = "C:\nvm4w\nodejs;C:\nvm4w;$env:PATH"
cd "D:\ACT\Failure Analysis System\Frontend"
& "C:\nvm4w\nodejs\npm.cmd" run build

# Step 2：複製新的 dist/ 到 10.16.93.46（覆蓋舊版）
Copy-Item -Path "D:\ACT\Failure Analysis System\Frontend\dist\*" `
          -Destination "\\10.16.93.46\C$\inetpub\ACT-Frontend" `
          -Recurse -Force
```

> IIS 不需要重啟，瀏覽器強制重新整理（`Ctrl+Shift+R`）即可看到新版本。

---

## 九、常見問題排除

| 問題現象 | 可能原因 | 解法 |
|----------|----------|------|
| 開啟 IIS 網址顯示 IIS 預設頁或 403 | Physical Path 設定錯誤 | 確認 Physical Path 指向 `dist/` 資料夾（內含 `index.html`），不是上層資料夾 |
| 直接輸入 `/dashboard` 顯示 IIS 404 | URL Rewrite 模組未安裝 | 安裝 `rewrite_amd64_en-US.msi`，執行 `iisreset` |
| 登入時顯示 **「無法連線到伺服器」** | `VITE_API_BASE_URL` IP 或 Port 錯誤 | 確認 `.env/.env` 的 IP 和 Port 正確，重新 build |
| 登入時顯示 **Network Error（CORS）** | 後端未開啟 CORS（Option A） | 告知後端 agent 加入 IIS 的 Origin |
| 登入帳密正確但仍失敗 | LDAP 服務問題 | 系統會顯示「LDAP 服務異常」，請聯繫管理員 |
| 頁面空白，F12 無報錯 | index.html 的資源路徑問題 | 確認 IIS 網站根目錄指向 `dist/`，而非 `dist/assets/` 或上層 |
