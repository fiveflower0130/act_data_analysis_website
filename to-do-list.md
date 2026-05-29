# ACT Failure Analysis System Frontend — 待辦事項清單

> 最後更新：2026-05-29
> 分析工具：GitHub Copilot
> 說明：本文件記錄前端專案的待辦事項，依優先度分類管理，並於每次變更後同步更新狀態與修改紀錄。

---

## 🔴 P0 — 極高優先

| # | 狀態 | 問題描述 | 位置 |
|---|------|----------|------|
| 1 | 🔄 | 前端技術選型確認（框架、狀態管理、UI Library、HTTP client） | 規劃階段 |

---

## 🟠 P1 — 高優先

| # | 狀態 | 問題描述 | 位置 |
|---|------|----------|------|
| 2 | ⬜ | 專案初始化（Vite + Vue3 / React 等框架 scaffold） | 根目錄 |
| 3 | ⬜ | 設計系統建立（色彩、字型、Lucide Icon 套用） | `src/styles/` |
| 4 | ⬜ | 路由規劃與全域版面（Navbar / Sidebar / Layout） | `src/layouts/` |
| 5 | ⬜ | 認證模組（Login 頁、JWT 管理、路由守衛） | `src/features/auth/` |

---

## 🟡 P2 — 中優先

| # | 狀態 | 問題描述 | 位置 |
|---|------|----------|------|
| 6 | ⬜ | 主儀表板頁（LOT 搜尋、Fail Mode 篩選） | `src/features/dashboard/` |
| 7 | ⬜ | Fail Sample List 表格元件 | `src/features/analysis/` |
| 8 | ⬜ | Fail Sample on Tray 圖表元件 | `src/features/analysis/` |
| 9 | ⬜ | Fail Die / Fail Die Rate 圖表元件 | `src/features/analysis/` |
| 10 | ⬜ | Fail Ball 圖表元件 | `src/features/analysis/` |
| 11 | ⬜ | Netlist 管理頁（上傳、列表） | `src/features/netlist/` |

---

## 🔵 P3 — 低優先

| # | 狀態 | 問題描述 | 位置 |
|---|------|----------|------|
| 12 | ⬜ | 歷史紀錄頁 | `src/features/history/` |
| 13 | ⬜ | 使用者管理頁（admin） | `src/features/users/` |
| 14 | ⬜ | 分析報告匯出功能 | `src/features/export/` |
| 15 | ⬜ | 深色 / 淺色主題切換 | `src/styles/` |

---

## 修改紀錄

| 日期 | 項目 | 變更內容 | 負責人 |
|------|------|----------|--------|
| 2026-05-29 | 全部 | 建立 to-do-list.md 初始版本 | Dante |
