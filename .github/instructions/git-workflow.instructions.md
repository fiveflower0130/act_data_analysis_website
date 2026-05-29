---
applyTo: "**"
---

# Git 工作流程規範

## Git 版本控制初始化

在專案開始動作前，請先確認此專案是否有做 `git` 版本控制：

- **若沒有**：請先使用 `git init` 初始化版本控制，建立 `master` 分支並建立初始提交（initial commit），然後再從 `master` 建立 `Dante` 分支。
- 後續所有開發皆在 `Dante` 分支或功能 branch 上進行。

## Git .gitignore 規範
- 請確保專案根目錄下有 `.gitignore` 文件，並且包含以下忽略不必要的檔案:
  - .github/：GitHub copilot 相關設定檔案，包含 workflow、issue templates、instructions 等
  - .vscode/：Visual Studio Code 編輯器設定檔案
  - .env/：環境變數設定檔案，包含 `.env.dev`、`.env.prod` 等
  - .DS_Store：macOS 系統自動產生的檔案
  - logs/：應用程式運行時產生的日誌檔案
  - coverage/：測試覆蓋率報告檔案
  - dist/：編譯後的輸出檔案，通常由 TypeScript 或其他編譯器產生
- 各開發語言忽略之不必要檔案：
  -TypeScript/JavaScript：
  ```
  node_modules/
  ```
  -Python：
  ```
  __pycache__/
  *.pyc
  .venv/
  ```

## Git Commit 訊息規範

- 撰寫 git commit 訊息時，除了檔案名稱、專有名詞、特殊技術用詞（如 `withHandler`、`ESLint`、`uuid` 等）以外，其餘內容一律使用**繁體中文**撰寫。
- commit 訊息格式請遵循 `.github/instructions/git-commit-message-style.instructions.md` 的 Conventional Commits 規格。

## Git 分支策略

| 分支 | 用途 |
|------|------|
| `master` | 正式環境（production）專用，**不直接開發或提交**，只接受來自 `Dante` 的 merge |
| `Dante` | 個人整合 branch，所有功能 branch 從此衍生，完成後 merge 回 `Dante`，穩定後再 merge 進 `master` |
| `Dante-<類型>-<描述>` | 功能開發 branch，從 `Dante` 衍生，完成後 merge 回 `Dante` |

### 功能 Branch 命名規則

格式：`Dante-<類型>-<簡短描述>`（全小寫、以連字號分隔）

| 類型 | 說明 | 範例 |
|------|------|------|
| `feat` | 新功能 | `Dante-feat-redis-health` |
| `fix` | 問題修正 | `Dante-fix-mongo-driver` |
| `refactor` | 重構優化 | `Dante-refactor-error-handling` |
| `test` | 測試相關 | `Dante-test-coverage` |
| `chore` | 雜務（版本升級、設定調整） | `Dante-chore-node-upgrade` |

> **注意**：因 `Dante` 已作為整合 branch 存在，Git 不允許同時存在 `Dante` 與 `Dante/<任何名稱>` 的分支，故改用 `-` 作為分隔符。

## Remote 管理與 Push 策略

### Remote 設定

本專案同時維護兩個 remote：

| Remote 名稱 | 用途 | 說明 |
|------------|------|------|
| `origin` | **GitLab**（內網） | 主要開發 remote，日常 push 目標 |
| `github` | **GitHub**（外網） | 備份與公開同步，由開發者手動 push |

> 確認目前 remote 設定請執行：`git remote -v`

### Push 策略

| 時機 | 動作 |
|------|------|
| 功能開發中 | `git push origin <feature-branch>`（只推 GitLab）|
| Feature branch 完成 merge 回 `Dante` | `git push origin Dante` |
| `Dante` 穩定，需同步備份 | `git push github Dante`（由開發者自行執行）|
| merge 進 `master` 後 | `git push origin master` + `git push github master` |

**規則**：
- Agent 負責推送到 `origin`（GitLab）
- `github` 的 push 由**開發者自行決定時機**手動執行，agent 不主動 push 到 `github`

---

## Git Pull Request 流程
- 所有功能開發完成後，請先將功能 branch merge 回 `Dante`，確保 `Dante` 分支保持穩定。
- 當 `Dante` 分支達到穩定狀態且準備好部署到正式環境時，請從 `Dante` 建立 Pull Request (PR) 到 `master` 分支，由專案負責人進行審核和合併。
- PR 審核過程中，請確保 PR 描述清晰，包含以下內容：
  - 功能說明：簡要描述此 PR 的功能和目的。
  - 相關 issue：如果有相關的 issue，請在 PR 描述中提及並連結。
  - 測試說明：說明已經進行的測試以及測試結果，確保功能正常運作。