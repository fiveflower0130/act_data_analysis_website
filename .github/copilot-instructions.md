# Copilot 全域指示文件

> 本文件為**全域核心規則**，詳細分類規則請參閱 `.github/instructions/` 資料夾內的對應文件。

## 全域規則

- **回應語言**：所有回應一律使用**繁體中文**，檔案名稱、專有名詞、特殊技術用詞除外。
- **大變更確認**：在進行程式變更時，如果變更量有可能超過 200 行，請事先確認「這個指示的程式變更量可能會超過 200 行，您是否要執行？」
- **大變更計畫**：對於大的變更，首先制定計畫，然後告訴使用者「我打算這樣進行計畫。」如果使用者要求修正計畫，請進行調整後再提議。
- **指示文件同步**：若有更新程式內容，請同時更新 `.github/copilot-instructions.md` 及 `.github/instructions/` 內相關的對應指示文件，以確保指示文件與程式碼保持一致。

---

## 參考文件索引

| 文件 | 說明 |
|------|------|
| `.github/instructions/act-data-structure.instructions.md` | ACT 數據結構說明（MongoDB 文件結構、查詢邏輯、Response 格式設計） |
| `.github/instructions/netlist-data-structure.instructions.md` | Netlist Excel 資料結構說明（6個Sheet、比對邏輯、圖表設計）|
| `.github/instructions/coding-standards.instructions.md` | 程式撰寫風格、品質、測試規範 |
| `.github/instructions/git-commit-message-style.instructions.md` | Conventional Commits 規格說明 |
| `.github/instructions/git-workflow.instructions.md` | Git 版本控制初始化、commit 規範、分支策略 |
| `.github/instructions/project-architecture.instructions.md` | 系統架構、資料流、模組職責、API 設計 |
| `.github/instructions/project-docs.instructions.md` | 專案文件管理（to-do-list、週報、README） |
| `.github/instructions/project-overview.instructions.md` | 專案背景、目標、環境需求、路徑資訊 |
| `.github/instructions/tech-stack.instructions.md` | 技術堆疊（語言、框架、資料庫、工具） |
