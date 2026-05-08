# Agent Guidelines

This project follows the agent development guidelines outlined in the root [AGENTS.md](/AGENTS.md) file.

Please refer to the root `AGENTS.md` for all operational procedures, including Git practices, documentation structure, and HTML sample preprocessing.

# UI Architecture
The script uses an external HTML template and CSS for the number indicator to maintain a clean separation of concerns and adhere to the project's resource refactoring pattern.
- **Styles**: Defined in `gemini-search-snippet-helper.css`. Loaded via `GM_addStyle`.
- **Template**: Defined in `gemini-search-snippet-helper.html`. Injected using `window.geminiSetInnerHTML`.
- **Injection**: Securely injected using `window.geminiSetInnerHTML` and `window.geminiCreateTrustedHTMLPolicy`.

# Security
All dynamic HTML content is processed through a Trusted Types policy (`geminiSearchSnippet`) to ensure compatibility with Gemini's security requirements.

# SPA Navigation
The script utilizes the `window.navigation` API (where available) to detect client-side routing on the Search page and re-apply numbers to the results.


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の同期**:
   - バージョン番号はハードコードしないでください。
   - インストールボタンの構造は、動的なバージョン比較機能（Github上の最新バージョンとローカルのインストール済みバージョンの比較）のために、所定のDOM構造（`<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持してください。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
