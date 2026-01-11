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