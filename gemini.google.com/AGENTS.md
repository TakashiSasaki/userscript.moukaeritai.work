# Gemini Userscripts Development Guidelines for Agents

- スクリプトのコードを少しでも変更したなら、必ずパッチレベルをバンプアップ（例: 0.1.1 -> 0.1.2）してください。
- バージョン情報を更新したら、関連する `index.html` 内の「Install」ボタンのバージョン表示も同期させてください。

## インストール状態の検知アルゴリズム
- `index.html` は `userscript-ping` を送信し、各ユーザースクリプトが `userscript-check-installed` を `dispatchEvent` して応答することで検知します。
- 受信側は `data-script-name` と `@name` の一致で対象ボタンを特定します。
- `Install (vX.Y.Z)` の表記からバージョンを抽出し、セマンティックバージョン比較で `Update` / `Installed` を切り替えます。
