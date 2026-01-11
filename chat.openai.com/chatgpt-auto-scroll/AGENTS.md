# Instructions for AI Agents / AIエージェントへの指示

## Versioning / バージョン管理
- Always bump the `@version` in `chatgpt-auto-scroll.user.js` when making code changes (e.g., 1.0.0 -> 1.0.1).
- コードを変更した際は、必ず `@version` を更新してください。

## Metadata / メタデータ
- Use `userscript.moukaeritai.work` for `@namespace`.
- Maintain `@updateURL` and `@downloadURL` pointing to the raw file on GitHub.
- `@namespace` は `userscript.moukaeritai.work` とし、更新・ダウンロードURLはGitHubのrawリンクを維持してください。

## Commit Messages / コミットメッセージ
- Use Conventional Commits format.
- Explicitly mention UI or selector changes in the body.
- Conventional Commits形式を使用し、UIやセレクタの変更について具体的に言及してください。

## Install Detection API / インストール検知API
- Implement the install-detection guard for the portal index.
- Only inject this API on: `userscript.moukaeritai.work`, `127.0.0.1`, `fuzzy-halibut-qgr4qgggrh494p-5500.app.github.dev`.
- **Dispatch**: `userscript-check-installed` on page load.
- **Listener**: Listen for `userscript-ping` and reply.
- ポータルサイト向けのインストール検知機能を実装してください。指定ドメインでのみ有効化し、`userscript-check-installed` の発火と `userscript-ping` への応答を行ってください。

## SPA UI Persistence / SPAでのUI永続化
- Use `setInterval` instead of `setTimeout` to ensure UI elements persist across route changes or DOM updates.
- Check for the existence of the UI panel periodically and re-inject if missing.
- SPA（React等）のDOM再構築に対応するため、`setInterval` を使用してUI要素の存在を定期的に確認し、消えている場合は再生成してください。

## UI State Persistence / UI状態の永続化
- Use `GM_setValue` and `GM_getValue` to save and restore the UI panel's position (top/left).
- Ensure the panel stays in the user's preferred location across page reloads.
- UIパネルの位置（top/left）を保存・復元するために `GM_setValue` と `GM_getValue` を使用してください。ページリロード後もユーザーが配置した場所にパネルが表示されるようにしてください。