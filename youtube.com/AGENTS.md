# YouTube Domain Agent Guidelines

This document outlines the domain-specific learnings and guidelines for developing user scripts targeting YouTube (youtube.com). These rules supplement the global guidelines in the root `AGENTS.md`.

## YouTube (SPA & Performance)

YouTube user script development learnings:

1.  **SPA Navigation & Cleanup**:
    -   **Early Cleanup**: On SPA sites like YouTube, rely on early navigation events like `yt-navigate-start` to stop observers and timers *before* page teardown begins. Waiting for `finish` events often causes browser hangs as observers process thousands of deletion mutations.
    -   **Idempotency**: Ensure cleanup functions are idempotent so they can be safely called multiple times (e.g., on start, on finish, on unload).

2.  **Observer Performance**:
    -   **Avoid Broad Monitoring**: Do NOT monitor `document.body` with `subtree: true` if massive DOM changes are expected.
    -   **Polling Alternatives**: For waiting on elements during transitions, lightweight polling (`setInterval`) is often safer and more performant than `MutationObserver`.

3.  **Strict Context Checking**:
    -   **URL Verification**: Always verify `window.location.pathname` or parameters at the start of your main logic to ensure UI elements don't bleed into unintended pages (e.g., playlist tools appearing on video watch pages).

4.  **Trusted Types Compliance (Security)**:
    -   **Avoid `innerHTML`**: Modern sites like YouTube enforce Trusted Types security policies that block assignment to `innerHTML`.
    -   **Use DOM Methods**: Always use `document.createElement()`, `textContent`, `setAttribute()`, and `appendChild()` to securely construct UI elements.


## `index.html` のメンテナンス要件

各階層（ルートディレクトリ、ドメイン別ディレクトリ、個別のスクリプトディレクトリ）の `index.html` は、最新の状態に同期して保つ必要があります。

1. **バージョン情報の動的取得 (Dynamic Versioning)**:
   - 各 `index.html` は `domain-landing.js` を読み込み、GitHub の Raw ファイル（`.user.js`）から最新の `@version` を動的に取得して表示します。このため、**HTML 内のバージョン番号を手動で書き換える必要はありません**。
   - **正本 (Source of Truth)**: 常に GitHub 上の公開リポジトリにある各 `.user.js` ファイルのメタデータ（`@version`）が最新バージョンの正本とみなされます。
   - インストールボタンの構造（`data-script-name` および `<div class="version-info">` 内に `.latest-version` と `.installed-version` を含む構造）を維持することで、自動更新・比較機能が動作します。
   - **エージェントへの指示**: コードを修正した際は、該当する `.user.js` ファイルの `@version` のみをバンプアップしてください。HTML ファイルの修正は不要です。

2. **依存関係とイベントの明記**:
   - 複数のユーザースクリプト間で連携する機能（CustomEventを用いたメッセージの送受信など）がある場合、スクリプトの紹介カードや詳細ページには、その依存関係（「送信先」「受信元」など）を明確に記載してください。

3. **ドキュメントの網羅性**:
   - 新しいスクリプト（システムローダーなどの裏側で動くスクリプトを含む）を追加した場合は、必ず該当するドメインの `index.html` およびルートの `index.html` の一覧にも漏れなく追加してください。
