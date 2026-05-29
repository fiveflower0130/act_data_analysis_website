# ACT Failure Analysis System — Frontend

> 專案版本：v0.1.0
> 維護者：Dante
> 最後更新：2026-05-29

---

## 專案概述

本專案為 **ACT Data Analysis System Frontend**，是以 ACT 測試資料為主所建構的分析平台，提供封裝廠測試工程師（RD / PE / EE）分析 5920 團隊 ACT 測試內容所需的圖表與互動介面。

---

## 功能模組

| 模組 | 說明 |
|------|------|
| 登入認證 | LDAP 帳號登入，JWT Token 管理 |
| 主儀表板 | LOT ID 查詢、Fail Mode 篩選、5 種圖表分析 |
| Netlist 管理 | 上傳 / 管理 Netlist Excel 檔案 |
| 歷史紀錄 | 瀏覽查詢歷史 |
| 使用者管理 | 帳號與角色管理（admin 限定） |

---

## 系統需求

- **解析度**：桌面工作站 1440 × 900（主要）
- **瀏覽器**：現代瀏覽器（Chrome / Edge）

---

## 後端 API

- **Base URL**：`http://10.16.93.48:8001/api/v1`
- **Swagger 文件**：`http://10.16.93.48:8001/docs`
- **認證方式**：JWT Bearer Token

---

## 安裝與執行

> 技術選型確認後補充。

---

## 專案結構

> 架構確認後補充。

---

## 相關文件

| 文件 | 路徑 |
|------|------|
| API Contract | `.github/instructions/api-contract-structure.instructions.md` |
| UI/UX 設計 | `.github/instructions/ui-ux-design.instructions.md` |
| 待辦事項 | `to-do-list.md` |
| 工作報告 | `docs/reports/` |
