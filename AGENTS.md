# Agent Operational Guidelines

このドキュメントは、このプロジェクトと対話するエージェント向けの推奨運用ガイドラインを概説しています。これらのガイドラインを遵守することで、一貫した動作、適切なバージョン管理の実施、および効率的なコラボレーションが保証されます。

## Git Commit Practices

-   **Detailed Commit Messages**: Always prefer detailed commit messages, focusing on the *why* of a change rather than just the *what*.
-   **`git commit -F` Usage**: Utilize `git commit -F` for committing changes, leveraging a temporary file for the commit message content.
-   **Temporary Commit Message File**: When committing, create a temporary file named `commit_message.txt` with the commit message content.
    -   **Location**: The `commit_message.txt` file must be created within the project's working directory.
    -   **Absolute Path**: Always use an absolute path when referencing `commit_message.txt` with `git commit -F`.
-   **Single File Per Commit**: When instructed to commit a file, include only that specific file in the commit, even if other changes are staged or untracked.
-   **English Commit Messages**: All Git commit messages should be written in English.
-   **Manual Pushing**: The user prefers to push changes manually; agents should *never* push changes to a remote repository automatically.

## Common Development Standards (共通開発基準)

以下の基準は、このリポジトリで開発されるすべてのユーザースクリプトに適用されます。

### Metadata & Versioning (メタデータとバージョニング)
すべての `.user.js` ファイルは以下のメタデータを含む必要があります。

-   **@namespace**: `userscript.moukaeritai.work`
-   **@author**: `Takashi Sasaki`
-   **@homepageURL**: `https://x.com/TakashiSasaki`
-   **Published at**: `https://userscript.moukaeritai.work` (README等のドキュメントに記載)
-   **@version**: `major.minor.patch` (セマンティックバージョニング形式)
    -   **Strict Rule**: JavaScript（`.user.js`）のコードを1行でも変更した場合は、必ずパッチバージョンをインクリメント（バンプアップ）してください。
    -   機能追加やバグ修正ごとにパッチバージョンをインクリメントしてください。
-   **@updateURL** / **@downloadURL**:
    -   GitHubのRawファイルURLを指定し、Tampermonkey等のマネージャーが更新を自動検出できるようにします。
    -   Format: `https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/userscript.moukaeritai.work/DOMAIN_NAME/SCRIPT_NAME/SCRIPT_NAME.user.js`
    -   **注意**: デフォルトブランチ名は `userscript.moukaeritai.work` です。

### Documentation Layers (ドキュメントの3層構造)
ドキュメントの肥大化を防ぎ、人間とAIの双方に最適な情報を提供するため、以下の3層構造を維持してください。

1.  **`index.html` (ビューア)**: プレミアムデザインテンプレートを使用したドキュメント閲覧用ページ。
2.  **`{project-name}.md` (人間用)**: ユーザー向けの概要、目的、機能説明。実装の詳細は含めない。
3.  **`AGENTS.md` (AI用)**: エージェント向けの実装ノート。セレクタリスト、設計戦略、運用ルール等を記述。

### HTML Sample Preprocessing (サンプルHTMLの前処理)
DOM解析用のサンプルHTML (`samples/` ディレクトリ) は、開発効率とファイルサイズ削減のため、必ず以下の前処理を行ってください。

1.  **Truncate Text**: 長いテキストノードは1000文字程度に切り詰める。
2.  **Remove Elements**: `<script>`, `<style>` タグおよびHTMLコメントは削除する。
3.  **Remove Attributes**: 空の属性 (`style=""` など) や不要なイベントハンドラは削除する。
4.  **Automation**: 各 `samples/` ディレクトリに `preprocess_samples.py` を配置し、これを実行して処理を行うこと。

### JavaScript Quality & Linting (JSの品質とリンティング)
JavaScript（`.user.js`）のコードを変更した後は、必ずESLintを実行して文法エラーや潜在的なバグがないか確認してください。

-   **Command**: `npx eslint path/to/script.user.js`
-   **Requirement**: コミット前にすべてのエラーを解消し、警告も可能な限り修正してください。
-   **Reminder**: 変更が小さくてもESLintの実行を省略しないこと。

