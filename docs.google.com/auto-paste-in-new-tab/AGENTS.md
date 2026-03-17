# Auto Paste in New Tab 実装ノート

## 概要
Google Docs上で、新規タブを開き（Shift+F11）、少し遅延してからペースト（Ctrl+V）をエミュレートするスクリプト。
対象URLは `docs.google.com/document/*` に限定される。

## イベント発火
対象がGoogle Docsということもあり、信頼されないイベント（`isTrusted: false`）によるキーボードイベントのエミュレートが機能するかは環境依存の可能性がある。
現状の要件として、「Shift+F11」と「Ctrl+V」を `document.body` に対して `KeyboardEvent` でディスパッチする。

## UI要件
- ラベル: `Paste in new tab`
- フローティング表示で、ドラッグ＆ドロップにより移動可能。
- `GM_setValue` / `GM_getValue` を用いて位置を永続化。
- `userscript-check-installed` イベント等、インストール検知の共通ロジックを実装。

## イベントフロー
1. ユーザーが「Paste in new tab」ボタンをクリックする。
2. `EmulateDocsPaste` カスタムイベントが `document` で発火する。
3. イベントリスナーが発火を検知し、`Shift+F11` を `document.body` にディスパッチ。
4. 500msの `setTimeout` で待機。
5. `Ctrl+V` を `document.body` にディスパッチ。