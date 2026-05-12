# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, HTML sample preprocessing, and **shared technical knowledge base**.

## Mandatory Version Bumping

**Every single change** made to the userscript (`gemini-auto-scroll.user.js`), regardless of its size or scope, **MUST** be accompanied by a version bump in the script's metadata header. This ensures that users receive updates via their userscript manager's auto-update feature.

## Technical Specification for Gemini Auto-Scroll

### 1. Verification Logic
- **Install Check**: usage of `installCheckHosts` and `installCheckSuffixes` to dispatch `userscript-check-installed`.
  - This allows the landing page (`userscript.moukaeritai.work`) to detect if the script is active.

### 2. Auto-Scroll Logic & Robustness
- **Sidebar Visibility**: The script strictly checks `isSidebarVisible()` (checking `visibility` and `offsetWidth > 100`) before attempting to scroll. This prevents unnecessary background processing when the sidebar is collapsed.
- **Scroll Throttling**: Resets `scrollTop` to a high value every 500ms when enabled.
- **Critical Errors**: Subscribes to the shared `gemini-snackbar:shown` event from `gemini-common.js`, and disables auto-scroll only when the snackbar text indicates the known recent-chats loading failure.

### 3. UI Architecture
The script uses an external HTML template and CSS for the auto-scroll panel to maintain a clean separation of concerns and adhere to the project's resource refactoring pattern.

- **Styles**: Defined in `gemini-auto-scroll.css`. Loaded via `GM_addStyle`.
- **Template**: Defined in `gemini-auto-scroll.html`. Injected using `window.geminiSetInnerHTML`.
- **Placeholders**: Version and emoji are populated into `.gus-version` elements after injection.
- **Draggable Panel**: Utilizes `window.geminiSetupDraggablePanel` from `gemini-common.js` for mobility and state persistence.

### 4. Security
All HTML injection is performed through a Trusted Types policy (`geminiAutoScroll`) to ensure compatibility with Gemini's security requirements.


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期と状態検知**:
   - バージョン番号はハードコードしないでください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持してください。テキストの更新は `.button-text` などの専用要素を用いて行い、DOMを破壊しないように注意してください。
   - 新規タブでインストールした後にUIを自動更新するため、ボタンクリック時に `userscript-ping` を一定間隔で送信（ポーリング）する仕組みが `domain-landing.js` に組み込まれています。これにより利用者はリロード不要で「Installed」への変化を確認できます。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。

4. **インストールボタンの `href` は必ず GitHub Raw URL を使用すること（重要）**:
   - `index.html` 内の `.install-button` の `href` 属性には、**必ず**以下の形式の GitHub Raw URL を設定してください:
     ```
     https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/main/gemini.google.com/SCRIPT_NAME/SCRIPT_NAME.user.js
     ```
   - **ローカル相対パスを使用してはいけません**（例: `gemini-artifact-exporter/gemini-artifact-exporter.user.js`）。`domain-landing.js` の `fetchVersion()` はこの `href` を使って GitHub から `@version` を取得するため、ローカルパスでは CORS エラーが発生しバージョン取得に失敗します。
   - **ハードコードされたバージョン文字列をボタンテキストに含めてはいけません**（例: `Install (v0.4.57)`）。バージョン表示は `domain-landing.js` が GitHub から動的に取得して注入するため、ハードコードすると古いバージョンが表示され続けます。
   - **正しい構造例**:
     ```html
     <a class="install-button"
        data-script-name="Gemini Example Script"
        href="https://github.com/TakashiSasaki/userscript.moukaeritai.work/raw/refs/heads/main/gemini.google.com/gemini-example/gemini-example.user.js"
        target="_blank">
       <span>Install</span>
     </a>
     ```