## Repository Information (リポジトリ情報)

-   **Remote URL**: `https://github.com/TakashiSasaki/userscript.moukaeritai.work`
-   **Default Branch**: `userscript.moukaeritai.work`
-   **Namespace**: `userscript.moukaeritai.work`

## Project Structure & Development Workflow (プロジェクト構造と開発フロー)

階層構造: `DOMAIN_NAME/SCRIPT_NAME/`

```
repo_root/
  ├── index.html                  # Main project list (Landing page)
  ├── AGENTS.md                   # Global agent guidelines (This file)
  ├── DOMAIN_NAME/                # e.g., gemini.google.com
  │   ├── AGENTS.md               # Directory-level agent instructions
  │   └── SCRIPT_NAME/            # e.g., gemini-profile-badge
  │       ├── SCRIPT_NAME.user.js # Userscript source
  │       ├── SCRIPT_NAME.md      # Specification (Human-readable)
  │       ├── AGENTS.md           # Implementation details (Agent-readable)
  │       ├── index.html          # Documentation viewer
  │       └── samples/            # DOM snapshots
```

### Development Workflow
1.  **Capture Samples**: DOMスナップショットを取得し `samples/` へ保存。
2.  **Preprocess**: `preprocess_samples.py` でHTMLを軽量化。
3.  **Specify**: `SCRIPT_NAME.md` にユーザー向け仕様を記述。
4.  **Note**: `AGENTS.md` にエージェント向け技術詳細（セレクタ等）を記述。
5.  **Implement**: `.user.js` 実装。
6.  **Lint**: `npx eslint` でチェック。
7.  **Document**: プレミアムデザインの `index.html` を作成。
8.  **Register**: ルート `index.html` にプロジェクト追加。

## Index Maintenance (インデックスの維持)

新しいプロジェクトを追加する際は、ルートおよび各ディレクトリの `index.html` を更新してください。
-   **Consistency**: `onamae.com/index.html` 等、サブディレクトリにもインデックスを配置し、回遊性を高める。
-   **Card Design**:
    -   **Title**: サイトのFavicon (Google S2 API) + プロジェクト名（ドキュメントへのリンク）。
    -   **Positioning**: **インストールボタンはカードの右下(bottom-right)に配置**してください。
-   **Version Updates**: ユーザースクリプトのバージョンを上げた際は、必ず `index.html` 内のそのスクリプトの `Install` ボタンのテキスト（例: `Install (vX.Y.Z)`）も最新のバージョン番号に更新してください。


## UserScript Best Practices (SPA & Performance)

Recent learnings from YouTube userscript development:

### 1. SPA Navigation & Cleanup
-   **Early Cleanup**: On SPA sites (like YouTube), rely on early navigation events (e.g., `yt-navigate-start`) to stop observers and timers *before* the page teardown begins. Waiting for "finish" events often causes browser hangs due to observers processing thousands of deletion mutations.
-   **Idempotency**: Ensure cleanup functions are idempotent so they can be safely called multiple times (e.g., on start, on finish, on unload).

### 2. Observer Performance
-   **Avoid Broad Observation**: Never observe `document.body` with `subtree: true` if you expect massive DOM changes.
-   **Polling Alternative**: For waiting on elements during transitions, lightweight polling (`setInterval`) is often safer and more performant than `MutationObserver`.

### 3. Strict Context Checking
-   **URL Verification**: Always verify `window.location.pathname` or parameters at the start of your main logic to ensure the script doesn't leak UI elements into unintended pages (e.g., showing playlist tools on a video watch page).

### 4. Trusted Types Compliance (Security)
-   **Avoid `innerHTML`**: Modern sites (like YouTube) enforce Trusted Types security policies that block assignments to `innerHTML`.
-   **Use DOM Methods**: Always use `document.createElement()`, `textContent`, `setAttribute()`, and `appendChild()` to build UI elements safely.

## ユーザー固有の好み (User-Specific Preferences)

-   **User Name**: Takashi Sasaki
-   **Email**: takashi316@gmail.com
